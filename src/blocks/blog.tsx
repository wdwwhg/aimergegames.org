import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { BlogCard } from '@/components/blog-card';
import { formatPostDate, getBlogPosts } from '@/content/posts';

export async function Blog() {
  const t = await getTranslations('landing');
  const locale = await getLocale();
  const posts = await getBlogPosts(locale, { limit: 3 });

  if (posts.length === 0) return null;

  return (
    <section id="blog" className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <h2 className="font-serif text-4xl font-normal tracking-tight sm:text-5xl">
            {t('blog.title')}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-lg">
            {t('blog.description')}
          </p>
        </div>
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
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {t('blog.view_all')}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
