'use client';

import { Coins, CreditCard, Gamepad2, Home, Plus, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { envConfigs } from '@/config';
import { AppLayout } from '@/components/app-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('merge');
  return (
    <div className="merge-site">
      <AppLayout
        brand={envConfigs.app_name}
        brandHref="/dashboard/games"
        navItems={[
          { href: '/dashboard/games', label: t('nav.library'), icon: Gamepad2 },
          { href: '/create', label: t('nav.create'), icon: Plus },
          {
            href: '/settings/credits',
            label: t('library.credits'),
            icon: Coins,
          },
          {
            href: '/settings/billing',
            label: t('nav.pricing'),
            icon: CreditCard,
          },
        ]}
        footerNavItems={[
          { href: '/settings/profile', label: t('nav.profile'), icon: User },
          { href: '/', label: t('hero.title'), icon: Home },
        ]}
      >
        {children}
      </AppLayout>
    </div>
  );
}
