import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getAllConfigs } from '@/modules/config/service';
import { generationAvailable } from '@/lib/games/availability';
import { publicMetadata } from '@/lib/games/metadata';
import { HomeContent, MergeShell } from '@/blocks/merge-site';

export const revalidate = 3600;
export const metadata = publicMetadata(
  '',
  'AI Merge Games — Create Playable Game Mashups',
  'Pick two gameplay inspirations, explore original playable 2D mashups, and discover how AI game creation works. Try three free examples.'
);
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') redirect('/');
  setRequestLocale(locale);
  const configs = await getAllConfigs();
  return (
    <MergeShell>
      <HomeContent enabled={generationAvailable(configs)} />
    </MergeShell>
  );
}
