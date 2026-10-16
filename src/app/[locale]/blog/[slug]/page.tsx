import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { MarkdownContent } from '@/components/markdown-content';
import { BLOG_POST_SLUGS, formatPostDate, getBlogPost } from '@/content/posts';

// Local MDX posts are pre-rendered; database posts render on demand and are
// then cached for 10 minutes.
export const revalidate = 600;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    BLOG_POST_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getBlogPost(slug, locale);
  if (!post) return {};

  const canonical =
    locale === defaultLocale
      ? `${envConfigs.app_url}/blog/${slug}`
      : `${envConfigs.app_url}/${locale}/blog/${slug}`;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getBlogPost(slug, locale);
  if (!post) notFound();

  const t = await getTranslations('blog');

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-8 md:py-16">
        <article className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            {t('back_to_blog')}
          </Link>

          <header className="border-border mt-8 mb-6 border-b pb-6">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
              {post.title}
            </h1>
            {post.description && (
              <p className="text-muted-foreground mt-3">{post.description}</p>
            )}
            <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {formatPostDate(post.createdAt, locale)}
              </span>
              {(post.authorName || post.authorImage) && (
                <span className="inline-flex items-center gap-2">
                  {post.authorImage &&
                    (post.authorImage.startsWith('/') ? (
                      <Image
                        src={post.authorImage}
                        alt={post.authorName || ''}
                        width={20}
                        height={20}
                        className="size-5 rounded-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.authorImage}
                        alt={post.authorName || ''}
                        className="size-5 rounded-full object-cover"
                      />
                    ))}
                  {post.authorName}
                </span>
              )}
            </div>
          </header>

          {post.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image}
              alt={post.title}
              className="border-border mb-8 w-full rounded-2xl border object-cover"
            />
          )}

          {post.Content ? (
            <div className="text-foreground/90 text-[15px] leading-7">
              <post.Content />
            </div>
          ) : (
            <MarkdownContent content={post.content || ''} />
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
