import { runnerHtml } from '../../public/game-runtime.mjs';

export const validationCsp =
  "default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; connect-src 'none'; style-src 'unsafe-inline'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";

const failures = {
  startup: 'The game did not render its first frame.',
  input: 'Directional input did not move the player and canvas.',
  restart: 'Restart did not reset the game.',
  runtime: 'The game stopped with a runtime error.',
  timeout: 'Game validation timed out.',
};

// The caller owns a fresh browser. No page navigates to the application, and no
// credentials, provider settings, or user metadata enter this function.
export async function checkGameInBrowser(
  browser,
  code,
  { timeoutMs = 18000 } = {}
) {
  let context,
    timer,
    stage = 'startup',
    stopped = false;
  const work = async () => {
    context = await browser.newContext({
      viewport: { width: 800, height: 600 },
      serviceWorkers: 'block',
      acceptDownloads: false,
      permissions: [],
    });
    if (stopped) {
      await context.close();
      throw new Error();
    }
    await context.route('**/*', (route) => route.abort());
    await context.routeWebSocket('**/*', (socket) => socket.close());
    const page = await context.newPage();
    page.setDefaultTimeout(4500);
    let runtimeError = false;
    page.on('pageerror', () => {
      runtimeError = true;
    });
    page.on('popup', (popup) => {
      void popup.close();
      runtimeError = true;
    });
    const html = runnerHtml({ code }).replace(
      '<head>',
      `<head><meta http-equiv="Content-Security-Policy" content="${validationCsp}">`
    );
    await page.setContent(html, { waitUntil: 'load' });
    const frame = () =>
      page.waitForFunction(
        () => document.documentElement.dataset.state === 'frame'
      );
    const state = () =>
      page.evaluate(() =>
        JSON.parse(document.documentElement.dataset.gameState || 'null')
      );
    const healthy = async () => {
      if (
        runtimeError ||
        (await page.evaluate(
          () => document.documentElement.dataset.state === 'error'
        ))
      ) {
        stage = 'runtime';
        throw new Error();
      }
    };
    await frame();
    await healthy();
    const initial = await state();
    const image = await page.locator('canvas').screenshot();
    stage = 'input';
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowRight');
    const after = await state();
    await healthy();
    if (
      !Number.isFinite(initial?.x) ||
      !Number.isFinite(after?.x) ||
      initial.x === after.x
    )
      throw new Error();
    const next = await page.locator('canvas').screenshot();
    if (Buffer.from(image).equals(Buffer.from(next))) throw new Error();
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    await healthy();
    stage = 'restart';
    await page.evaluate(() => {
      document.documentElement.dataset.state = 'restarting';
    });
    await page.locator('#restart').click();
    await frame();
    await page.waitForTimeout(100);
    const reset = await state();
    await healthy();
    if (!Number.isFinite(reset?.x) || Math.abs(reset.x - initial.x) > 2)
      throw new Error();
    const png = Buffer.from(await page.locator('canvas').screenshot());
    if (png.length > 1000000) throw new Error();
    return {
      ok: true,
      thumbnail: 'data:image/png;base64,' + png.toString('base64'),
    };
  };
  try {
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          stage = 'timeout';
          stopped = true;
          reject(new Error());
        }, timeoutMs);
      }),
    ]);
  } catch {
    return { ok: false, error: failures[stage] };
  } finally {
    stopped = true;
    clearTimeout(timer);
    await context?.close().catch(() => {});
  }
}
