import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { before, test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { runGamePipeline } from '../src/core/ai/game-pipeline';
import {
  generationAvailable,
  purchasesAvailable,
} from '../src/lib/games/availability';
import { exampleGames } from '../src/lib/games/examples';
import { generationInput } from '../src/lib/games/types';

mkdirSync('.test-data', { recursive: true });
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = 'file:.test-data/games-' + randomUUID() + '.db';
process.env.AUTH_SECRET = 'local-test-only-secret-please-do-not-deploy';
let db: any, schema: any, tasks: any, credits: any, games: any, eq: any;
before(async () => {
  execFileSync(
    process.execPath,
    [
      'node_modules/drizzle-kit/bin.cjs',
      'push',
      '--force',
      '--config=drizzle.config.ts',
    ],
    { env: process.env, stdio: 'pipe' }
  );
  ({ db } = await import('../src/core/db'));
  schema = await import('../src/config/db/schema');
  tasks = await import('../src/modules/ai-tasks/game-service');
  credits = await import('../src/modules/credits/service');
  games = await import('../src/modules/games/service');
  ({ eq } = await import('drizzle-orm'));
});
async function person(balance = 0) {
  const id = randomUUID();
  await db()
    .insert(schema.user)
    .values({ id, name: 'Local test', email: id + '@example.test' });
  if (balance) await credits.grant({ userId: id, credits: balance });
  return id;
}
function input() {
  return {
    gameA: 'Minecraft',
    gameB: 'Elden Ring',
    genre: 'action' as const,
    description: 'Explore and collect',
    idempotencyKey: randomUUID(),
  };
}
const thumb = 'data:image/png;base64,aGVsbG8=';
test('launch gates stay closed unless credentials and verification are present', () => {
  assert.equal(generationAvailable({}), false);
  assert.equal(generationAvailable({ game_generation_enabled: 'true' }), false);
  const c = {
    game_generation_enabled: 'true',
    game_generation_verified: 'true',
    openai_api_key: 'fixture',
    openai_model: 'fixture',
    openai_base_url: 'https://example.test/v1',
  };
  assert.equal(generationAvailable(c), true);
  assert.equal(purchasesAvailable(c), false);
  process.env.DATABASE_PROVIDER = 'd1';
  try {
    assert.equal(generationAvailable(c), false);
    assert.equal(
      purchasesAvailable({
        ...c,
        game_purchases_enabled: 'true',
        game_payments_verified: 'true',
      }),
      false
    );
  } finally {
    process.env.DATABASE_PROVIDER = 'sqlite';
  }
});
test('validates names and prevents the same inspiration twice', () => {
  assert.equal(
    generationInput.safeParse({ ...input(), gameB: ' minecraft ' }).success,
    false
  );
  assert.equal(generationInput.safeParse(input()).success, true);
});
test('each handcrafted example responds to input, ends and resets', () => {
  const ctx = new Proxy(
    {},
    {
      get: (_t, key) =>
        key === 'measureText' ? () => ({ width: 100 }) : () => {},
      set: () => true,
    }
  );
  for (const example of exampleGames) {
    const create = runInNewContext(example.code + ';createGame', { Math });
    const game = create({ ctx, canvas: {}, width: 800, height: 500 });
    const original = game.getState();
    for (let i = 0; i < 10; i++)
      game.update(0.02, { right: true, action: true });
    assert.ok(game.getState().x > original.x, example.title + ' must move');
    game.draw();
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          create({ ctx, canvas: {}, width: 800, height: 500 }).getState()
        )
      ),
      JSON.parse(JSON.stringify(original))
    );
    for (let n = 0; n < 12000 && !game.getState().ended; n++)
      game.update(0.04, { right: example.id === 'portal-hop' });
    assert.equal(
      game.getState().ended,
      true,
      example.title + ' must have a loss state'
    );
  }
});
test('automatic repair runs exactly once and successful output is preserved', async () => {
  let calls = 0,
    checks = 0;
  const phases: string[] = [];
  const result = await runGamePipeline({
    signal: new AbortController().signal,
    generate: async (previous) => {
      calls++;
      if (calls === 2) assert.match(previous!.error, /broken/);
      return exampleGames[0];
    },
    validate: async () => {
      if (++checks === 1) throw new Error('broken code');
      return thumb;
    },
    phase: async (p) => {
      phases.push(p);
    },
  });
  assert.equal(result.output.title, 'Moss Knight');
  assert.equal(calls, 2);
  assert.deepEqual(phases, ['validating', 'repairing', 'validating']);
});
test('two invalid results fail; an aborted deadline never starts another request', async () => {
  let calls = 0;
  await assert.rejects(
    runGamePipeline({
      signal: new AbortController().signal,
      generate: async () => {
        calls++;
        throw new Error('bad output');
      },
      validate: async () => thumb,
      phase: async () => {},
    }),
    /bad output/
  );
  assert.equal(calls, 2);
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    runGamePipeline({
      signal: c.signal,
      generate: async () => {
        throw new Error('must not run');
      },
      validate: async () => thumb,
      phase: async () => {},
    })
  );
});
test('OpenAI-compatible adapter accepts a fixed local fixture and rejects missing entry point', async () => {
  const { generateGame } = await import('../src/core/ai/game-generator');
  let output: any = exampleGames[0];
  const server = createServer((req, res) => {
    req.resume();
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(output) } }],
      })
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const config = {
    openai_base_url: 'http://127.0.0.1:' + address.port + '/v1',
    openai_api_key: 'fixture',
    openai_model: 'fixture',
  };
  try {
    const value = await generateGame(
      config,
      input(),
      new AbortController().signal
    );
    assert.equal(value.title, 'Moss Knight');
    output = { ...exampleGames[0], code: 'x'.repeat(100) };
    await assert.rejects(
      generateGame(config, input(), new AbortController().signal),
      /entry point/
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test('a job and its debit are atomic; duplicates and concurrency cannot double-charge', async () => {
  const id = await person(2),
    request = input();
  const result = await Promise.all([
    tasks.enqueueGame(id, request),
    tasks.enqueueGame(id, request),
  ]);
  assert.equal(result[0].id, result[1].id);
  assert.equal(await credits.getBalance(id), 1);
  await assert.rejects(tasks.enqueueGame(id, input()), /already generating/);
  const noFunds = await person();
  await assert.rejects(tasks.enqueueGame(noFunds, input()), /credit/);
  assert.equal(
    (
      await db()
        .select()
        .from(schema.gameJob)
        .where(eq(schema.gameJob.userId, noFunds))
    ).length,
    0
  );
  await tasks.failGameJob(result[0].id, 'fixture failure');
  assert.equal(await credits.getBalance(id), 2);
});
test('concurrent failures and repeated revocation restore the credit only once', async () => {
  const id = await person(1),
    job = await tasks.enqueueGame(id, input());
  await Promise.all([
    tasks.failGameJob(job.id, 'broken'),
    tasks.failGameJob(job.id, 'broken'),
  ]);
  await credits.revoke(job.consumeCreditId);
  assert.equal(await credits.getBalance(id), 1);
});
test('timeout returns credit, releases the active-user lock and rejects late completion', async () => {
  const id = await person(1),
    job = await tasks.enqueueGame(id, input());
  await db()
    .update(schema.gameJob)
    .set({ deadlineAt: new Date(0), leaseToken: 'stale' })
    .where(eq(schema.gameJob.id, job.id));
  await tasks.expireGameJobs();
  assert.equal((await tasks.getGameJob(id, job.id)).status, 'failed');
  assert.equal(await credits.getBalance(id), 1);
  await tasks.completeGameJob(job.id, 'stale', exampleGames[0], thumb);
  assert.equal(await games.findGame(id, job.id), null);
});
test('successful private games are owner-scoped and deleted games cannot be retrieved', async () => {
  const id = await person(1),
    other = await person(),
    job = await tasks.enqueueGame(id, input());
  await db()
    .update(schema.gameJob)
    .set({ leaseToken: 'mine', status: 'validating' })
    .where(eq(schema.gameJob.id, job.id));
  await tasks.completeGameJob(job.id, 'mine', exampleGames[0], thumb);
  assert.equal((await games.findGame(id, job.id)).version, 1);
  assert.equal(await tasks.getGameJob(other, job.id), null);
  assert.equal(await games.findGame(other, job.id), null);
  assert.equal((await games.deleteGame(other, job.id)).length, 0);
  assert.equal((await games.listGames(other)).length, 0);
  await games.deleteGame(id, job.id);
  assert.equal(await games.findGame(id, job.id), null);
});
test('Stripe verifies signed fixture webhooks and rejects an invalid signature', async () => {
  const Stripe = (await import('stripe')).default;
  const { StripeProvider } = await import('../src/core/payment/stripe');
  const payload = JSON.stringify({
    id: 'evt_fixture',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_fixture',
        mode: 'payment',
        status: 'complete',
        payment_status: 'paid',
        amount_total: 100,
        currency: 'usd',
        customer_details: { email: 'fixture@example.test' },
        metadata: {},
      },
    },
  });
  const secret = 'whsec_local_fixture_only';
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const provider = new StripeProvider({
    secretKey: 'sk_test_fixture',
    publishableKey: 'pk_test_fixture',
    signingSecret: secret,
  });
  const event = await provider.getPaymentEvent({
    req: new Request('http://localhost/webhook', {
      method: 'POST',
      body: payload,
      headers: { 'stripe-signature': header },
    }),
  });
  assert.ok(event.paymentSession);
  await assert.rejects(
    provider.getPaymentEvent({
      req: new Request('http://localhost/webhook', {
        method: 'POST',
        body: payload,
        headers: { 'stripe-signature': 'invalid' },
      }),
    })
  );
});
test('concurrent successful payment notifications grant the purchased credits once', async () => {
  const id = await person();
  const orderId = randomUUID();
  await db()
    .insert(schema.order)
    .values({
      id: orderId,
      orderNo: randomUUID(),
      userId: id,
      status: 'created',
      amount: 100,
      currency: 'usd',
      paymentProvider: 'stripe',
      paymentSessionId: 'cs_' + orderId,
      checkoutInfo: '{}',
      creditsAmount: 2,
      creditsValidDays: 365,
    });
  const { handleCheckoutSuccess } =
    await import('../src/modules/payment/service');
  const { PaymentStatus } = await import('../src/core/payment/types');
  const session = {
    paymentStatus: PaymentStatus.SUCCESS,
    paymentResult: { id: 'cs_' + orderId },
    paymentInfo: { paymentAmount: 100, paymentCurrency: 'usd' },
  };
  await Promise.all([
    handleCheckoutSuccess(session, 'stripe'),
    handleCheckoutSuccess(session, 'stripe'),
  ]);
  assert.equal(await credits.getBalance(id), 2);
});
