# neurodiverse

Location-based directory of ADHD/autism resources. Hungary first (`hu` locale), UK/US reserved for later. Content is curated (manually now, agentically later) as markdown files — there is no database.

Read these before doing content or feature work:

- [docs/architecture.md](docs/architecture.md) — stack, schema, routing, generic fields (ratings, availability, entryType/parentTitle, coverImage, lat/lng)
- [docs/curation-methodology.md](docs/curation-methodology.md) — how to research and add real content: search patterns, verification, image sourcing, geocoding, honesty rules
- [docs/content-status.md](docs/content-status.md) — per-category coverage snapshot: what's real, what's still placeholder, rough completeness estimates
- [docs/gotchas.md](docs/gotchas.md) — environment/tooling traps hit this session (shell, fetch, third-party blocks)
- [docs/deployment.md](docs/deployment.md) — Cloudflare Pages setup, build config, how to verify a deploy locally before shipping

## Quick facts

- **Stack**: Astro 7 + Tailwind v4 + content collections (Zod schemas in `src/content.config.ts`). No DB, no auth, static build — **one exception**: the `/chat` assistant uses a single Cloudflare Pages Function (`functions/api/chat.ts`) that proxies to Ollama Cloud (see `docs/architecture.md` "Chat assistant"). Everything else is static.
- **Routes**: `/hu/` → `/hu/<category>/` (listing, topic filter, map if geo-tagged) → `/hu/<category>/<slug>/` (detail).
- **Categories today**: books, podcasts, videos, influencers, equipment, food, communities, diagnosis, schools. Check `docs/content-status.md` for which are real vs. still MVP placeholder.
- **Dev**: `npm run dev` (localhost:4321). Build: `npm run build`. Both run `scripts/build-db.mjs` first (`predev`/`prebuild`) to regenerate the committed dataset. Always rebuild after schema or content changes to catch Zod validation errors before reporting done.
- **Data layer**: the whole content set is serialized to `public/db/content.json` (served at `/db/content.json`, committed as an open-source database) and navigation uses Astro View Transitions — see `docs/architecture.md` "Client-side data layer & navigation". Regenerate the JSON with `npm run build:db`; don't hand-edit it.
- **Deploy target**: Cloudflare Pages, static output — see `docs/deployment.md`.
- **Do not fabricate data.** Every rating, price, address, and link in this repo is meant to be real and checked. If you can't verify something, leave the field empty/omitted rather than inventing a plausible-looking value — see curation-methodology.md.

## Keep the docs current

The four files above are load-bearing, not a one-time snapshot. Whenever a session changes what they describe, update them in the same session, before finishing:

- New requirement, decision, or direction from the user → `CLAUDE.md` and/or the relevant `docs/*.md`.
- New category, schema field, route, or component → `docs/architecture.md`.
- New research technique, source, or a source that turned out to be unusable → `docs/curation-methodology.md`.
- Content added/redone in a category, or a new estimate of how complete a category is → `docs/content-status.md`.
- Any environment/tooling trap that cost time to figure out → `docs/gotchas.md`.
- Any change to build/deploy config, hosting target, or adapter → `docs/deployment.md`.

Stale docs are worse than no docs — they send the next agent confidently down a wrong path. Treat them as part of the deliverable for any nontrivial change, the same way you'd update a schema or rebuild after a content edit.
