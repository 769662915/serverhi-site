import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/**
 * 将标签转换为 URL 安全的 slug。
 * 处理特殊字符（如 CI/CD 中的 /）。
 *
 * Args:
 *   tag: 原始标签字符串
 *
 * Returns:
 *   URL 安全的 slug 字符串
 */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getAllPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => {
    return data.draft !== true;
  });

  return posts.sort((a, b) => {
    const byDate = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
    return byDate || a.slug.localeCompare(b.slug, 'en');
  });
}

export async function getFeaturedPosts(): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter(post => post.data.featured === true).slice(0, 6);
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter(post => post.data.category === category);
}

export async function getRelatedPosts(currentPost: Post, limit: number = 3): Promise<Post[]> {
  const allPosts = await getAllPosts();

  // Filter out current post
  const otherPosts = allPosts.filter(post => post.slug !== currentPost.slug);

  const currentTagSlugs = new Set(currentPost.data.tags.map(tagToSlug));

  // Score posts by relevance
  const scoredPosts = otherPosts.map(post => {
    let score = 0;

    // Same category: +10 points
    if (post.data.category === currentPost.data.category) {
      score += 10;
    }

    // Shared tags: +2 points per tag
    const sharedTags = [...new Set(post.data.tags.map(tagToSlug))].filter(slug => currentTagSlugs.has(slug));
    score += sharedTags.length * 2;

    return { post, score };
  });

  // Sort by score and return top results
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.post);
}

interface TagGroup {
  slug: string;
  name: string;
  posts: Post[];
}

const composeWatchAliases = new Set(['compose', 'development', 'hot-reload', 'sync', 'watch']);

export function isNavigationOnlyTag(group: TagGroup): boolean {
  return composeWatchAliases.has(group.slug)
    && group.posts.length === 1
    && group.posts[0].slug === 'docker-compose-watch-hot-reload';
}

export function groupPostsByTag(posts: Post[]): TagGroup[] {
  const groups = new Map<string, TagGroup>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagToSlug(tag);
      if (!slug) continue;
      let group = groups.get(slug);
      if (!group) {
        group = { slug, name: tag, posts: [] };
        groups.set(slug, group);
      }
      if (group.posts[group.posts.length - 1] !== post) group.posts.push(post);
    }
  }
  return [...groups.values()];
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}
