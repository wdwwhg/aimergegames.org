import type { MetadataRoute } from 'next';

import { envConfigs } from '@/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/settings',
          '/dashboard',
          '/zh/admin',
          '/zh/settings',
          '/zh/dashboard',
          '/api/',
          '/sign-in',
          '/sign-up',
          '/*?*',
        ],
      },
    ],
    sitemap: `${envConfigs.app_url}/sitemap.xml`,
  };
}
