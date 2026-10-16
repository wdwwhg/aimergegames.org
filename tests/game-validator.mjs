import assert from 'node:assert/strict';
import { chromium } from 'playwright';

import { validatorHandler } from '../cloudflare/validator-handler.mjs';
import { runnerHtml } from '../public/game-runtime.mjs';
import {
  checkGameInBrowser,
  validationCsp,
} from '../scripts/validator/browser-check.mjs';

const { exampleGames } = await import('../src/lib/games/examples.ts');

let launches = 0,
  closes = 0;
const handler = validatorHandler(
  async (_, options) => {
    launches++;
    assert.deepEqual(options.guardrails, { allowedDomains: [] });
    return {
      close: async () => {
        closes++;
      },
    };
  },
  async (_, code) => ({ ok: true, thumbnail: code.slice(0, 3) })
);
const request = (body, headers = {}) =>
  new Request('https://validator/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
assert.equal(
  (
    await handler(
      request({ code: 'x'.repeat(80) }, { Origin: 'https://aimergegames.org' }),
      {}
    )
  ).status,
  403
);
assert.equal((await handler(request({ code: 'short' }), {})).status, 400);
assert.equal(
  (
    await handler(
      request({ code: 'x'.repeat(80), secret: 'never-accepted' }),
      {}
    )
  ).status,
  400
);
assert.equal(
  (await handler(request({ code: 'x'.repeat(550001) }), {})).status,
  413
);
assert.equal(
  (await handler(new Request('https://validator/health'), {})).status,
  404
);
assert.equal(launches, 0);
assert.equal(
  (await handler(request({ code: 'x'.repeat(80) }), {})).status,
  200
);
assert.equal(launches, 1);
assert.equal(closes, 1);
const unavailable = validatorHandler(
  async () => {
    throw new Error('private transport detail');
  },
  () => {}
);
const failed = await unavailable(request({ code: 'x'.repeat(80) }), {});
assert.equal(failed.status, 503);
assert.doesNotMatch(await failed.text(), /private transport/);
console.log(
  'Private endpoint guards, bounded input, session policy, closure and safe service errors passed.'
);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const game of exampleGames) {
    const result = await checkGameInBrowser(browser, game.code);
    assert.equal(result.ok, true, `${game.id}: ${result.error}`);
    assert.match(result.thumbnail, /^data:image\/png;base64,/);
    console.log(
      'Actual browser first frame, input, restart and thumbnail:',
      game.id
    );
  }
  const good = exampleGames[0].code;
  const invalid = await checkGameInBrowser(
    browser,
    'function createGame(){throw new Error("private-data")}'
  );
  assert.equal(invalid.ok, false);
  assert.doesNotMatch(invalid.error, /private-data/);
  const stuck = await checkGameInBrowser(
    browser,
    'function createGame(){while(true){}}'
  );
  assert.equal(stuck.ok, false);
  const afterLoop = await checkGameInBrowser(browser, good);
  assert.equal(
    afterLoop.ok,
    true,
    'Infinite worker must not affect the next validation'
  );
  const timeout = await checkGameInBrowser(browser, good, { timeoutMs: 1 });
  assert.equal(timeout.ok, false);
  assert.match(timeout.error, /timed out/);

  const isolation = `
for(const key of ['fetch','XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker','importScripts']) {
  if(self[key] !== undefined) throw new Error('Network API available');
}
if(typeof document !== 'undefined' || typeof parent !== 'undefined' || typeof localStorage !== 'undefined') throw new Error('Account surface available');
${good}`;
  assert.equal((await checkGameInBrowser(browser, isolation)).ok, true);

  const context = await browser.newContext({ serviceWorkers: 'block' });
  let externalRequests = 0;
  await context.route('**/*', (route) => {
    externalRequests++;
    return route.abort();
  });
  const page = await context.newPage();
  await page.setContent(
    runnerHtml({
      code: `import('https://aimergegames.org/api/auth/get-session').catch(()=>{});${good}`,
    }).replace(
      '<head>',
      `<head><meta http-equiv="Content-Security-Policy" content="${validationCsp}">`
    )
  );
  await page.waitForTimeout(600);
  assert.equal(
    externalRequests,
    0,
    'CSP must block dynamic imports before any HTTP request'
  );
  assert.equal(page.url(), 'about:blank');
  assert.deepEqual(await context.cookies(), []);
  await context.close();
  console.log(
    'Broken code, dead loop termination, timeout, fresh context, no credentials, network and main-page isolation passed.'
  );
} finally {
  await browser.close();
}
