# Proposal: client-side data layer for instant, refresh-free interactivity

**Status:** proposed · **Date:** 2026-07-05

## Goal

Make the site feel like an app — instant filtering/search and refresh-free item
navigation — without abandoning the static architecture. The motivation is UX
("feels dated"), **not** new dynamic data.

## Decision

**Do not rewrite to an SPA, and do not add a runtime backend.** A runtime query
(even a lightweight Cloudflare Worker holding JSON in memory) computes the same
answer a build step already bakes, adds latency plus a moving part, and does
nothing for the UX goal. Content only changes at deploy time (git-as-datastore),
so everything is knowable at build time.

Instead: build a **client-side data layer over the existing static site**. Ship
the dataset to the browser and do all interaction locally. The "backend" is a
static JSON file the CDN serves and the client queries in memory.

## What to preserve (non-negotiable)

- **Per-resource static HTML pages stay.** They are the SEO surface (people find
  this by Googling "ADHD diagnózis Budapest") and support direct links / no-JS.
  Do not client-render these away.
- Privacy story (no accounts/analytics/cookies), $0 static hosting, and the
  git-as-datastore + agentic-curation roadmap all remain intact.

## Design

Two-tier data model to keep the payload small:

- **Index** — per item: `title`, `summary`, `category`, `topics`, `tags`,
  `ageGroup`, geo, `coverImage`, slug/href. Roughly **50–80 KB gzipped** across
  ~140 items. Shipped/loaded once, held in memory, powers listing / map / grid /
  filter / search — all instant.
- **Bodies** — the long-form markdown detail. Loaded on demand when an item
  opens, **not** shipped upfront.

Build-time output:

- `/api/index.json` — static JSON index of all items (Astro `GET` endpoint,
  regenerates on every content commit).
- `/hu/<cat>/<slug>/` — per-item static HTML pages, unchanged.

Client:

- Load `/api/index.json` once, hold in memory.
- Listing / map / grid / search / filter render from it client-side.
  `MapExplorer` / `WebExplorer` already filter client-side — this centralizes the
  dataset they share.
- Open an item without a refresh via one of two approaches (decide when
  building):
  - **View Transitions** (`<ClientRouter/>`): smooth navigation to the real
    static page, prefetched on hover. ~half-day baseline.
  - **Slide-over panel** from the in-memory index + lazy body-fetch, URL updated
    via the History API to the real static page (so refresh/share still loads
    static HTML). Most app-like.

## Suggested implementation order

1. Emit `/api/index.json` at build + a small client module that loads it once.
2. Add `<ClientRouter/>` + prefetch (`prefetch: { prefetchAll: true,
   defaultStrategy: 'hover' }` in `astro.config.mjs`). Migrate inline scripts
   (`MapExplorer`, `WebExplorer`, `ClinicMap`, the dark-mode/localStorage
   snippets) from `DOMContentLoaded` to the `astro:page-load` event —
   `ClientRouter` does **not** re-fire `DOMContentLoaded` on client-side nav, so
   the map won't re-init otherwise. This is the main migration cost.
3. Optional: slide-over detail panel driven by the in-memory index. Lets us drop
   the current "popups open in a new tab" workaround (added specifically to avoid
   tearing down map state) and use `transition:persist` to keep the map alive
   across navigation.

## Revisit a real backend only if

Any of these becomes true (none are today):

- Data changes independently of deploys (e.g. live clinic availability).
- The index outgrows the client (thousands of items — currently ~2 orders of
  magnitude away).
- A query needs a server-side secret (the Maps key is public/domain-restricted,
  so it doesn't count).
- Per-user / write features (accounts, submissions).

Then: Astro hybrid mode + a single Cloudflare Pages Function — **not** a full SPA.

## Docs to update when this lands

- `docs/architecture.md` — the new `/api/index.json` endpoint, the client data
  layer, View Transitions, and the script-init change.
- `docs/gotchas.md` — `astro:page-load` vs `DOMContentLoaded` under
  `ClientRouter`.
