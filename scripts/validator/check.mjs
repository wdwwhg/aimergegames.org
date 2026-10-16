import { chromium } from 'playwright';

import { runnerHtml } from './game-runtime.mjs';

let raw = '';
for await (const chunk of process.stdin) {
  raw += chunk;
  if (raw.length > 140000) throw new Error('Code too large');
}
let browser;
try {
  const { code } = JSON.parse(raw);
  if (typeof code !== 'string' || code.length > 131072)
    throw new Error('Invalid code');
  browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    serviceWorkers: 'block',
  });
  await context.route('**/*', (route) => route.abort());
  const page = await context.newPage();
  let runtimeError = '';
  page.on('pageerror', (e) => (runtimeError = e.message));
  const html = runnerHtml({ code }).replace(
    '<head>',
    `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; connect-src 'none'; style-src 'unsafe-inline'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'">`
  );
  await page.setContent(html);
  await page.waitForFunction(
    () => document.documentElement.dataset.state === 'frame',
    {},
    { timeout: 5000 }
  );
  const initial = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.gameState || 'null')
  );
  const image = await page.locator('canvas').screenshot();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.gameState || 'null')
  );
  if (
    !initial ||
    !after ||
    typeof initial.x !== 'number' ||
    typeof after.x !== 'number' ||
    initial.x === after.x
  )
    throw new Error('Directional input did not move the player.');
  const next = await page.locator('canvas').screenshot();
  if (image.equals(next)) throw new Error('Canvas did not respond to input.');
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.locator('#restart').click();
  await page.waitForFunction(
    () => document.documentElement.dataset.state === 'frame',
    {},
    { timeout: 5000 }
  );
  await page.waitForTimeout(100);
  const reset = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.gameState || 'null')
  );
  if (!reset || Math.abs(reset.x - initial.x) > 2)
    throw new Error('Restart did not reset the game.');
  if (runtimeError) throw new Error(runtimeError);
  const thumbnail =
    'data:image/png;base64,' +
    (await page.locator('canvas').screenshot()).toString('base64');
  console.log(JSON.stringify({ ok: true, thumbnail }));
} catch (error) {
  console.log(
    JSON.stringify({ ok: false, error: String(error.message).slice(0, 200) })
  );
} finally {
  await browser?.close();
}
