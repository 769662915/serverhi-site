import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // Basic fields
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    coverImage: image(),
    coverImageAlt: z.string(),
    category: z.enum(['docker', 'linux', 'server-config', 'devops', 'security', 'troubleshooting']),
    tags: z.array(z.string()),
    author: z.string().default('ServerHi Editorial Team'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),

    // Server tutorial specific fields
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    estimatedTime: z.string().optional(), // e.g., "15 minutes"
    prerequisites: z.array(z.string()).optional(),
    osCompatibility: z.array(z.string()).optional(), // e.g., ["Ubuntu 22.04", "CentOS 8"]
  }),
});

export const collections = {
  posts: postsCollection,
};
