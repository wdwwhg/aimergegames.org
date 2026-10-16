import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAllConfigs } from '@/modules/config/service';
import { generationAvailable } from '@/lib/games/availability';
import { publicMetadata } from '@/lib/games/metadata';
import { MergeShell, Studio } from '@/blocks/merge-site';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata(
  '/create',
  'Create a game mashup | AI Merge Games',
  'Combine two gameplay inspirations with your own twist. Original 2D browser game creation, with private saving and online play.'
);
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') redirect('/create');
  setRequestLocale(locale);
  const t = await getTranslations('merge');
  return (
    <MergeShell>
      <section className="section-wrap create-section">
        <div className="page-intro">
          <span className="eyebrow">{t('hero.eyebrow')}</span>
          <h1>{t('create.title')}</h1>
          <p>{t('create.description')}</p>
        </div>
        <Studio enabled={generationAvailable(await getAllConfigs())} />
      </section>
    </MergeShell>
  );
}
