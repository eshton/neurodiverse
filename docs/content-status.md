# Content status (as of 2026-07-04)

Snapshot of what's real vs. placeholder per category. Update this file when you materially change a category's coverage — it exists so the next agent doesn't re-research something already done, or mistake stale placeholder data for real content.

| Category | Count | Status |
|---|---|---|
| books | 13 | Real. 4 ADHD + others autism-focused, all with verified ISBN/price/publisher/purchase link from libri.hu/bookline.hu/flaccus.hu/lira.hu. One (`hat-ezert-ugralok.md`, Hungarian edition of *The Reason I Jump*) is real but flagged `availability: unavailable` — no purchasable copy found anywhere, new or used, as of last check. |
| podcasts | 7 | Real. 4 dedicated shows (`entryType: full`) + 3 one-off episodes from general-purpose shows (`entryType: episode`). Two shows have real Apple Podcasts ratings (both 5/5, n=4 — small-sample, flagged in the rating's `note`). Spotify-only shows have no rating (Spotify doesn't expose one). |
| videos | 15 | Real. 5 dedicated channels/series + 10 one-off episodes. `viewCount`/`subscriberCount` populated where scraped. This category has the deepest bench of unresearched candidates left if returning to it — see below. |
| influencers | 2 | **Still placeholder from the original MVP seed.** `sourceUrl` fields point at `example.com`, `creator`/`handle` are literally `"seed placeholder creator"` / fake handles. Not yet redone with real research — do that before treating this category as trustworthy. |
| equipment | 2 | **Still placeholder**, same as influencers — `example.com` links, fabricated price ranges. |
| food | 2 | **Still placeholder**, same pattern. |
| communities | 2 | **Still placeholder**, same pattern. Note: this category has the same `city` field shape as diagnosis/schools — a natural next candidate for the map treatment once real, addressable entries replace the placeholders. |
| diagnosis | 28 | Real, geocoded, on the map. 17 cities. State/free (county hospital child-psychiatry departments — close to nationally complete, roughly one per county), foundation (Vadaskert, Autizmus Alapítvány, MARS Alapítvány×2), and a meaningful slice of Budapest private practices. Rough estimate of the realistic national total for distinct addressable ADHD/autism diagnosis providers is 60-100 (see reasoning below) — so this is roughly a third of the way there, weighted toward the well-documented institutional layer. |
| schools | 0 | Category scaffolded (schema, routing, homepage card, map wiring) but intentionally empty — "curate later." |

## Diagnosis: how the ~60-100 estimate was reached

Two separate institution types exist in Hungary, worth keeping distinct if this gets built out further:

1. **Medical diagnosis providers** (what this category models) — auti.hu's own directory lists ~20 autism-specific providers across 14 cities; ADHD Terápia's list shows ~8-10 state-supported ADHD sites. Neither list is exhaustive of private practices, which don't sit on any single registry — every search round this session surfaced several more (Panoráma Poliklinika, Soulwell, MENTA Szeged, Rovienne, CMed, PszichoFészek, Zöld Alma, Meteo Klinika, adhdautizmus.hu — the last of which was skipped for lack of a street address, only district-level location given). 60-100 is a rough synthesis of "state layer is ~20-30 and largely captured" + "private layer is a long uncounted tail, plausibly another 40-70."
2. **Tanulási Képességet Vizsgáló Szakértői Bizottságok** — official state committees, legally mandated one per county (some bigger counties run two) → ~20-25 nationally, fixed and well-documented. This is a *different* institution type (school-accommodation/SNI classification, not clinical diagnosis) and is **not** represented in the current 28 entries at all. Worth adding as its own thing if the goal becomes genuinely exhaustive, since it's a clean, finite, addable list.

## Videos: unexplored leads from this session

Surfaced but not pursued (either lower confidence, non-Hungarian-made, or duplicate of a channel already counted) — worth a look if resuming this category:
- BBC's *Inside Our Autistic Minds* — foreign-made documentary, mentioned repeatedly in Hungarian search results (likely subtitled/discussed, not produced in Hungary) — skipped to keep this category HU-native.
- Another `ADHD Felbontásban` episode (Horváth Lilla) and the video version of an `ADHD Kalauz` episode — both would duplicate shows already counted at the show level in podcasts.
- Telex.hu's own YouTube channel almost certainly has ADHD/autism content somewhere in its catalog (their *articles* on the topic are extensive) but no specific video surfaced with a confirmable title — worth a targeted YouTube-channel search rather than general web search.
