'use client';

import { useTranslations } from 'next-intl';

import { GameLibrary } from '@/components/game-library';

export function LibraryBlock() {
  const t = useTranslations('merge');
  return (
    <GameLibrary
      labels={{
        ...t.raw('library'),
        play: t('examples.play'),
        explore: t('examples.all'),
      }}
      playerLabels={t.raw('examples')}
    />
  );
}
