import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
export default defineConfig({site: process.env.SITE_URL || 'https://devahmad.pages.dev', integrations:[mdx(),sitemap(),tailwind()], output:'static', markdown:{shikiConfig:{theme:'github-dark'}}});
