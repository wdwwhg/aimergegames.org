import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.SITE_URL || 'https://aimergegames.org';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const report = { site: base, layouts: [], examples: [], pages: [], errors: [] };
page.on('pageerror', (error) => report.errors.push(error.message));
await mkdir('output/playwright', { recursive: true });
try {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const response = await page.goto(base, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    assert.equal(response.status(), 200);
    assert.match(await page.title(), /AI Merge Games/);
    assert.equal(
      new URL(await page.locator('link[rel="canonical"]').getAttribute('href'))
        .href,
      new URL(base).href
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      )
    );
    assert.equal(await page.locator('.merge-submit').isDisabled(), true);
    await page.screenshot({
      path: `output/playwright/cloudflare-${width}.png`,
      fullPage: true,
    });
    report.layouts.push({ width, passed: true });
    console.log('Layout passed:', width);
  }
  for (const route of [
    '/create',
    '/examples',
    '/guides',
    '/tools',
    '/pricing',
    '/guides/what-are-ai-merge-games',
  ]) {
    const response = await page.goto(base + route, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200, route);
    await page.locator('h1').waitFor();
    assert.equal(await page.locator('h1').count(), 1, route);
    report.pages.push({ route, status: 200 });
  }
  await page.goto(base + '/examples', { waitUntil: 'domcontentloaded' });
  for (const title of ['Moss Knight', 'Portal Hop', 'Meadow Survivor']) {
    await page
      .getByRole('button', { name: 'Play game: ' + title, exact: true })
      .click();
    const frame = page.frameLocator('.game-dialog iframe');
    await frame.locator('html[data-state="frame"]').waitFor({ timeout: 60000 });
    const origin = new URL(
      await page.locator('.game-dialog iframe').getAttribute('src')
    ).origin;
    assert.notEqual(origin, base);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.waitForTimeout(200);
    const start = JSON.parse(
      await frame.locator('html').getAttribute('data-game-state')
    );
    await frame.locator('canvas').click();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    const moved = JSON.parse(
      await frame.locator('html').getAttribute('data-game-state')
    );
    assert.ok(moved.x > start.x, title + ' must respond to input');
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.waitForTimeout(150);
    const reset = JSON.parse(
      await frame.locator('html').getAttribute('data-game-state')
    );
    assert.ok(Math.abs(reset.x - start.x) < 2, title + ' must restart');
    report.examples.push({ title, origin, passed: true });
    console.log('Playable example passed:', title);
    await page
      .getByRole('button', { name: 'Close player', exact: true })
      .click();
  }
  for (const route of ['/robots.txt', '/sitemap.xml']) {
    const response = await page.request.get(base + route);
    assert.equal(response.status(), 200);
    const text = await response.text();
    assert.ok(text.includes(base));
    assert.ok(!text.includes('localhost'));
    report.pages.push({ route, status: 200 });
  }
  assert.equal((await page.request.get(base + '/api/games')).status(), 401);
  if (process.argv.includes('--account')) {
    const email = `cloudflare-qa-${randomUUID()}@example.test`;
    const password = randomUUID() + 'aA!';
    const response = await page.request.post(base + '/api/auth/sign-up/email', {
      headers: { Origin: base },
      data: { email, password, name: 'Deployment QA' },
    });
    assert.equal(
      response.status(),
      200,
      'Signup: ' + (response.ok() ? '' : await response.text())
    );
    const result = await response.json();
    report.qaUserId = result.user.id;
    await writeFile(
      'output/playwright/cloudflare-qa-user.json',
      JSON.stringify({ id: result.user.id, email })
    );
    assert.equal((await page.request.get(base + '/api/games')).status(), 200);
    await page.goto(base + '/dashboard/games', {
      waitUntil: 'domcontentloaded',
    });
    assert.ok(!page.url().includes('sign-in'));
    assert.equal(
      (
        await page.request.post(base + '/api/games/generate', { data: {} })
      ).status(),
      503
    );
    const credits = await page.request.get(base + '/api/credits');
    assert.equal(credits.status(), 200);
    assert.equal((await credits.json()).data.balance, 0);
    report.account = true;
    const signOut = await page.request.post(base + '/api/auth/sign-out', {
      headers: { Origin: base },
      data: {},
    });
    assert.equal(signOut.status(), 200);
    const signIn = await page.request.post(base + '/api/auth/sign-in/email', {
      headers: { Origin: base },
      data: { email, password },
    });
    assert.equal(signIn.status(), 200);
    report.signIn = true;
    await page.request.post(base + '/api/auth/sign-out', {
      headers: { Origin: base },
      data: {},
    });
  }
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(
    'output/playwright/cloudflare-report.json',
    JSON.stringify(report, null, 2)
  );
  await browser.close();
}
