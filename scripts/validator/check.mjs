import { chromium } from 'playwright';

import { checkGameInBrowser } from './browser-check.mjs';

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
  console.log(JSON.stringify(await checkGameInBrowser(browser, code)));
} catch (error) {
  console.log(
    JSON.stringify({ ok: false, error: 'Game validation could not start.' })
  );
} finally {
  await browser?.close();
}
