import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { publicMetadata } from '@/lib/games/metadata';
import { MergeShell } from '@/blocks/merge-site';

export const metadata = publicMetadata(
  '/tools',
  'Game mashup tools | AI Merge Games',
  'A source-attributed introduction to Melty, plus the difference between a desktop mashup launcher and original browser game creation.'
);
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') redirect('/tools');
  setRequestLocale(locale);
  return (
    <MergeShell>
      <section className="section-wrap">
        <div className="page-intro">
          <span className="eyebrow">TOOLS FOR THE CURIOUS</span>
          <h1>Find your way to a mashup.</h1>
          <p>
            Original browser games and desktop mods take different paths. Start
            with the right tool for your idea.
          </p>
        </div>
        <article className="tool-panel">
          <div className="tool-mark" aria-hidden="true">
            m
          </div>
          <div>
            <span className="eyebrow">THIRD-PARTY TOOL · WINDOWS</span>
            <h2>Melty</h2>
            <p>
              Melty describes a launcher for discovering, playing and creating
              game mashups from games you own. Its official site shows examples
              including SkyCraft and Elden Craft.
            </p>
            <p>
              Source: Melty’s public homepage and FAQ, reviewed October 16,
              2026. We have not installed or tested its software. Follow its
              official requirements and current instructions.
            </p>
            <div className="tool-links">
              <a
                className="primary-link"
                href="https://melty.gg/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit official website ↗
              </a>
              <Link className="text-link" href="/guides/melty-game-mashups">
                Read our source notes →
              </Link>
            </div>
          </div>
        </article>
      </section>
    </MergeShell>
  );
}
