// D1 batches are atomic; never emulate an interactive transaction with callbacks.
import { getD1Binding } from '@/core/db/d1';
import type { GameJob } from '@/config/db/schema';
import type { GameOutput, GenerationInput } from '@/lib/games/types';
import { getUuid } from '@/lib/hash';

const active = "status IN ('pending','generating','validating','repairing')";
const eligible =
  "user_id=? AND transaction_type='grant' AND status='active' AND remaining_credits>=1 AND (expires_at IS NULL OR expires_at>?)";
const fifo = 'ORDER BY expires_at IS NULL, expires_at, created_at, id LIMIT 1';
function jobRow(row: any): GameJob | null {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    idempotencyKey: row.idempotency_key,
    activeUserId: row.active_user_id,
    status: row.status,
    input: row.input,
    consumeCreditId: row.consume_credit_id,
    error: row.error,
    leaseToken: row.lease_token,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    startedAt: row.started_at === null ? null : new Date(row.started_at),
    deadlineAt: row.deadline_at === null ? null : new Date(row.deadline_at),
  };
}
export async function lookupD1GameJob(userId: string, key: string) {
  return jobRow(
    await getD1Binding()
      .prepare('SELECT * FROM game_job WHERE user_id=? AND idempotency_key=?')
      .bind(userId, key)
      .first()
  );
}
export async function enqueueD1Game(userId: string, input: GenerationInput) {
  const binding = getD1Binding();
  const existing = await lookupD1GameJob(userId, input.idempotencyKey);
  if (existing) return existing;
  const id = getUuid(),
    debitId = getUuid(),
    now = Date.now();
  try {
    await binding.batch([
      binding
        .prepare(
          `INSERT INTO game_job
        (id,user_id,idempotency_key,active_user_id,status,input,consume_credit_id,created_at,updated_at,deadline_at)
        SELECT ?,?,?,?,'pending',?,?,?,?,? WHERE EXISTS(SELECT 1 FROM credit WHERE ${eligible})`
        )
        .bind(
          id,
          userId,
          input.idempotencyKey,
          userId,
          JSON.stringify(input),
          debitId,
          now,
          now,
          now + 180000,
          userId,
          now
        ),
      binding
        .prepare(
          `INSERT INTO credit
        (id,user_id,transaction_no,transaction_type,transaction_scene,credits,remaining_credits,status,description,consumed_detail,metadata,created_at,updated_at)
        SELECT ?,?,?,'consume','game_generation',-1,0,'active','Original 2D game generation',
          json_array(json_object('creditId',id,'transactionNo',transaction_no,'creditsConsumed',1,'creditsBefore',remaining_credits,'creditsAfter',remaining_credits-1)),
          json_object('jobId',?),?,? FROM credit WHERE ${eligible}
          AND EXISTS(SELECT 1 FROM game_job WHERE id=? AND consume_credit_id=?) ${fifo}`
        )
        .bind(debitId, userId, debitId, id, now, now, userId, now, id, debitId),
      binding
        .prepare(
          `UPDATE credit SET remaining_credits=remaining_credits-1,updated_at=?
        WHERE id=(SELECT json_extract(consumed_detail,'$[0].creditId') FROM credit WHERE id=?)
        AND EXISTS(SELECT 1 FROM game_job WHERE id=? AND consume_credit_id=?)`
        )
        .bind(now, debitId, id, debitId),
    ]);
  } catch (error) {
    const same = await lookupD1GameJob(userId, input.idempotencyKey);
    if (same) return same;
    const current = await binding
      .prepare('SELECT id FROM game_job WHERE active_user_id=?')
      .bind(userId)
      .first();
    if (current)
      throw new Error('A game is already generating. Wait for it to finish.');
    throw error;
  }
  const created = await lookupD1GameJob(userId, input.idempotencyKey);
  if (!created)
    throw new Error('You need a generation credit to create a game.');
  return created;
}

export async function claimD1GameJob(id: string) {
  const now = Date.now(),
    token = getUuid();
  const row = await getD1Binding()
    .prepare(
      `UPDATE game_job SET status='generating',lease_token=?,started_at=?,updated_at=?
    WHERE id=? AND status='pending' AND deadline_at>? RETURNING *`
    )
    .bind(token, now, now, id, now)
    .first();
  return jobRow(row);
}

export async function completeD1GameJob(
  id: string,
  token: string,
  output: GameOutput,
  thumbnail: string
) {
  const binding = getD1Binding(),
    now = Date.now();
  await binding.batch([
    binding
      .prepare(
        `INSERT INTO game (id,job_id,user_id,title,summary,controls,code,input,version,thumbnail,created_at)
      SELECT id,id,user_id,?,?,?,?,input,1,?,? FROM game_job WHERE id=? AND lease_token=? AND ${active} AND deadline_at>?`
      )
      .bind(
        output.title,
        output.summary,
        output.controls,
        output.code,
        thumbnail,
        now,
        id,
        token,
        now
      ),
    binding
      .prepare(
        `UPDATE game_job SET status='success',active_user_id=NULL,error=NULL,updated_at=?
      WHERE id=? AND lease_token=? AND ${active} AND deadline_at>?
      AND EXISTS(SELECT 1 FROM game WHERE job_id=?)`
      )
      .bind(now, id, token, now, id),
  ]);
}

export async function failD1GameJob(
  id: string,
  message: string,
  token?: string
) {
  const binding = getD1Binding(),
    now = Date.now();
  const guard = `id=? AND ${active}${token ? ' AND lease_token=?' : ''}`;
  const args = token ? [id, token] : [id];
  await binding.batch([
    binding
      .prepare(
        `UPDATE credit AS grant_row SET remaining_credits=remaining_credits+(
      SELECT SUM(json_extract(item.value,'$.creditsConsumed')) FROM credit AS spent,json_each(spent.consumed_detail) AS item
      WHERE spent.id=(SELECT consume_credit_id FROM game_job WHERE ${guard})
        AND spent.status='active' AND json_extract(item.value,'$.creditId')=grant_row.id
      ),updated_at=? WHERE id IN (
      SELECT json_extract(item.value,'$.creditId') FROM credit AS spent,json_each(spent.consumed_detail) AS item
      WHERE spent.id=(SELECT consume_credit_id FROM game_job WHERE ${guard}) AND spent.status='active')`
      )
      .bind(...args, now, ...args),
    binding
      .prepare(
        `UPDATE credit SET status='deleted',updated_at=?
      WHERE id=(SELECT consume_credit_id FROM game_job WHERE ${guard}) AND transaction_type='consume' AND status='active'`
      )
      .bind(now, ...args),
    binding
      .prepare(
        `UPDATE game_job SET status='failed',active_user_id=NULL,error=?,updated_at=? WHERE ${guard}`
      )
      .bind(message.slice(0, 250), now, ...args),
  ]);
}

export async function expireD1GameJobs() {
  const expired = await getD1Binding()
    .prepare(
      `SELECT id FROM game_job WHERE ${active} AND deadline_at<=? LIMIT 100`
    )
    .bind(Date.now())
    .all();
  for (const row of expired.results || [])
    await failD1GameJob(
      row.id,
      'Generation timed out. Your credit was returned.'
    );
  return (expired.results || []).length;
}
export async function pendingD1GameJobs() {
  const rows = await getD1Binding()
    .prepare(
      "SELECT id FROM game_job WHERE status='pending' AND deadline_at>? ORDER BY created_at LIMIT 50"
    )
    .bind(Date.now())
    .all();
  return (rows.results || []).map((row: any) => row.id as string);
}
