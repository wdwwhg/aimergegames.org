import { envConfigs } from '@/config';
import { articles } from '@/lib/games/articles';

export const revalidate = 3600;
export function GET() {
  return new Response(
    [
      '# ' + envConfigs.app_name,
      '',
      'Live AI generation and purchases are not open. Three handcrafted original 2D examples are available at ' +
        envConfigs.app_url +
        '/examples.',
      '',
      'This service creates original browser prototypes; it does not merge commercial game files or distribute mods.',
      '',
      ...articles.flatMap((a) => [
        '## ' + a.title,
        a.intro,
        ...a.sections.flatMap((s) => ['### ' + s.title, s.text]),
        ...a.sources.map((s) => 'Source (reviewed 2026-10-16): ' + s.url),
        '',
      ]),
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}
