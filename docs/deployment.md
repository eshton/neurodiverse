# Deployment (Cloudflare Pages)

Site is static output served from `dist/`, **plus one Cloudflare Pages Function** for the chat assistant (`functions/api/chat.ts` → `/api/chat`). No `@astrojs/cloudflare` adapter is needed — Astro still builds fully static output; Pages Functions live in the top-level `functions/` directory and are deployed alongside `dist/` automatically by Cloudflare (both the dashboard Git build and `wrangler pages deploy` pick up `functions/` on their own). The function is a thin proxy to Ollama Cloud that hides the API key (see docs/architecture.md "Chat assistant").

## Files involved

- `wrangler.jsonc` — `pages_build_output_dir: "./dist"`, used by `wrangler pages deploy` for direct-upload deploys. Not required for Git-integration deploys (dashboard build settings are independent of this file) but kept for self-documentation and CLI parity.
- `.nvmrc` / `engines.node` in `package.json` — pin Node 20+ so Cloudflare's build image doesn't default to something older than Astro 7 needs.
- `public/_redirects` → copied to `dist/_redirects` by Astro's normal `public/` passthrough. **Currently empty of rules** — the old `/ /hu/ 302` redirect was removed when `/` became the real map-first homepage (`src/pages/index.astro` now renders `MapExplorer`, not a meta-refresh redirect — see architecture.md). The file is kept in place for any future edge-redirect needs. If a `/`-level redirect is ever reintroduced, this is where it goes.
- `public/_headers` → copied to `dist/_headers`. Long-lived immutable cache on `/_astro/*` (hashed build assets — safe to cache forever) and a shorter cache on `/covers/*` (content images that could be swapped out during re-curation, so not marked immutable).
- `.env` (gitignored, `.env.example` committed as the template) — `PUBLIC_GOOGLE_MAPS_API_KEY` for the map on diagnosis/schools/development. Only covers local `astro dev`/`astro build` runs; **the Cloudflare Pages project needs this same variable set in its own dashboard environment variables**, or every production build ships a map with no key and the JS API calls fail at runtime (there's no build-time error for a missing client env var, it just silently doesn't work in the browser — check the browser console, not the build log, if the map goes blank after a deploy).
- `SITE_URL` — the production origin, read in `astro.config.mjs` (`process.env.SITE_URL`) to set Astro's `site`. Drives canonical URLs, Open Graph tags, the sitemap (`/sitemap-index.xml`), and `/robots.txt`. **Set this in the Cloudflare Pages project env vars to the real domain** (e.g. `https://neurodiverz.hu`); the fallback is a placeholder `*.pages.dev` subdomain, and a wrong value ships wrong canonical/sitemap URLs (actively harmful for SEO — worse than none). Not a `PUBLIC_` var: it's only used at build time in the config, never in client code. Unlike `PUBLIC_*` vars, `process.env` in `astro.config.mjs` isn't populated from `.env` automatically — set it in the shell for local builds (`SITE_URL=... npm run build`) if you need non-placeholder URLs locally.
- `OLLAMA_API_KEY` — **secret** for the `/chat` assistant, read at runtime by the `functions/api/chat.ts` Pages Function via its `env` binding (NOT `PUBLIC_`, NOT a build-time var — it's a per-request server secret). Create one at https://ollama.com/settings/keys. **Set it in the Cloudflare Pages project env vars** (Production + Preview) or `/chat` returns a graceful "not configured" error. Optional `OLLAMA_MODEL` overrides the default `gpt-oss:120b-cloud`. Pages Functions read `env` bindings, not `.env` — for local dev, `wrangler pages dev` loads a `.env` / `--binding`; a plain `npm run dev` (Astro) does not run the function at all (the chat page will get a network error against `/api/chat`), so test chat with `wrangler pages dev ./dist` after a build.

## Chat assistant function (`functions/api/chat.ts`)

The only server-side code. Cloudflare auto-detects the top-level `functions/` directory — no config in `astro.config.mjs` or `wrangler.jsonc` is required for it to deploy. It reads `OLLAMA_API_KEY`/`OLLAMA_MODEL` from the function `env` and proxies to Ollama Cloud. **Test locally with the real Pages runtime:**

```bash
npm run build
OLLAMA_API_KEY=<key> npx wrangler pages dev ./dist   # serves dist/ AND functions/
```

`astro dev` alone will NOT serve `/api/chat` (Astro doesn't run Pages Functions), so the chat page can only be exercised end-to-end under `wrangler pages dev` (or a real deploy).

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

Server-side needs so far are met by a **standalone Pages Function** (`functions/api/chat.ts`) — that's independent of Astro and needs no adapter. The `@astrojs/cloudflare` adapter + `output: 'server'` is a *different* thing, only needed if an **Astro page/route itself** must be server-rendered (e.g. per-request HTML, a form POST handled by an Astro endpoint). That still isn't used, and shouldn't be added preemptively: prefer another isolated Pages Function under `functions/` for a new API endpoint. Bindings (KV/D1/etc.) would get declared in `wrangler.jsonc` if a function ever needs them; none do today.
