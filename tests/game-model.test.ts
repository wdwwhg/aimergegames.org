import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { generateGame } from '../src/core/ai/game-generator';
import { requestGameModel } from '../src/core/ai/game-model';
import { exampleGames } from '../src/lib/games/examples';
import { gameModelDefaults } from '../src/lib/games/model-config';

const config = {
  ...gameModelDefaults,
  openai_api_key: 'fixture-key-not-a-real-secret',
};
const signal = () => new AbortController().signal;
const input = {
  gameA: 'Minecraft',
  gameB: 'Elden Ring',
  description: 'Explore',
  genre: 'action' as const,
  idempotencyKey: 'fixture',
};
const messages = [{ role: 'user' as const, content: 'Return a JSON object.' }];
function response(content: unknown = exampleGames[0], finish_reason = 'stop') {
  return Response.json({
    choices: [{ finish_reason, message: { content: JSON.stringify(content) } }],
  });
}
afterEach(() => mock.restoreAll());

test('DeepSeek game generation uses the official model, JSON and non-thinking mode', async () => {
  mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      assert.equal(url, 'https://api.deepseek.com/chat/completions');
      assert.equal(options.redirect, 'error');
      assert.equal(
        (options.headers as Record<string, string>).Authorization,
        'Bearer ' + config.openai_api_key
      );
      const body = JSON.parse(options.body as string);
      assert.equal(body.model, 'deepseek-flash');
      assert.deepEqual(body.thinking, { type: 'disabled' });
      assert.deepEqual(body.response_format, { type: 'json_object' });
      assert.equal(body.max_tokens, 10000);
      assert.equal(body.stream, false);
      assert.match(body.messages[0].content, /JSON/);
      assert.equal(
        JSON.parse(body.messages[1].content).inspirations[0],
        input.gameA
      );
      return response();
    }
  );
  assert.equal(
    (await generateGame(config, input, signal())).title,
    'Moss Knight'
  );
});

test('compatible providers keep their configured model without DeepSeek-only parameters', async () => {
  mock.method(
    globalThis,
    'fetch',
    async (url: string, options: RequestInit) => {
      assert.equal(url, 'https://example.test/v1/chat/completions');
      const body = JSON.parse(options.body as string);
      assert.equal(body.model, 'custom-model');
      assert.equal('thinking' in body, false);
      return response();
    }
  );
  await generateGame(
    {
      ...config,
      openai_base_url: 'https://example.test/v1/',
      openai_model: 'custom-model',
    },
    input,
    signal()
  );
});

test('missing keys and unsafe endpoints never send a model request', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => response());
  await assert.rejects(
    requestGameModel({ ...config, openai_api_key: '' }, messages, signal()),
    /API key/
  );
  for (const url of [
    'http://example.test',
    'https://key@example.test',
    'https://example.test?key=secret',
    'invalid',
  ])
    await assert.rejects(
      requestGameModel({ ...config, openai_base_url: url }, messages, signal()),
      /HTTPS/
    );
  assert.equal(fetch.mock.callCount(), 0);
});

test('provider errors are actionable and never echo secret-bearing response bodies', async () => {
  for (const [status, reason] of [
    [401, /API key/],
    [402, /balance/],
    [429, /rate limit/],
    [503, /request failed/],
  ] as const) {
    mock.method(globalThis, 'fetch', async () =>
      Response.json({ error: { message: config.openai_api_key } }, { status })
    );
    await assert.rejects(
      requestGameModel(config, messages, signal()),
      (error: Error) => {
        assert.match(error.message, reason);
        assert.ok(!error.message.includes(config.openai_api_key));
        return true;
      }
    );
    mock.restoreAll();
  }
});

test('truncated, empty, malformed and non-object output cannot count as successful generation', async () => {
  const fixtures = [
    { value: response(exampleGames[0], 'length'), error: /truncated/ },
    {
      value: Response.json({ choices: [{ message: { content: '' } }] }),
      error: /empty/,
    },
    {
      value: Response.json({
        choices: [{ message: { content: '{incomplete' } }],
      }),
      error: /valid JSON/,
    },
    { value: response([]), error: /JSON object/ },
    { value: new Response('not-json'), error: /invalid API response/ },
  ];
  for (const fixture of fixtures) {
    mock.method(globalThis, 'fetch', async () => fixture.value);
    await assert.rejects(
      requestGameModel(config, messages, signal()),
      fixture.error
    );
    mock.restoreAll();
  }
});

test('oversized model output is rejected even without a Content-Length header', async () => {
  mock.method(
    globalThis,
    'fetch',
    async () => new Response('x'.repeat(1_000_001))
  );
  await assert.rejects(
    requestGameModel(config, messages, signal()),
    /too large/
  );
});

test('cancelled jobs never start a request and in-flight cancellation is preserved', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetch = mock.method(globalThis, 'fetch', async () => response());
  await assert.rejects(requestGameModel(config, messages, controller.signal), {
    name: 'AbortError',
  });
  assert.equal(fetch.mock.callCount(), 0);
  mock.restoreAll();
  const active = new AbortController();
  mock.method(globalThis, 'fetch', async () => {
    active.abort();
    throw new Error('network failed');
  });
  await assert.rejects(requestGameModel(config, messages, active.signal), {
    name: 'AbortError',
  });
});

test('administrator connection test exercises the same JSON and non-thinking contract', async () => {
  const { runTest } = await import('../src/modules/config/settings-test');
  mock.method(
    globalThis,
    'fetch',
    async (_url: string, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      assert.deepEqual(body.thinking, { type: 'disabled' });
      assert.deepEqual(body.response_format, { type: 'json_object' });
      assert.equal(body.max_tokens, 256);
      return response({ ok: true });
    }
  );
  const result = await runTest(
    'openai',
    { model: 'deepseek-flash', prompt: 'Return JSON.' },
    config
  );
  assert.equal(result.success, true);
  assert.equal(result.details?.Model, 'deepseek-flash');
  mock.restoreAll();
  mock.method(globalThis, 'fetch', async () =>
    Response.json({ choices: [{ message: { content: '' } }] })
  );
  assert.equal((await runTest('openai', {}, config)).success, false);
});

test('the per-request deadline reports a timeout without exposing transport details', async () => {
  const deadline = new AbortController();
  deadline.abort(new DOMException('deadline', 'TimeoutError'));
  mock.method(AbortSignal, 'timeout', () => deadline.signal);
  mock.method(globalThis, 'fetch', async () => {
    throw new Error('private transport details');
  });
  await assert.rejects(
    requestGameModel(config, messages, signal()),
    /DeepSeek request timed out after 60 seconds/
  );
});
