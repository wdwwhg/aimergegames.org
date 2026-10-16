import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mock } from 'node:test';
import { getPlatformProxy } from 'wrangler';

process.env.DATABASE_PROVIDER = 'd1';
process.env.CONFIG_ENCRYPTION_KEY = 'local-game-D1-fixture-only';
const proxy = await getPlatformProxy({
  persist: { path: '.test-data/d1-' + randomUUID() },
});
const binding = proxy.env.DB;
const sent = [];
const env = {
  ...proxy.env,
  GAME_TASK_QUEUE: {
    send: async (body) => {
      sent.push(body.jobId);
    },
  },
};
globalThis[Symbol.for('__cloudflare-context__')] = { env, ctx: proxy.ctx };
const migration = readFileSync(
  'cloudflare/migrations/0000_empty_adam_warlock.sql',
  'utf8'
)
  .split('--> statement-breakpoint')
  .filter((s) => s.trim());
await binding.batch(migration.map((sql) => binding.prepare(sql)));
const d1 = await import('../src/modules/ai-tasks/game-d1.ts');
const service = await import('../src/modules/ai-tasks/game-service.ts');
const { processCloudGameJob, recoverCloudGameJobs } =
  await import('../cloudflare/process-game.ts');
const { exampleGames } = await import('../src/lib/games/examples.ts');
const { saveConfigs } = await import('../src/modules/config/service.ts');
const input = () => ({
  gameA: 'Minecraft',
  gameB: 'Elden Ring',
  genre: 'action',
  description: 'Explore',
  idempotencyKey: randomUUID(),
});
const one = (sql, ...args) =>
  binding
    .prepare(sql)
    .bind(...args)
    .first();
const run = (sql, ...args) =>
  binding
    .prepare(sql)
    .bind(...args)
    .run();
const balance = async (id) =>
  (
    await one(
      "SELECT COALESCE(SUM(remaining_credits),0) AS value FROM credit WHERE user_id=? AND transaction_type='grant' AND status='active' AND (expires_at IS NULL OR expires_at>?)",
      id,
      Date.now()
    )
  ).value;
