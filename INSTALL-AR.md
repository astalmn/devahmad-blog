# DevAhmad v1.6 — Scheduled publishing (Asia/Gaza)

Upload the files preserving their exact paths to the main branch. Do NOT delete other files. The package is based on the previously uploaded v1.5 archive; if you changed the editor after that archive, merge changes rather than overwriting them.

- public/editor/index.html: new-article schedule field in Gaza time.
- functions/api/editor-publish.js: validates future ISO UTC scheduledAt and saves as draft.
- src/content.config.ts: recognizes scheduledAt.
- scripts/publish_scheduled.py: changes due scheduled drafts to published.
- .github/workflows/publish-scheduled.yml: runs every 5 minutes (best effort).

GitHub repository Settings > Actions > General > Workflow permissions: Read and write permissions. Cloudflare Pages must auto-deploy pushes to main, including commits from github-actions[bot]. Verify this with a manual workflow run after uploading a test article. GitHub cron can be delayed or skipped under load, and Cloudflare deploy adds delay. This is NOT guaranteed exact-time publishing.

Important: this package adds scheduling to the new-article form only. To reschedule/cancel existing articles, edit frontmatter in the existing raw Markdown editor: draft: true and scheduledAt: "2026-...Z" (UTC); to cancel, remove scheduledAt while keeping draft: true. Never set draft: false on a future scheduled article. Test first with a disposable article. Scheduled draft remains excluded from static pages because existing build filters draft: true.
