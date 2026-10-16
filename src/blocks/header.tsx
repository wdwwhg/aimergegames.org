import { getTranslations } from 'next-intl/server';

import { SiteHeader } from '@/components/site-header';

export async function Header() {
  const t = await getTranslations('merge');

  const navLinks = [
    { href: '/create', label: t('nav.create') },
    { href: '/examples', label: t('nav.examples') },
    { href: '/guides', label: t('nav.guides') },
    { href: '/pricing', label: t('nav.pricing') },
  ];

  return <SiteHeader navLinks={navLinks} simple />;
}
