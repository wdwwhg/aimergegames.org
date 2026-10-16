import { findGame } from '@/modules/games/service';
import { gameUser, privateHeaders } from '@/lib/games/api';
import { respErr } from '@/lib/resp';

import { runnerHtml } from '../../../../../../public/game-runtime.mjs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await gameUser();
  if (!user)
    return respErr('Unauthorized', { status: 401, headers: privateHeaders });
  const { id } = await params;
  const game = await findGame(user.id, id);
  if (!game)
    return respErr('Game not found', { status: 404, headers: privateHeaders });
  let html = runnerHtml({ code: game.code });
  const csp =
    "default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'";
  html = html.replace(
    '<head>',
    '<head><meta http-equiv="Content-Security-Policy" content="' + csp + '">'
  );
  const safe = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!
    );
  html = html
    .replace(
      '<title>Game player</title>',
      '<title>' + safe(game.title) + '</title>'
    )
    .replace(
      '<div class="controls">',
      '<p style="padding:12px;margin:0;background:white">' +
        safe(game.controls) +
        '</p><div class="controls">'
    );
  return new Response(html, {
    headers: {
      ...privateHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="game-' +
        id.replace(/[^a-zA-Z0-9-]/g, '') +
        '.html"',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
