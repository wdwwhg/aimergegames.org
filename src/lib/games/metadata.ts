import type { Metadata } from 'next';

import { envConfigs } from '@/config';

export function publicMetadata(
  path: string,
  title: string,
  description: string
): Metadata {
  return {
    metadataBase: new URL(envConfigs.app_url),
    title: { absolute: title },
    description,
    alternates: { canonical: `${envConfigs.app_url}${path}` },
    openGraph: {
      title,
      description,
      url: `${envConfigs.app_url}${path}`,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
  };
}
