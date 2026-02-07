import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

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
  return posts.filter(post => post.data.tags.includes(tag));
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
  const tags = new Set<string>();

  posts.forEach(post => {
    post.data.tags.forEach(tag => tags.add(tag));
  });

  return Array.from(tags).sort();
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
