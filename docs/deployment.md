# Deployment (Cloudflare Pages)

Site is pure static output (no SSR, no Pages Functions, no bindings) — Cloudflare Pages just serves `dist/` directly. No `@astrojs/cloudflare` adapter needed; that adapter is only for SSR mode.

## Files involved

- `wrangler.jsonc` — `pages_build_output_dir: "./dist"`, used by `wrangler pages deploy` for direct-upload deploys. Not required for Git-integration deploys (dashboard build settings are independent of this file) but kept for self-documentation and CLI parity.
- `.nvmrc` / `engines.node` in `package.json` — pin Node 20+ so Cloudflare's build image doesn't default to something older than Astro 7 needs.
- `public/_redirects` → copied to `dist/_redirects` by Astro's normal `public/` passthrough. Currently just `/ /hu/ 302` — a real edge redirect, so the root URL never round-trips through the client-side meta-refresh page. `src/pages/index.astro` (the meta-refresh fallback) is still there and still works for any host that doesn't honor `_redirects` (Vercel/Netlify have their own equivalents; plain `astro preview` doesn't process it at all, so the fallback matters there too).
- `public/_headers` → copied to `dist/_headers`. Long-lived immutable cache on `/_astro/*` (hashed build assets — safe to cache forever) and a shorter cache on `/covers/*` (content images that could be swapped out during re-curation, so not marked immutable).

## Git integration setup (recommended path)

Cloudflare dashboard → Workers & Pages → Create → connect this repo → build command `npm run build`, output directory `dist`. Framework auto-detection should recognize Astro and pre-fill these; verify rather than assume.

## Direct-upload path (no Git integration)

```bash
npm run build
npx wrangler pages deploy ./dist --project-name=neurodiverse
```

## Verifying before deploying

`npx wrangler pages dev ./dist` runs the actual Pages runtime locally (not just `astro preview`) — it parses `_redirects`/`_headers` for real and reports how many rules it accepted, which catches typos in those files before they reach production. Confirmed working: root 302s to `/hu/`, category/detail pages 200, `/covers/*` responses carry the expected `Cache-Control` header.

## Not needed here, but relevant if this ever changes

If a future feature needs a server (e.g. a contact form, an API route, agentic-curation write endpoint) that can't be static, that's when `@astrojs/cloudflare` and Pages Functions come in — at that point `astro.config.mjs` needs `output: 'server'` (or `'hybrid'`) and the adapter, and bindings (KV/D1/etc.) get declared in `wrangler.jsonc`. None of that exists yet; don't add it preemptively.
