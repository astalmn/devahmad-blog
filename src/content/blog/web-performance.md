---
title: "Building Fast Content Websites with Astro"
description: "Use static rendering, optimized images and minimal JavaScript for fast websites."
date: 2026-09-21
category: "Web Development"
tags: ["astro", "web", "performance"]
lang: en
featured: false
---

## Ship less JavaScript
Static generation sends pre-rendered HTML and avoids unnecessary hydration for content-first websites.

## Optimize images
Serve appropriately sized images, specify width and height to prevent layout shift, and lazy-load offscreen assets.

## Measure real outcomes
Track Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout Shift. Test on representative mobile hardware.

## Example
```astro
---
const title = 'Fast by default';
---
<main><h1>{title}</h1></main>
```

## Further reading
Read the [web.dev performance guides](https://web.dev/learn/performance).
