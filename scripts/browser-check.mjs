import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('output/playwright', { recursive: true });
const report = {
  layouts: [],
  examples: [],
  routes: [],
  security: [],
  account: false,
};
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.locator('h1').waitFor();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(metrics.scroll <= width + 1, 'Horizontal overflow at ' + width);
    for (const img of await page.locator('main img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate((i) => i.decode().catch(() => {}));
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: 'output/playwright/home-' + width + '.png',
      fullPage: true,
    });
    if (width === 1440)
      await page.screenshot({ path: 'output/playwright/preview-desktop.png' });
    report.layouts.push({ ...metrics, requested: width });
  }
  assert.equal(await page.locator('.merge-submit').isDisabled(), true);
  await page.getByRole('button', { name: /Super Mario.*Portal/ }).click();
  assert.equal(
    await page.getByLabel('First inspiration', { exact: true }).inputValue(),
    'Super Mario'
  );
  assert.equal(
    await page.getByLabel('Second inspiration', { exact: true }).inputValue(),
    'Portal'
  );
  await page.goto('http://localhost:3000/examples');
  for (const title of ['Moss Knight', 'Portal Hop', 'Meadow Survivor']) {
    await page
      .getByRole('button', { name: 'Play game: ' + title, exact: true })
      .click();
    const frame = page.frameLocator('.game-dialog iframe');
    await frame.locator('html[data-state="frame"]').waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.waitForTimeout(150);
    const initial = JSON.parse(
      await frame.locator('html').getAttribute('data-game-state')
    );
    await frame.locator('canvas').click();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    const moved = JSON.parse(
      await frame.locator('html').getAttribute('data-game-state')
    );
    assert.ok(moved.x > initial.x, title + ' must move');
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.waitForTimeout(150);
    const reset = JSON.parse(
      await frame.locator('html').getAttribute('data-game-state')
    );
    assert.ok(Math.abs(reset.x - initial.x) < 2, title + ' must restart');
    const button = await frame
      .getByRole('button', { name: 'Action', exact: true })
      .boundingBox();
    const iframeBox = await page.locator('.game-dialog iframe').boundingBox();
    assert.ok(
      button &&
        iframeBox &&
        button.y + button.height <= iframeBox.y + iframeBox.height + 1,
      'Touch controls must fit'
    );
    report.examples.push({
      title,
      movement: true,
      restart: true,
      touchControls: true,
    });
    await page.screenshot({
      path:
        'output/playwright/' +
        title.toLowerCase().replaceAll(' ', '-') +
        '.png',
    });
    await page
      .getByRole('button', { name: 'Close player', exact: true })
      .click();
  }
  for (const path of [
    '/create',
    '/guides',
    '/guides/melty-game-mashups',
    '/tools',
    '/pricing',
    '/about',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
  ]) {
    const r = await page.goto('http://localhost:3000' + path);
    assert.equal(r.status(), 200, path);
    assert.equal(
      await page.locator('h1').count(),
      1,
      path + ' should have one h1'
    );
    report.routes.push(path);
  }
  await page.goto('http://localhost:3000/pricing');
  assert.equal(
    await page.getByText('Purchases are not open yet', { exact: true }).count(),
    2
  );
  assert.equal(
    (await context.request.get('http://localhost:3000/api/games')).status(),
    401
  );
  assert.equal(
    (
      await context.request.get('http://localhost:3000/api/games/not-mine')
    ).status(),
    401
  );
  assert.equal(
    (
      await context.request.get('http://localhost:3000/api/games/jobs/not-mine')
    ).status(),
    401
  );
  assert.equal(
    (
      await context.request.get(
        'http://localhost:3000/api/games/not-mine/download'
      )
    ).status(),
    401
  );
  // A disposable local account verifies the auth and private-library path.
  const signup = await context.request.post(
    'http://localhost:3000/api/auth/sign-up/email',
    {
      headers: { Origin: 'http://localhost:3000' },
      data: {
        email: 'browser-qa-' + randomUUID() + '@example.test',
        password: randomUUID() + '!Aa1',
        name: 'Local browser QA',
      },
    }
  );
  assert.equal(signup.status(), 200, 'Local signup must work');
  const who = await signup.json();
  report.account = true;
  assert.equal(
    (await context.request.get('http://localhost:3000/api/games')).status(),
    200
  );
  const closed = await context.request.post(
    'http://localhost:3000/api/games/generate',
    {
      data: {
        gameA: 'Minecraft',
        gameB: 'Elden Ring',
        description: '',
        genre: 'auto',
        idempotencyKey: randomUUID(),
      },
    }
  );
  assert.equal(
    closed.status(),
    503,
    'Unconfigured generation must stay closed'
  );
  await page.goto('http://localhost:3000/dashboard/games');
  await page
    .getByText('A whole lot of possibility.', { exact: true })
    .waitFor({ timeout: 10000 });
  await page.screenshot({
    path: 'output/playwright/private-library.png',
    fullPage: true,
  });
  const fixtureOutput = execFileSync(
    process.execPath,
    [
      'node_modules/tsx/dist/cli.mjs',
      'scripts/with-env.ts',
      'node',
      'node_modules/tsx/dist/cli.mjs',
      'scripts/browser-fixture.ts',
      who.user.id,
    ],
    { encoding: 'utf8' }
  );
  const gameId = fixtureOutput.match(/QA_GAME_ID=([a-zA-Z0-9-]+)/)[1];
  const download = await context.request.get(
    'http://localhost:3000/api/games/' + gameId + '/download'
  );
  assert.equal(download.status(), 200);
  assert.match(download.headers()['content-disposition'], /attachment/);
  const html = await download.text();
  assert.ok(html.includes('QA Moss Knight'));
  assert.ok(html.includes('createGame'));
  await writeFile('output/playwright/download-test.html', html);
  const fileContext = await browser.newContext();
  const filePage = await fileContext.newPage();
  await filePage.goto(
    new URL('../output/playwright/download-test.html', import.meta.url).href
  );
  await filePage.locator('html[data-state="frame"]').waitFor();
  await fileContext.close();
  await page.reload();
  await page.getByRole('heading', { name: 'QA Moss Knight' }).waitFor();
  await page.getByRole('button', { name: 'Play game', exact: true }).click();
  await page
    .frameLocator('iframe')
    .locator('html[data-state="frame"]')
    .waitFor();
  await page.screenshot({
    path: 'output/playwright/saved-game.png',
    fullPage: true,
  });
  assert.equal(
    (
      await context.request.delete('http://localhost:3000/api/games/' + gameId)
    ).status(),
    200
  );
  assert.equal(
    (
      await context.request.get(
        'http://localhost:3000/api/games/' + gameId + '/download'
      )
    ).status(),
    404
  );
  report.account = {
    signup: true,
    library: true,
    downloadPlayable: true,
    delete: true,
  };
  const sitemap = await (
    await context.request.get('http://localhost:3000/sitemap.xml')
  ).text();
  assert.ok(!sitemap.includes('/dashboard'));
  assert.ok(!sitemap.includes('/zh/'));
  assert.ok(sitemap.includes('/guides/melty-game-mashups'));
  // Test the actual runner's network restrictions and watchdog with known test code.
  const fixtureCode = String.raw`function createGame({ctx}){let x=10;return{update(dt,i){if(i.right)x++;},draw(){ctx.fillRect(x,10,20,20);},getState(){return{x,y:10,ended:false,won:false,score:0};}};}`;
  await page.goto('http://localhost:3000/create');
  await page.evaluate(() => {
    const frame = document.createElement('iframe');
    frame.id = 'security-test';
    frame.src = 'http://127.0.0.1:3001';
    frame.sandbox = 'allow-scripts allow-same-origin';
    document.body.append(frame);
  });
  await page.frameLocator('#security-test').locator('canvas').waitFor();
  const load = async (code) =>
    page.evaluate(
      (code) =>
        document
          .querySelector('#security-test')
          .contentWindow.postMessage(
            { type: 'load', nonce: 'security-fixture', code },
            'http://127.0.0.1:3001'
          ),
      code
    );
  await load(fixtureCode);
  await page
    .frameLocator('#security-test')
    .locator('html[data-state="frame"]')
    .waitFor();
  const isolated = await page
    .frames()
    .find((f) => f.url() === 'http://127.0.0.1:3001/')
    .evaluate(() => {
      let blocked = false;
      try {
        parent.document.body;
      } catch {
        blocked = true;
      }
      return blocked;
    });
  assert.equal(isolated, true);
  report.security.push('parent document inaccessible');
  await load(
    `function createGame(){throw new Error(typeof fetch+','+typeof Worker+','+typeof importScripts+','+typeof document);}`
  );
  await page
    .frameLocator('#security-test')
    .locator('html[data-state="error"]')
    .waitFor();
  assert.equal(
    await page
      .frameLocator('#security-test')
      .locator('html')
      .getAttribute('data-error'),
    'undefined,undefined,undefined,undefined'
  );
  report.security.push('generated code has no document or network API');
  await load('while(true){}');
  await page
    .frameLocator('#security-test')
    .locator('html[data-state="error"]')
    .waitFor({ timeout: 7000 });
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  report.security.push('infinite worker loop terminated; parent responsive');
  assert.deepEqual(errors, []);
  await writeFile(
    'output/playwright/report.json',
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
