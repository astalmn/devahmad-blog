import {defineConfig} from 'astro/config';import mdx from '@astrojs/mdx';import sitemap from '@astrojs/sitemap';
export default defineConfig({site:process.env.SITE_URL||'https://devahmad-blog.pages.dev',integrations:[mdx(),sitemap()],output:'static',trailingSlash:'always',markdown:{shikiConfig:{theme:'github-dark'}}});