async function user(amount = 2) {
  const id = randomUUID(),
    grant = randomUUID();
  await run(
    'INSERT INTO user(id,name,email,created_at,updated_at) VALUES(?,?,?, ?,?)',
    id,
    'Queue fixture',
    id + '@example.test',
    Date.now(),
    Date.now()
  );
  if (amount)
    await run(
      "INSERT INTO credit(id,user_id,transaction_no,transaction_type,credits,remaining_credits,status) VALUES(?,?,?,'grant',?,?,'active')",
      grant,
      id,
      grant,
      amount,
      amount
    );
  return { id, grant };
}
try {
  const empty = await user(0);
  await assert.rejects(
    d1.enqueueD1Game(empty.id, input()),
    /generation credit/
  );
  assert.equal(
    (
      await one(
        'SELECT COUNT(*) AS count FROM game_job WHERE user_id=?',
        empty.id
      )
    ).count,
    0
  );
  console.log('D1: insufficient funds cannot create or charge a job');

  const owner = await user(),
    request = input();
  const jobs = await Promise.all([
    d1.enqueueD1Game(owner.id, request),
    d1.enqueueD1Game(owner.id, request),
  ]);
  assert.equal(jobs[0].id, jobs[1].id);
  assert.equal(await balance(owner.id), 1);
  await assert.rejects(
    d1.enqueueD1Game(owner.id, input()),
    /already generating/
  );
  assert.equal(
    (
      await one(
        "SELECT COUNT(*) AS count FROM credit WHERE user_id=? AND transaction_type='consume'",
        owner.id
      )
    ).count,
    1
  );
  await d1.failD1GameJob(jobs[0].id, 'wrong token', 'not-the-lease');
  assert.equal(await balance(owner.id), 1);
  await Promise.all([
    d1.failD1GameJob(jobs[0].id, 'failure'),
    d1.failD1GameJob(jobs[0].id, 'repeat'),
  ]);
  assert.equal(await balance(owner.id), 2);
  console.log(
    'D1: duplicate submission, concurrent debit and repeated refund are safe'
  );

  const concurrentOwner = await user();
  const competing = await Promise.allSettled([
    d1.enqueueD1Game(concurrentOwner.id, input()),
    d1.enqueueD1Game(concurrentOwner.id, input()),
  ]);
  assert.equal(competing.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(await balance(concurrentOwner.id), 1);
  const activeJob = competing.find((x) => x.status === 'fulfilled').value;
  await d1.failD1GameJob(activeJob.id, 'fixture cleanup');

  const rollback = await user();
  const originalDB = env.DB;
  env.DB = {
    ...originalDB,
    prepare: originalDB.prepare.bind(originalDB),
    batch: (statements) =>
      originalDB.batch([
        ...statements,
        originalDB
          .prepare('INSERT INTO credit SELECT * FROM credit WHERE id=?')
          .bind(rollback.grant),
      ]),
  };
  await assert.rejects(d1.enqueueD1Game(rollback.id, input()));
  env.DB = originalDB;
  assert.equal(await balance(rollback.id), 2);
  assert.equal(
    (
      await one(
        'SELECT COUNT(*) AS count FROM game_job WHERE user_id=?',
        rollback.id
      )
    ).count,
    0
  );
  console.log(
    'D1: a failed batch rolls back both job creation and credit changes'
  );

  const fifoOwner = await user(1),
    soon = randomUUID(),
    expired = randomUUID();
  for (const [id, expiry] of [
    [soon, Date.now() + 60000],
    [expired, Date.now() - 1],
  ])
    await run(
      "INSERT INTO credit(id,user_id,transaction_no,transaction_type,credits,remaining_credits,status,expires_at) VALUES(?,?,?,'grant',1,1,'active',?)",
      id,
      fifoOwner.id,
      id,
      expiry
    );
  const fifoJob = await d1.enqueueD1Game(fifoOwner.id, input());
  const spent = await one(
    'SELECT consumed_detail FROM credit WHERE id=?',
    fifoJob.consumeCreditId
  );
  assert.equal(JSON.parse(spent.consumed_detail)[0].creditId, soon);
  assert.equal(
    (await one('SELECT remaining_credits FROM credit WHERE id=?', expired))
      .remaining_credits,
    1
  );
  await d1.failD1GameJob(fifoJob.id, 'fixture cleanup');
  assert.equal(await balance(fifoOwner.id), 2);
  console.log(
    'D1: soonest-expiring credits are consumed first; expired credits are excluded'
  );

  const success = await d1.enqueueD1Game(owner.id, input());
  const claims = await Promise.all([
    d1.claimD1GameJob(success.id),
    d1.claimD1GameJob(success.id),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  const lease = claims.find(Boolean).leaseToken;
  const thumb = 'data:image/png;base64,aGVsbG8=';
  await d1.completeD1GameJob(success.id, 'wrong', exampleGames[0], thumb);
  assert.equal(
    await one('SELECT id FROM game WHERE job_id=?', success.id),
    null
  );
  await d1.completeD1GameJob(success.id, lease, exampleGames[0], thumb);
  await d1.completeD1GameJob(success.id, lease, exampleGames[0], thumb);
  await d1.failD1GameJob(success.id, 'late failure', lease);
  assert.equal(
    (await one('SELECT status FROM game_job WHERE id=?', success.id)).status,
    'success'
  );
  assert.equal(
    (await one('SELECT COUNT(*) AS count FROM game WHERE job_id=?', success.id))
      .count,
    1
  );
  assert.equal(await balance(owner.id), 1);
  assert.equal(await service.getGameJob(empty.id, success.id), null);
  console.log(
    'D1: single lease, private ownership and atomic successful save verified'
  );

  const timeout = await d1.enqueueD1Game(owner.id, input());
  const claimed = await d1.claimD1GameJob(timeout.id);
  await run(
    'UPDATE game_job SET deadline_at=? WHERE id=?',
    Date.now() - 1,
    timeout.id
  );
  await d1.completeD1GameJob(
    timeout.id,
    claimed.leaseToken,
    exampleGames[0],
    thumb
  );
  assert.equal(
    await one('SELECT id FROM game WHERE job_id=?', timeout.id),
    null
  );
  await Promise.all([d1.expireD1GameJobs(), d1.expireD1GameJobs()]);
  assert.equal(await balance(owner.id), 1);
  assert.equal(
    (await one('SELECT status FROM game_job WHERE id=?', timeout.id)).status,
    'failed'
  );
  console.log('D1: timeout restores one credit and prevents late success');

  const queueFailureOwner = await user(1);
  env.GAME_TASK_QUEUE = {
    send: async () => {
      throw Error('queue down');
    },
  };
  await assert.rejects(
    service.enqueueGame(queueFailureOwner.id, input()),
    /queue was unavailable/
  );
  assert.equal(await balance(queueFailureOwner.id), 1);
  env.GAME_TASK_QUEUE = {
    send: async (body) => {
      sent.push(body.jobId);
    },
  };
  const validatorMissingOwner = await user(1);
  const validatorMissingJob = await service.enqueueGame(
    validatorMissingOwner.id,
    input()
  );
  assert.ok(sent.includes(validatorMissingJob.id));
  assert.equal(
    (await processCloudGameJob(validatorMissingJob.id)).status,
    'failed-and-refunded'
  );
  assert.equal(await balance(validatorMissingOwner.id), 1);
  assert.equal(
    (await processCloudGameJob(validatorMissingJob.id)).status,
    'already-claimed-or-expired'
  );
  console.log(
    'Queue: delivery failure or a missing validator refunds without model execution'
  );

  await saveConfigs({
    openai_api_key: 'fixture-not-a-real-key',
    openai_base_url: 'https://api.deepseek.com',
    openai_model: 'deepseek-flash',
  });
  let modelCalls = 0,
    checks = 0;
  mock.method(globalThis, 'fetch', async () => {
    modelCalls++;
    return Response.json({
      choices: [
        {
          finish_reason: 'stop',
          message: { content: JSON.stringify(exampleGames[0]) },
        },
      ],
    });
  });
  env.GAME_VALIDATOR = {
    fetch: async () =>
      ++checks === 1
        ? Response.json({ ok: false })
        : Response.json({ ok: true, thumbnail: thumb }),
  };
  const pipelineOwner = await user(1),
    pipelineJob = await service.enqueueGame(pipelineOwner.id, input());
  assert.equal((await processCloudGameJob(pipelineJob.id)).status, 'processed');
  assert.equal(modelCalls, 2);
  assert.equal(checks, 2);
  assert.equal(
    (await one('SELECT status FROM game_job WHERE id=?', pipelineJob.id))
      .status,
    'success'
  );
  assert.equal(await balance(pipelineOwner.id), 0);
  assert.equal(
    (
      await one(
        'SELECT COUNT(*) AS count FROM game WHERE job_id=?',
        pipelineJob.id
      )
    ).count,
    1
  );
  mock.restoreAll();
  delete env.GAME_VALIDATOR;
  console.log(
    'Queue: fixed-response model, one automatic repair, validation and private save passed'
  );

  const orphanOwner = await user(1),
    orphan = await d1.enqueueD1Game(orphanOwner.id, input());
  const before = sent.length;
  await recoverCloudGameJobs();
  assert.ok(sent.slice(before).includes(orphan.id));
  await run(
    'UPDATE game_job SET deadline_at=? WHERE id=?',
    Date.now() - 1,
    orphan.id
  );
  await recoverCloudGameJobs();
  assert.equal(
    (await one('SELECT status FROM game_job WHERE id=?', orphan.id)).status,
    'failed'
  );
  assert.equal(await balance(orphanOwner.id), 1);
  console.log(
    'Cron: committed but undelivered jobs are requeued; expired jobs refund'
  );

  const { default: consumer } = await import('../cloudflare/task-worker.mjs');
  assert.equal(consumer.fetch().status, 404);
  let acknowledged = 0,
    retried = 0,
    processed = 0;
  const message = (body) => ({
    body,
    ack: () => acknowledged++,
    retry: () => retried++,
  });
  await consumer.queue(
    {
      messages: [
        message({ jobId: 'invalid' }),
        message({ jobId: randomUUID() }),
      ],
    },
    {
      GAME_PROCESSOR: {
        process: async () => {
          processed++;
        },
      },
    }
  );
  assert.equal(acknowledged, 2);
  assert.equal(processed, 1);
  await consumer.queue(
    { messages: [message({ jobId: randomUUID() })] },
    {
      GAME_PROCESSOR: {
        process: async () => {
          throw Error('transport failure');
        },
      },
    }
  );
  assert.equal(retried, 1);
  let scheduled;
  consumer.scheduled(
    {},
    { GAME_PROCESSOR: { recover: async () => true } },
    { waitUntil: (p) => (scheduled = p) }
  );
  assert.equal(await scheduled, true);
  console.log(
    'Consumer: malformed messages, ack/retry, cron and private-only HTTP behavior passed'
  );
  console.log(
    'All local D1 task integration checks passed. No remote database or real model was used.'
  );
} finally {
  mock.restoreAll();
  await proxy.dispose();
}
