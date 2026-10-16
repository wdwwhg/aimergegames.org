import { getTranslations } from 'next-intl/server';

import { SiteFooter } from '@/components/site-footer';

export async function Footer() {
  const t = await getTranslations('merge');
  return (
    <SiteFooter
      tagline={t('footer.tagline')}
      columns={[
        {
          title: t('footer.product'),
          links: [
            { label: t('nav.create'), href: '/create' },
            { label: t('nav.examples'), href: '/examples' },
            { label: t('nav.library'), href: '/dashboard/games' },
          ],
        },
        {
          title: t('footer.learn'),
          links: [
            { label: t('nav.guides'), href: '/guides' },
            { label: t('nav.tools'), href: '/tools' },
            { label: t('footer.about'), href: '/about' },
          ],
        },
        {
          title: t('footer.legal'),
          links: [
            { label: t('footer.privacy'), href: '/privacy-policy' },
            { label: t('footer.terms'), href: '/terms-of-service' },
            { label: t('footer.refund'), href: '/refund-policy' },
          ],
        },
      ]}
    />
  );
}
