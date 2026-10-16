import { envConfigs } from '@/config';
import { articles } from '@/lib/games/articles';

export const revalidate = 3600;
export function GET() {
  return new Response(
    [
      '# ' + envConfigs.app_name,
      '',
      '> Original 2D browser game mashups. Three handcrafted examples are playable. Live AI generation and purchases are not open.',
      '',
      '- [Play examples](' + envConfigs.app_url + '/examples)',
      '- [Create](' + envConfigs.app_url + '/create)',
      '- [Tools](' + envConfigs.app_url + '/tools)',
      ...articles.map(
        (a) =>
          '- [' +
          a.title +
          '](' +
          envConfigs.app_url +
          '/guides/' +
          a.slug +
          '): ' +
          a.intro
      ),
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}
