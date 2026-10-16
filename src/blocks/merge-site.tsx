import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gamepad2,
  Layers3,
  MousePointer2,
  Sparkles,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { articles } from '@/lib/games/articles';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ExampleGallery } from '@/components/example-gallery';
import { HeroPreview } from '@/components/hero-preview';
import { MergeForm } from '@/components/merge-form';

export function MergeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="merge-site">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
export async function Studio({
  enabled = false,
  home = false,
}: {
  enabled?: boolean;
  home?: boolean;
}) {
  const t = await getTranslations('merge');
  return (
    <section className={`studio ${home ? 'home-studio' : ''}`} id="studio">
      <div className="studio-form">
        <div className="studio-title">
          <span className="studio-icon">
            <Sparkles size={20} />
          </span>
          <div>
            <h2>{t('hero.studio')}</h2>
            <p>{t('hero.studioSub')}</p>
          </div>
          <span className="beta-pill">BETA</span>
        </div>
        <MergeForm
          enabled={enabled}
          labels={t.raw('form')}
          playerLabels={t.raw('examples')}
        />
      </div>
      {home && (
        <HeroPreview labels={t.raw('hero')} playerLabels={t.raw('examples')} />
      )}
    </section>
  );
}
export async function ExampleSection({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const t = await getTranslations('merge');
  return (
    <section className="section-wrap" id="examples">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('examples.eyebrow')}</span>
          <h2>{t('examples.title')}</h2>
          <p>{t('examples.description')}</p>
        </div>
        {!standalone && (
          <Link className="text-link" href="/examples">
            {t('examples.all')}
            <ArrowUpRight size={17} />
          </Link>
        )}
      </div>
      <ExampleGallery
        labels={t.raw('examples')}
        playerLabels={t.raw('examples')}
      />
    </section>
  );
}
export async function GuideCards() {
  const t = await getTranslations('merge');
  return (
    <div className="guide-grid">
      {articles.slice(0, 3).map((article, i) => (
        <Link
          className="guide-card"
          href={`/guides/${article.slug}`}
          key={article.slug}
        >
          <span className={`guide-icon guide-icon-${i}`}>
            {i === 0 ? (
              <Layers3 size={24} />
            ) : i === 1 ? (
              <MousePointer2 size={24} />
            ) : (
              <Gamepad2 size={24} />
            )}
          </span>
          <span className="eyebrow">{article.tag}</span>
          <h3>{article.title}</h3>
          <p>{article.intro}</p>
          <span className="text-link">
            {t('guides.read')}
            <ArrowUpRight size={16} />
          </span>
        </Link>
      ))}
    </div>
  );
}
export async function HomeContent({ enabled }: { enabled: boolean }) {
  const t = await getTranslations('merge');
  const steps = t.raw('steps.items') as {
    number: string;
    title: string;
    text: string;
  }[];
  const features = t.raw('features.items') as { title: string; text: string }[];
  const faq = t.raw('faq.items') as { q: string; a: string }[];
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: envConfigs.app_name,
      url: envConfigs.app_url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: envConfigs.app_name,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web browser',
      description:
        'A playground for original game mashups, with three playable premade examples. Live AI generation is not yet available.',
      url: envConfigs.app_url,
    },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
        }}
      />
      <section className="hero-intro">
        <span className="hero-eyebrow">
          <Sparkles size={13} />
          {t('hero.eyebrow')}
        </span>
        <h1>
          {t('hero.title')}
          <br />
          <span>{t('hero.highlight')}</span>
        </h1>
        <p>{t('hero.description')}</p>
      </section>
      <div className="studio-wrap">
        <Studio enabled={enabled} home />
        <p className="studio-disclaimer">
          <Check size={13} />
          {t('hero.note')}
        </p>
      </div>
      <div className="availability">
        <span className="availability-label">
          <i className="live-dot" />
          {t('hero.status')}
        </span>
        <span>{t('hero.statusDetail')}</span>
        <Link href="/examples">
          <ArrowRight size={18} />
        </Link>
      </div>
      <ExampleSection />
      <section className="steps-section">
        <div className="section-wrap">
          <span className="eyebrow">{t('steps.eyebrow')}</span>
          <h2>{t('steps.title')}</h2>
          <div className="steps-grid">
            {steps.map((step) => (
              <div key={step.number}>
                <span className="step-number">
                  {step.number}
                  <span>—</span>
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section-wrap features-section">
        <div>
          <span className="eyebrow">{t('features.eyebrow')}</span>
          <h2>{t('features.title')}</h2>
          <div className="feature-art" aria-hidden="true">
            <div className="art-square">
              <Gamepad2 size={55} />
            </div>
            <span className="floating-plus">+</span>
            <div className="art-circle">
              <Sparkles size={39} />
            </div>
          </div>
        </div>
        <div className="features-list">
          {features.map((f, i) => (
            <div key={f.title}>
              <span className="feature-index">0{i + 1}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section-wrap guides-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('guides.eyebrow')}</span>
            <h2>{t('guides.title')}</h2>
          </div>
          <Link className="text-link" href="/guides">
            {t('guides.all')}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <GuideCards />
      </section>
      <section className="section-wrap faq-section">
        <h2>{t('faq.title')}</h2>
        <div>
          {faq.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <span>+</span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="bottom-cta">
        <Sparkles size={26} />
        <h2>{t('cta.title')}</h2>
        <p>{t('cta.description')}</p>
        <Link className="primary-link" href="/examples">
          {t('cta.button')}
          <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
export async function PricingContent() {
  const t = await getTranslations('merge');
  return (
    <section className="section-wrap pricing-section">
      <div className="page-intro">
        <span className="eyebrow">{t('pricing.eyebrow')}</span>
        <h1>{t('pricing.title')}</h1>
        <p>{t('pricing.description')}</p>
      </div>
      <div className="pricing-grid">
        {['free', 'trial', 'packs'].map((key, i) => (
          <article
            className={`price-card ${i === 1 ? 'price-highlight' : ''}`}
            key={key}
          >
            <span className="eyebrow">{t(`pricing.${key}`)}</span>
            <h2>{t(`pricing.${key}Price`)}</h2>
            <p>{t(`pricing.${key}Text`)}</p>
            <ul>
              {(t.raw(`pricing.${key}Items`) as string[]).map((v) => (
                <li key={v}>
                  <Check size={16} />
                  {v}
                </li>
              ))}
            </ul>
            {i === 0 ? (
              <Link className="primary-link" href="/examples">
                {t('examples.play')}
                <ArrowUpRight size={17} />
              </Link>
            ) : (
              <div className="closed-price">{t('pricing.closed')}</div>
            )}
          </article>
        ))}
      </div>
      <p className="center-note">{t('pricing.note')}</p>
    </section>
  );
}
