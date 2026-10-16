import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { articles } from '@/lib/games/articles';
import { publicMetadata } from '@/lib/games/metadata';
import { MergeShell } from '@/blocks/merge-site';

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  return a
    ? publicMetadata('/guides/' + slug, a.title + ' | AI Merge Games', a.intro)
    : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== 'en') redirect('/guides/' + slug);
  setRequestLocale(locale);
  const a = articles.find((a) => a.slug === slug);
  if (!a) notFound();
  const t = await getTranslations('merge');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.intro,
    datePublished: '2026-10-16',
    dateModified: '2026-10-16',
    author: { '@type': 'Organization', name: envConfigs.app_name },
    mainEntityOfPage: envConfigs.app_url + '/guides/' + slug,
  };
  return (
    <MergeShell>
      <article className="section-wrap article-wrap">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
          }}
        />
        <Link className="article-back" href="/guides">
          ← {t('guides.all')}
        </Link>
        <div className="eyebrow">{a.tag}</div>
        <h1>{a.title}</h1>
        <p className="article-intro">{a.intro}</p>
        <div className="article-body">
          {a.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </section>
          ))}
        </div>
        <aside className="article-sources">
          <span className="eyebrow">{t('guides.source')}</span>
          <p>{t('guides.updated')}</p>
          {a.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.label} ↗
            </a>
          ))}
        </aside>
        <div className="tool-links mt-8">
          <Link href="/examples" className="primary-link">
            {t('examples.all')} ↗
          </Link>
          <Link className="text-link" href="/create">
            {t('nav.create')} →
          </Link>
        </div>
      </article>
    </MergeShell>
  );
}
