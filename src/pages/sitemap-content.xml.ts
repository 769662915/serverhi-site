import type { APIRoute } from 'astro';
import { getAllPosts, groupPostsByTag, isNavigationOnlyTag } from '../lib/posts';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getAllPosts();
  const urlElement = (path: string, modified?: Date) => {
    const loc = new URL(path, site).href.replaceAll('&', '&amp;');
    const lastmod = modified ? `<lastmod>${modified.toISOString().slice(0, 10)}</lastmod>` : '';
    return `<url><loc>${loc}</loc>${lastmod}</url>`;
  };
  const entries = posts.map(post => urlElement(`/posts/${post.slug}/`, post.data.updatedDate ?? post.data.pubDate));
  for (const group of groupPostsByTag(posts)) {
    if (!isNavigationOnlyTag(group)) entries.push(urlElement(`/tag/${group.slug}/`));
  }
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
