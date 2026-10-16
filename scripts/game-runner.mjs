import http from 'node:http';

import { runnerHtml } from '../public/game-runtime.mjs';

const port = Number(process.env.GAME_RUNNER_PORT || 3001);
const parents = (
  process.env.GAME_PARENT_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000,http://host.docker.internal:3000'
).split(',');
const html = runnerHtml({ parents });
http
  .createServer((req, res) => {
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${parents.join(' ')}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()'
    );
    if (req.url !== '/' && req.url !== '/health') {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      'Content-Type',
      req.url === '/health' ? 'text/plain' : 'text/html; charset=utf-8'
    );
    res.end(req.url === '/health' ? 'ok' : html);
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`Isolated game player: http://localhost:${port}`)
  );
