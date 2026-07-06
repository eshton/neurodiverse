# Proposal: full DB + backend curation platform (the heavyweight option)

**Status:** option on the table, not recommended unless a threshold below is crossed · **Companion doc:** [curation-cms-lite.md](curation-cms-lite.md) (the lightweight alternative)

This documents what a "real backend" curation rewrite would look like, honestly, so it can be chosen deliberately. For most collaborative-curation needs the lightweight git-backed CMS (companion doc) is the better fit and keeps the current architecture. Choose **this** path only if one of the thresholds below is genuinely true.

## When this is actually justified

Pick this only if you hit one of these — a small volunteer curation team hits none of them:

- **Real-time collaborative editing** — multiple people editing the same entry simultaneously, Google-Docs style.
- **Contributors who can't have GitHub identities** and you can't provision them (git-backed CMSs authenticate via GitHub).
- **Edit velocity a static rebuild can't keep up with** — thousands of edits/day, or edits that must appear in seconds without a build. (Today a build is ~2s + deploy.)
- **Permissions/workflow beyond PR review + CODEOWNERS** — per-field access control, multi-stage moderation queues, role hierarchies, scheduled publishing.
- **Runtime server-side querying** the client can't do — already established the ~200-item dataset doesn't need this.

If none hold, stop here and read the companion doc.

## What you would give up (be honest about this)

The current git-as-datastore model provides, for free, things a DB rewrite must re-implement or sacrifice:

- **Review/approval, history, attribution, rollback** — all native to git/PRs today; a DB admin app has to rebuild them.
- **The agentic-curation roadmap** — agents opening reviewable PRs only works while the source of truth is git. A database **breaks** this; an agent can't open a diff you review against a Postgres row.
- **The open-source `content.json` database** — currently a committed, forkable artifact. Recoverable in this model only by exporting the DB back to a file on a schedule.
- **Airtight privacy story** — `adatvedelem.astro` currently promises no accounts/analytics/server-stored data. The moment you store editor accounts and content in a DB you become a GDPR **data controller** with the attendant obligations; the privacy page must be rewritten.
- **$0, zero-ops hosting** — static on Cloudflare Pages is free and maintenance-free. This path adds a server, a database (backups, migrations), and an auth surface to secure and patch.

What you gain: real-time/多-editor editing, non-GitHub contributors, instant publish, and rich permissions/workflow.

## Architecture

Two sub-variants — pick based on whether you can tolerate build-to-publish latency:

### Variant A — DB-authored, statically delivered (recommended if you must go DB)

The database is the **editing** store; the public site stays **static**. A build (triggered by a webhook on save) reads the DB, regenerates content, and deploys. Keeps static delivery, SEO, and the open-source-db property; adds DB + admin + auth only for editing.

```
Editors → Admin UI (auth) → API → Database
                                     │  on save: webhook →
                                     ▼
                          build: DB → content.json + static pages → deploy (CF Pages)
```

- **Pro:** public site keeps every performance/SEO/privacy property; visitors still hit static HTML.
- **Con:** an edit goes live only after a rebuild (seconds–minutes; automatable). Not real-time.

### Variant B — fully dynamic SSR

Pages render from the DB at request time; edits appear instantly.

- **Pro:** instant publish, true real-time.
- **Con:** sacrifices static delivery; needs SSR hosting + a caching layer (edge cache/ISR) to not hammer the DB; visitors' requests now touch your server. Only worth it if "instant" is a hard requirement.

## Concrete stack (Cloudflare-aligned, since deploy is already CF Pages)

| Concern | Choice | Notes |
|---|---|---|
| Rendering | Astro `output: 'server'` (or `'hybrid'`) + `@astrojs/cloudflare` adapter | `astro.config.mjs` change + adapter install; keep static routes static in hybrid |
| Database | **Cloudflare D1** (SQLite) | Native to CF; declared as a binding in `wrangler.jsonc`. Postgres (Neon/Supabase) only if relational complexity grows |
| Schema/ORM | Drizzle ORM | TypeScript schema mirrors the current Zod `content.config.ts`; reuse Zod for input validation at the API boundary |
| Auth | Lucia or Auth.js (self-host) — or Clerk/Auth0 (hosted) | Roles: admin / editor / reviewer. Hosted providers cut security surface but add a dependency + cost |
| Images (covers) | **Cloudflare R2** object storage | Replaces committing images to `public/covers`; store the URL in the DB |
| Admin dashboard | Astro route(s) behind auth, forms as a React/Svelte island; or a separate small SPA | CRUD against the API; reuse the Zod schema for client + server validation |
| Geocoding | Server-side call to Nominatim on save (respect 1 req/s + real UA) | Currently a manual authoring-time step; can be automated here |

## Migration plan (rough, weeks not days)

1. **Model the schema in the DB** — translate each Zod collection in `content.config.ts` into Drizzle tables (a shared `base` table + per-category columns, or a single table with a JSON column for category-specific fields). Keep Zod as the validation layer.
2. **Import existing content** — a one-off script: read every `src/content/**/*.md` (reuse `scripts/build-db.mjs`'s parsing) → insert rows. Upload existing `public/covers/*` to R2, rewrite `coverImage` to R2 URLs.
3. **Build the API** — authenticated CRUD endpoints (Astro API routes / Pages Functions), Zod-validated, with role checks and an audit log table (to recover the history/attribution you lost from git).
4. **Build the admin UI** — auth-gated forms per category (mirror the schema; enum dropdowns for `topics`/`kind`/`providerType`, map picker for `lat`/`lng`, image upload to R2). A review/approve state column if you need moderation.
5. **Wire delivery** — Variant A: a build step that queries D1 → emits `content.json` + static pages, triggered by a save webhook. Variant B: SSR pages read D1 directly + edge caching.
6. **Deploy config** — add D1 + R2 bindings to `wrangler.jsonc`; set auth secrets in CF env; update `docs/deployment.md`.
7. **Rewrite `adatvedelem.astro`** — disclose accounts, stored data, and the legal basis; add the data-controller obligations.

## Keeping the good parts even here

- **Preserve the open-source DB** — schedule a D1 → `content.json` export committed back to the repo, so the forkable dataset survives.
- **Preserve static delivery** — prefer Variant A; only go SSR if "instant publish" is non-negotiable.
- **Preserve agentic curation** — if you still want agents contributing, have them write through the same API (with an agent role) rather than to git; you lose the reviewable-PR property but keep a single write path.

## Effort & cost

- **Effort:** multiple weeks (schema modelling, import, API, auth, admin UI, delivery wiring, privacy/legal update, testing).
- **Ongoing:** DB backups, dependency/security patching for auth, GDPR compliance, CF D1/R2 usage costs (small at this scale but no longer $0), and the maintenance of a bespoke admin app.

## Recommendation

Don't take this path to *add collaborators* — that's what the companion doc's git-backed CMS is for, at a fraction of the cost and with none of the sacrifices. Take this path only when a genuine threshold above forces it, and even then prefer **Variant A** to keep the public site static and the dataset open.
