# Deployment (Cloudflare Pages)

Site is pure static output (no SSR, no Pages Functions, no bindings) — Cloudflare Pages just serves `dist/` directly. No `@astrojs/cloudflare` adapter needed; that adapter is only for SSR mode.

## Files involved

- `wrangler.jsonc` — `pages_build_output_dir: "./dist"`, used by `wrangler pages deploy` for direct-upload deploys. Not required for Git-integration deploys (dashboard build settings are independent of this file) but kept for self-documentation and CLI parity.
- `.nvmrc` / `engines.node` in `package.json` — pin Node 20+ so Cloudflare's build image doesn't default to something older than Astro 7 needs.
- `public/_redirects` → copied to `dist/_redirects` by Astro's normal `public/` passthrough. **Currently empty of rules** — the old `/ /hu/ 302` redirect was removed when `/` became the real map-first homepage (`src/pages/index.astro` now renders `MapExplorer`, not a meta-refresh redirect — see architecture.md). The file is kept in place for any future edge-redirect needs. If a `/`-level redirect is ever reintroduced, this is where it goes.
- `public/_headers` → copied to `dist/_headers`. Long-lived immutable cache on `/_astro/*` (hashed build assets — safe to cache forever) and a shorter cache on `/covers/*` (content images that could be swapped out during re-curation, so not marked immutable).
- `.env` (gitignored, `.env.example` committed as the template) — `PUBLIC_GOOGLE_MAPS_API_KEY` for the map on diagnosis/schools/development. Only covers local `astro dev`/`astro build` runs; **the Cloudflare Pages project needs this same variable set in its own dashboard environment variables**, or every production build ships a map with no key and the JS API calls fail at runtime (there's no build-time error for a missing client env var, it just silently doesn't work in the browser — check the browser console, not the build log, if the map goes blank after a deploy).

## Git integration setup (recommended path)

Cloudflare dashboard → Workers & Pages → Create → connect this repo → build command `npm run build`, output directory `dist`. Framework auto-detection should recognize Astro and pre-fill these; verify rather than assume. Under Settings → Environment Variables, add `PUBLIC_GOOGLE_MAPS_API_KEY` (same value as local `.env`) for both Production and Preview — a Git-integration deploy without it builds fine but ships a broken map.

## Direct-upload path (no Git integration)

```bash
npm run build
npx wrangler pages deploy ./dist --project-name=neurodiverse
```

## Verifying before deploying

`npx wrangler pages dev ./dist` runs the actual Pages runtime locally (not just `astro preview`) — it parses `_redirects`/`_headers` for real and reports how many rules it accepted, which catches typos in those files before they reach production. Confirmed working: root (`/`) serves the map homepage 200, category/detail pages 200, `/covers/*` responses carry the expected `Cache-Control` header.

## Not needed here, but relevant if this ever changes

If a future feature needs a server (e.g. a contact form, an API route, agentic-curation write endpoint) that can't be static, that's when `@astrojs/cloudflare` and Pages Functions come in — at that point `astro.config.mjs` needs `output: 'server'` (or `'hybrid'`) and the adapter, and bindings (KV/D1/etc.) get declared in `wrangler.jsonc`. None of that exists yet; don't add it preemptively.
