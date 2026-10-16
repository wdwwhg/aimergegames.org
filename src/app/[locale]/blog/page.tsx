import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { BlogCard } from '@/components/blog-card';
import { formatPostDate, getBlogPosts } from '@/content/posts';

// Statically generated, refreshed every 10 minutes (picks up new db posts)
export const revalidate = 600;

const urlFor = (loc: string) =>
  loc === defaultLocale
    ? `${envConfigs.app_url}/blog`
    : `${envConfigs.app_url}/${loc}/blog`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: urlFor(locale),
      languages: Object.fromEntries(locales.map((loc) => [loc, urlFor(loc)])),
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('blog');
  const posts = await getBlogPosts(locale);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h1 className="font-serif text-4xl font-normal tracking-tight sm:text-5xl">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-lg">
              {t('description')}
            </p>
          </div>

          {posts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  title={post.title}
                  description={post.description}
                  image={post.image}
                  date={formatPostDate(post.createdAt, locale)}
                  authorName={post.authorName}
                  authorImage={post.authorImage}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center">
              {t('no_posts')}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
