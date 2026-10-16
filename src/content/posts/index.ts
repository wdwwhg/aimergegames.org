import type { ComponentType } from 'react';

import { defaultLocale } from '@/config/locale';
import {
  findPublishedBySlug,
  listPublishedArticles,
} from '@/modules/posts/service';

/**
 * Local blog posts written as MDX files in this directory.
 * File naming: `<slug>.<locale>.mdx` (falls back to the default locale).
 * Register every local post slug here — it drives loading and static params.
 */
export const BLOG_POST_SLUGS = [
  'what-is-shipany',
  'blocks-vs-components',
] as const;

export type BlogPostMeta = {
  title: string;
  description: string;
  created_at: string;
  author_name?: string;
  author_image?: string;
  image?: string;
};

type PostModule = {
  default: ComponentType;
  meta: BlogPostMeta;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  image?: string;
  createdAt: Date;
  authorName?: string;
  authorImage?: string;
  source: 'local' | 'db';
};

export type BlogPostDetail = BlogPost & {
  /** MDX component — set for local posts */
  Content?: ComponentType;
  /** Raw markdown — set for database posts */
  content?: string;
};

async function loadLocalPost(
  slug: string,
  locale: string
): Promise<PostModule | null> {
  if (!BLOG_POST_SLUGS.includes(slug as (typeof BLOG_POST_SLUGS)[number])) {
    return null;
  }

  try {
    return (await import(
      `@/content/posts/${slug}.${locale}.mdx`
    )) as PostModule;
  } catch {
    if (locale === defaultLocale) return null;
    try {
      return (await import(
        `@/content/posts/${slug}.${defaultLocale}.mdx`
      )) as PostModule;
    } catch {
      return null;
    }
  }
}

function localPostToItem(slug: string, meta: BlogPostMeta): BlogPost {
  return {
    slug,
    title: meta.title,
    description: meta.description,
    image: meta.image,
    createdAt: new Date(meta.created_at),
    authorName: meta.author_name,
    authorImage: meta.author_image,
    source: 'local',
  };
}

async function getLocalPosts(locale: string): Promise<BlogPost[]> {
  const modules = await Promise.all(
    BLOG_POST_SLUGS.map(async (slug) => ({
      slug: slug as string,
      mod: await loadLocalPost(slug, locale),
    }))
  );
  return modules
    .filter((m): m is { slug: string; mod: PostModule } => m.mod !== null)
    .map(({ slug, mod }) => localPostToItem(slug, mod.meta));
}

async function getDbPosts(): Promise<BlogPost[]> {
  try {
    const rows = await listPublishedArticles();
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title || row.slug,
      description: row.description || '',
      image: row.image || undefined,
      createdAt: row.createdAt,
      authorName: row.authorName || undefined,
      authorImage: row.authorImage || undefined,
      source: 'db' as const,
    }));
  } catch {
    // Database not configured/reachable — local posts still render.
    return [];
  }
}

/**
 * All blog posts: database posts merged with local MDX posts,
 * deduped by slug (database wins), newest first.
 */
export async function getBlogPosts(
  locale: string,
  options: { limit?: number } = {}
): Promise<BlogPost[]> {
  const [dbPosts, localPosts] = await Promise.all([
    getDbPosts(),
    getLocalPosts(locale),
  ]);

  const dbSlugs = new Set(dbPosts.map((p) => p.slug));
  const merged = [
    ...dbPosts,
    ...localPosts.filter((p) => !dbSlugs.has(p.slug)),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return options.limit ? merged.slice(0, options.limit) : merged;
}

/**
 * Single blog post by slug: database first, local MDX as fallback.
 */
export async function getBlogPost(
  slug: string,
  locale: string
): Promise<BlogPostDetail | null> {
  try {
    const row = await findPublishedBySlug(slug);
    if (row) {
      return {
        slug: row.slug,
        title: row.title || row.slug,
        description: row.description || '',
        image: row.image || undefined,
        createdAt: row.createdAt,
        authorName: row.authorName || undefined,
        authorImage: row.authorImage || undefined,
        source: 'db',
        content: row.content || '',
      };
    }
  } catch {
    // Database not configured/reachable — fall through to local posts.
  }

  const mod = await loadLocalPost(slug, locale);
  if (!mod) return null;
  return { ...localPostToItem(slug, mod.meta), Content: mod.default };
}

export function formatPostDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: locale === 'zh' ? 'long' : 'short',
    day: 'numeric',
  }).format(date);
}
