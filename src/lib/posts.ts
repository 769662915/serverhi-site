import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/**
 * 规范化标签名称，用于大小写不敏感匹配。
 *
 * Args:
 *   tag: 原始标签字符串
 *
 * Returns:
 *   小写并去除首尾空格的标签字符串
 */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

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
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
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

export async function getPostsByTag(tag: string): Promise<Post[]> {
  const posts = await getAllPosts();
  const normalizedTag = normalizeTag(tag);
  return posts.filter(post =>
    post.data.tags.some(t => normalizeTag(t) === normalizedTag)
  );
}

export async function getRelatedPosts(currentPost: Post, limit: number = 3): Promise<Post[]> {
  const allPosts = await getAllPosts();

  // Filter out current post
  const otherPosts = allPosts.filter(post => post.slug !== currentPost.slug);

  // Score posts by relevance
  const scoredPosts = otherPosts.map(post => {
    let score = 0;

    // Same category: +10 points
    if (post.data.category === currentPost.data.category) {
      score += 10;
    }

    // Shared tags: +2 points per tag
    const sharedTags = post.data.tags.filter(tag =>
      currentPost.data.tags.includes(tag)
    );
    score += sharedTags.length * 2;

    return { post, score };
  });

  // Sort by score and return top results
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.post);
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts();
  const tagMap = new Map<string, string>();

  posts.forEach(post => {
    post.data.tags.forEach(tag => {
      const normalized = normalizeTag(tag);
      if (!tagMap.has(normalized)) {
        tagMap.set(normalized, tag);
      }
    });
  });

  return Array.from(tagMap.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
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
