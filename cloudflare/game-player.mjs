import { runnerHtml } from '../public/game-runtime.mjs';

const parents = ['https://aimergegames.org'];
const html = runnerHtml({ parents });
export default {
  fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (!['/', '/health'].includes(pathname))
      return new Response('Not found', { status: 404 });
    return new Response(pathname === '/health' ? 'ok' : html, {
      headers: {
        'Content-Type':
          pathname === '/health' ? 'text/plain' : 'text/html; charset=utf-8',
        'Content-Security-Policy': `default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${parents.join(' ')}`,
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy':
          'camera=(), microphone=(), geolocation=(), payment=()',
        'Cache-Control': 'no-store',
      },
    });
  },
};
