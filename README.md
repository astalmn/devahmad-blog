# DevAhmad — Personal Technology Blog

A bilingual (English/Arabic) static technology blog built with Astro 5, TypeScript, Tailwind CSS and Markdown/MDX. The supplied profile and cover images are included in `public/assets/`.

## Architecture

- `src/layouts/Base.astro`: shared SEO, accessible navigation and footer.
- `src/pages/[lang]/`: localized pages and dynamic static routes.
- `src/content/blog/`: Git-managed Markdown and MDX articles.
- `src/content/projects/`: project concepts and later real projects.
- `src/content.config.ts`: typed content schemas.
- `src/lib/site.ts`: personal details, social URLs, UI strings.
- `public/assets/`: provided profile and hero images.
- `public/_headers`: security headers for Cloudflare Pages.
- `.github/workflows/ci.yml`: automated checks on main and PRs.

## Requirements and installation

Node.js 22 and npm. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:4321`. Production checks:

```bash
npm run lint
npm run check
npm run build
npm run preview
```

> The project was generated in an offline environment where npm packages could not be fetched. Run the commands above in a network-connected environment and resolve any dependency updates before production deployment. A lockfile is not included; commit the generated `package-lock.json` after running `npm install` so GitHub Actions can use `npm ci`.

## Customize your identity

1. Edit `src/lib/site.ts` and replace the empty `email`, `github`, `linkedin`, `youtube`, `instagram` values with real URLs. Empty values are intentionally not rendered.
2. Edit `src/pages/[lang]/[page].astro` with verified qualifications, experience, bio and legal/privacy details. Do not claim that sample project concepts are completed work.
3. Replace `public/assets/cover.png` and `public/assets/profile.png` if desired. Current assets are the provided images, 1536×614 and 1536×1536 respectively.
4. Edit `site` in `astro.config.mjs` or set `SITE_URL` at build time if your actual pages.dev subdomain differs. Canonical links and sitemap depend on this value.
5. The default language is English. Add translations for further content as separate Markdown entries with `lang: ar`.

## Publish articles in VS Code

1. Create `src/content/blog/my-new-article.md` (or `.mdx`).
2. Add valid frontmatter:

```yaml
---
title: "Your real article title"
description: "A concise summary"
date: 2026-09-24
category: "Web Development"
tags: [astro, typescript]
lang: en
draft: false
---
```

3. Write Markdown content; save and preview with `npm run dev`.
4. Commit and push to `main`. Cloudflare Pages redeploys when Git integration is connected.

## Deploy to Cloudflare Pages (free tier)

1. Push this repository to GitHub, including `package-lock.json`.
2. In Cloudflare dashboard: Workers & Pages → Create → Pages → Connect to Git → select repository and main branch.
3. Framework preset: **Astro**; build command: `npm run build`; output directory: `dist`; set `NODE_VERSION=22` if needed.
4. Set environment variable `SITE_URL=https://YOUR-REAL-SUBDOMAIN.pages.dev` if the actual project name differs from `devahmad`.
5. Deploy and open the generated `*.pages.dev` URL. Cloudflare manages HTTPS and builds on new commits.
6. Confirm canonical URLs, sitemap and RSS use your real URL. Do not purchase a domain unless you choose to.

Cloudflare free plan, GitHub Actions and other services have usage and rate limits. Check their current terms before scaling. A custom domain is optional and may cost money. This website has no database, paid APIs, external fonts or form backend.

## QA checklist

- [ ] `npm run lint`, `npm run check`, `npm run build` all succeed.
- [ ] Open English and Arabic pages on mobile and desktop; verify RTL.
- [ ] Verify article search, category filter, date sort and pagination.
- [ ] Check article slugs, headings, TOC, code copy and social sharing.
- [ ] Replace empty contact/social URLs and example project concepts with real details.
- [ ] Verify `robots.txt`, `sitemap-index.xml`, `rss.xml` and canonical URLs.
- [ ] Run Lighthouse on representative mobile and desktop connections.
- [ ] Test keyboard navigation, contrast, zoom and reduced motion.
- [ ] Review privacy policy and Cloudflare Pages security headers.
- [ ] Verify a push to `main` triggers successful Cloudflare deployment.

Official references: https://docs.astro.build/ ; https://developers.cloudflare.com/pages/ ; https://docs.github.com/en/actions

Deployment update: DevAhmad build fix.
Deployment verification: September 24, 2026.
