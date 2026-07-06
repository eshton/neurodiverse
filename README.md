# Neuropont

A curated, location-aware directory of **ADHD & autism resources in Hungary** — clinics, schools, therapists, communities, equipment, books, podcasts, videos, films, articles, and research, each manually verified from public sources.

Hungary first (`hu` locale); UK/US are reserved for later. There is **no database** — content lives as markdown files and git is the datastore, which is what makes both manual curation and future agentic curation (an agent opens a PR adding a markdown file) work the same way.

## Three ways to browse

- **Map** (`/map`) — every geo-tagged provider (diagnosis, schools, development, communities, equipment) on one map, filterable by type and age group.
- **Web** (`/web/<category>`) — a browsable grid for the non-map categories (books, podcasts, videos, movies, articles, research, food, equipment).
- **Chat** (`/chat`) — a conversational surface (preview; backend integration planned).

The whole content set is also serialized to [`/db/content.json`](public/db/content.json) and committed, so it doubles as an **open dataset**.

## Stack

- [Astro](https://astro.build) 7, static output
- Tailwind CSS v4 (CSS-first `@theme` config)
- Astro content collections with Zod schemas ([`src/content.config.ts`](src/content.config.ts))
- Google Maps JS API for the map surface
- Hosted on Cloudflare Pages

## Develop

```bash
npm install
npm run dev      # localhost:4321
npm run build    # static build into dist/
```

Both `dev` and `build` run `scripts/build-db.mjs` first (`predev`/`prebuild`) to regenerate the committed `public/db/content.json` from the markdown, so it can't silently drift. Regenerate it on its own with `npm run build:db`. Always rebuild after a schema or content change to catch Zod validation errors.

The map needs a `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` (see [`docs/deployment.md`](docs/deployment.md)); the rest of the site builds and runs without it.

## Content principle

**Nothing is fabricated.** Every rating, price, address, and link is meant to be real and checked against its source. If a value can't be verified, the field is left empty rather than filled with a plausible-looking guess.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — stack, schema, routing, components
- [`docs/curation-methodology.md`](docs/curation-methodology.md) — how content is researched, verified, and added
- [`docs/content-status.md`](docs/content-status.md) — per-category coverage
- [`docs/deployment.md`](docs/deployment.md) — Cloudflare Pages setup
- [`docs/gotchas.md`](docs/gotchas.md) — environment/tooling traps
</content>
</invoke>
