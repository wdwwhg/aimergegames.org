// AI task orchestration owns credit operations, as in ai-tasks/service.ts.
import { and, asc, eq, inArray, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { game, gameJob } from '@/config/db/schema';
import { consume, revoke } from '@/modules/credits/service';
import {
  ACTIVE_STATUSES,
  type GameOutput,
  type GenerationInput,
} from '@/lib/games/types';
import { getUuid } from '@/lib/hash';

async function lookup(userId: string, key: string) {
  const [job] = await db()
    .select()
    .from(gameJob)
    .where(and(eq(gameJob.userId, userId), eq(gameJob.idempotencyKey, key)))
    .limit(1);
  return job;
}
export async function enqueueGame(userId: string, input: GenerationInput) {
  const existing = await lookup(userId, input.idempotencyKey);
  if (existing) return existing;
  try {
    return await db().transaction(async (tx: any) => {
      const [same] = await tx
        .select()
        .from(gameJob)
        .where(
          and(
            eq(gameJob.userId, userId),
            eq(gameJob.idempotencyKey, input.idempotencyKey)
          )
        )
        .limit(1);
      if (same) return same;
      const [job] = await tx
        .insert(gameJob)
        .values({
          id: getUuid(),
          userId,
          activeUserId: userId,
          idempotencyKey: input.idempotencyKey,
          input: JSON.stringify(input),
          status: 'pending',
          deadlineAt: new Date(Date.now() + 180_000),
        })
        .returning();
      const spent = await consume({
        userId,
        credits: 1,
        scene: 'game_generation',
        description: 'Original 2D game generation',
        metadata: JSON.stringify({ jobId: job.id }),
        tx,
      });
      if (!spent.success)
        throw new Error('You need a generation credit to create a game.');
      const [updated] = await tx
        .update(gameJob)
        .set({ consumeCreditId: spent.consumedCredit.id })
        .where(eq(gameJob.id, job.id))
        .returning();
      return updated;
    });
  } catch (error) {
    const same = await lookup(userId, input.idempotencyKey);
    if (same) return same;
    const [active] = await db()
      .select()
      .from(gameJob)
      .where(eq(gameJob.activeUserId, userId))
      .limit(1);
    if (active)
      throw new Error('A game is already generating. Wait for it to finish.');
    throw error;
  }
}
export async function getGameJob(userId: string, id: string) {
  const [job] = await db()
    .select()
    .from(gameJob)
    .where(and(eq(gameJob.id, id), eq(gameJob.userId, userId)))
    .limit(1);
  return job
    ? {
        id: job.id,
        status: job.status,
        error: job.error,
        createdAt: job.createdAt,
      }
    : null;
}
export async function claimGameJob() {
  const [next] = await db()
    .select()
    .from(gameJob)
    .where(eq(gameJob.status, 'pending'))
    .orderBy(asc(gameJob.createdAt))
    .limit(1);
  if (!next) return null;
  const now = new Date();
  const [claimed] = await db()
    .update(gameJob)
    .set({
      status: 'generating',
      leaseToken: getUuid(),
      startedAt: now,
      updatedAt: now,
    })
    .where(and(eq(gameJob.id, next.id), eq(gameJob.status, 'pending')))
    .returning();
  return claimed || null;
}
export async function setGamePhase(
  id: string,
  token: string,
  status: 'validating' | 'repairing'
) {
  await db()
    .update(gameJob)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(gameJob.id, id),
        eq(gameJob.leaseToken, token),
        inArray(gameJob.status, [...ACTIVE_STATUSES])
      )
    );
}
export async function completeGameJob(
  id: string,
  token: string,
  result: GameOutput,
  thumbnail: string
) {
  return db().transaction(async (tx: any) => {
    const [job] = await tx
      .update(gameJob)
      .set({ status: 'success', activeUserId: null, updatedAt: new Date() })
      .where(
        and(
          eq(gameJob.id, id),
          eq(gameJob.leaseToken, token),
          inArray(gameJob.status, [...ACTIVE_STATUSES])
        )
      )
      .returning();
    if (!job) return;
    await tx
      .insert(game)
      .values({
        id: job.id,
        jobId: job.id,
        userId: job.userId,
        title: result.title,
        summary: result.summary,
        controls: result.controls,
        code: result.code,
        input: job.input,
        version: 1,
        thumbnail,
      });
  });
}
export async function failGameJob(id: string, message: string, token?: string) {
  return db().transaction(async (tx: any) => {
    const [job] = await tx
      .update(gameJob)
      .set({
        status: 'failed',
        activeUserId: null,
        error: message.slice(0, 250),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gameJob.id, id),
          inArray(gameJob.status, [...ACTIVE_STATUSES]),
          token ? eq(gameJob.leaseToken, token) : undefined
        )
      )
      .returning();
    if (job?.consumeCreditId) await revoke(job.consumeCreditId, tx);
  });
}
export async function expireGameJobs() {
  const stale = await db()
    .select()
    .from(gameJob)
    .where(
      and(
        inArray(gameJob.status, [...ACTIVE_STATUSES]),
        lt(gameJob.deadlineAt, new Date())
      )
    );
  for (const job of stale)
    await failGameJob(
      job.id,
      'Generation timed out. Your credit was returned.'
    );
  // A stopped worker must not leave a charged queue item pending forever.
  const abandoned = await db()
    .select()
    .from(gameJob)
    .where(
      and(
        eq(gameJob.status, 'pending'),
        lt(gameJob.createdAt, new Date(Date.now() - 600_000))
      )
    );
  for (const job of abandoned)
    await failGameJob(
      job.id,
      'The generation worker was unavailable. Your credit was returned.'
    );
}
