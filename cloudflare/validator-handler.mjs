// No generated code is evaluated in a Worker. It enters only the remote browser.
export function validatorHandler(launch, check) {
  return async (request, env) => {
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    };
    const reply = (value, status = 200) =>
      new Response(JSON.stringify(value), { status, headers });
    const reject = async (status) => {
      await request.body?.cancel().catch(() => {});
      return reply({}, status);
    };
    if (
      new URL(request.url).pathname !== '/validate' ||
      request.method !== 'POST'
    )
      return reject(404);
    if (request.headers.has('Origin')) return reject(403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json'))
      return reject(415);
    let code;
    const reader = request.body?.getReader();
    if (!reader) return reply({}, 400);
    try {
      let size = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 550000) return reply({}, 413);
        chunks.push(value);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (
        Object.keys(input).length !== 1 ||
        typeof input.code !== 'string' ||
        input.code.length < 80 ||
        input.code.length > 131072
      )
        return reply({}, 400);
      code = input.code;
    } catch {
      return reply({}, 400);
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    let browser,
      timedOut = false,
      timer;
    try {
      const result = await Promise.race([
        (async () => {
          // Policy is fixed for this session; an empty allowlist denies all web
          // requests at Cloudflare, independently of page CSP/interception.
          browser = await launch(env.BROWSER, {
            guardrails: { allowedDomains: [] },
            keep_alive: 30000,
          });
          if (timedOut) {
            await browser.close();
            throw new Error();
          }
          return check(browser, code);
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(new Error());
          }, 22000);
        }),
      ]);
      return reply(result);
    } catch {
      return reply(
        { ok: false, error: 'The isolated game validator is unavailable.' },
        503
      );
    } finally {
      clearTimeout(timer);
      await browser?.close().catch(() => {});
    }
  };
}
