import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const blog=defineCollection({loader:glob({pattern:'**/*.{md,mdx}',base:'./src/content/blog'}),schema:z.object({title:z.string(),description:z.string(),date:z.coerce.date(),updated:z.coerce.date().optional(),category:z.string(),tags:z.array(z.string()).default([]),lang:z.enum(['en','ar']).default('en'),draft:z.boolean().default(false),featured:z.boolean().default(false),cover:z.string().optional(),videos:z.array(z.object({title:z.string(),url:z.string()})).default([])})});
const projects=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/projects'}),schema:z.object({title:z.string(),description:z.string(),stack:z.array(z.string()).default([]),lang:z.enum(['en','ar']).default('en'),demo:z.string().url().optional(),repository:z.string().url().optional()})});
export const collections={blog,projects};
