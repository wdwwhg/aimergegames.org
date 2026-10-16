import type { MetadataRoute } from 'next';

import { envConfigs } from '@/config';
import { articles } from '@/lib/games/articles';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '',
    '/create',
    '/examples',
    '/guides',
    '/tools',
    '/pricing',
    '/about',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    ...articles.map((a) => '/guides/' + a.slug),
  ];
  return paths.map((path) => ({
    url: envConfigs.app_url + path,
    priority: path === '' ? 1 : 0.7,
    ...(path.startsWith('/guides/')
      ? { lastModified: new Date('2026-10-16T00:00:00Z') }
      : {}),
  }));
}
