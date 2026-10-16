import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { articles } from '@/lib/games/articles';
import { publicMetadata } from '@/lib/games/metadata';
import { GuideCards, MergeShell } from '@/blocks/merge-site';

export const metadata = publicMetadata(
  '/guides',
  'AI game mashup guides | AI Merge Games',
  'Learn what AI merge games are, plan an original browser mashup, and understand desktop mods and tools such as Melty.'
);
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') redirect('/guides');
  setRequestLocale(locale);
  const t = await getTranslations('merge');
  return (
    <MergeShell>
      <section className="section-wrap">
        <div className="page-intro">
          <span className="eyebrow">{t('guides.eyebrow')}</span>
          <h1>{t('guides.title')}</h1>
          <p>{t('guides.description')}</p>
        </div>
        <GuideCards />
        <Link className="guide-card mt-5" href={'/guides/' + articles[3].slug}>
          <span className="eyebrow">{articles[3].tag}</span>
          <h3>{articles[3].title}</h3>
          <p>{articles[3].intro}</p>
          <span className="text-link">{t('guides.read')} ↗</span>
        </Link>
      </section>
    </MergeShell>
  );
}
