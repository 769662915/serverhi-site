import rss from '@astrojs/rss';
import { getAllPosts } from '../lib/posts';
import { site } from '../lib/config';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site?.toString() || site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/posts/${post.slug}/`,
      categories: [post.data.category, ...(post.data.tags || [])],
      author: post.data.author,
    })),
    customData: `<language>en-us</language>`,
    stylesheet: '/rss-styles.xsl',
  });
}
