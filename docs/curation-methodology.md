# Curation methodology

This project's core value is that every entry is real and checkable. That constraint shapes the whole workflow below — it's slower than generating plausible-looking seed data, and that's the point.

## The rule

**Never fabricate a rating, price, address, phone number, or link.** If real data can't be found for a field, omit it (most fields are optional) or leave arrays empty (`ratings: []`, `retailerUrls: []`). A missing field is honest; a made-up one poisons the dataset in a way that's hard to catch later. Where a source's data is thin, weird, or has a caveat (a rating from a single reviewer, a clinic that stopped accepting new patients, a book that's out of print), say so explicitly rather than smoothing it over — see the `note` field on ratings, `priceNotes` on diagnosis, and the `availability`/`entryType` fields.

## Research workflow (per item)

1. **WebSearch** in Hungarian for the category + topic (e.g. `"ADHD podcast magyar Spotify"`, `"autizmus diagnózis felnőtt szakorvos klinika Budapest"`). Cast wide first, then follow specific names that recur across results — recurrence is a decent signal of relevance/legitimacy.
2. **Verify with a direct fetch**, don't trust search-result summaries alone for anything you're going to publish (price, ISBN, address, view count). Use `WebFetch` for a structured-data ask ("extract exact title, author, price in HUF, ISBN..."), or raw `curl` when you need something WebFetch's page-to-markdown conversion tends to drop (Open Graph meta tags, embedded JSON, HTML data attributes).
3. **Distinguish a dedicated entity from a one-off mention.** A podcast episode, a single YouTube video, or one article that happens to cover ADHD/autism is not the same as a show/channel dedicated to the topic. Model the former as `entryType: episode` with `parentTitle` set to the parent show/channel name (see architecture.md) — don't skip it, but don't conflate it with a `full` entry either. This came up constantly: most Hungarian ADHD/autism *video* coverage is one-off segments from general-purpose channels, not dedicated channels.
4. **Don't duplicate the same physical entity across two content files.** Two "different" clinics that turn out to share an address, phone number, and doctor (this happened with Zádory Rendelő / ADHD Központ) are one clinic under two brand names — keep one, drop the other, and mention the alias in the body text if it seems useful.
5. **Rebuild after every batch** (`npx astro build`) to catch Zod schema mismatches immediately, before they pile up.

## Where ratings actually exist (and where they don't)

Don't assume a 5-star rating exists just because the content type "should" have one — check per platform:

- **Books**: retailer pages (libri.hu, bookline.hu) sometimes show a customer star rating with a review count directly on the product page — grep/fetch for it. moly.hu is the real Hungarian Goodreads-equivalent for book ratings but **blocks automated fetches with a 403** (confirmed via both WebFetch and curl with a browser User-Agent) — could not get moly.hu data this session. If you find a way in, it's the better source; until then, retailer-page ratings are the fallback, and note the sample size when it's small (n=1 or n=4 is not a rating, it's an anecdote — say so in the `note` field).
- **Podcasts**: Spotify show pages no longer expose a public star rating on the page (confirmed by fetching og:* meta on multiple shows — none had one). Apple Podcasts pages do, embedded in an `aria-label="X out of 5, N ratings"` pattern inside an element with `data-testid="amp-rating__rating-count-text"` — grep for that pattern in raw HTML if the show has an Apple Podcasts listing.
- **Videos (YouTube)**: no public ratings at all (removed by YouTube years ago). The honest substitute is `viewCount` and `subscriberCount` (added to the videos schema for this reason) — scrape from the page's embedded JSON (`"viewCount":"12345"`) and the Hungarian-locale subscriber text (`"11,3 ezer feliratkozó"` / `"396 feliratkozó"` — not an English string, don't search for "subscribers").
- **Clinics**: no rating platform at all in practice. What's real and worth capturing instead: exact address (for the map), price (many Hungarian private clinics publish exact HUF prices per session), referral requirements, and current intake status (waitlists closing is common and worth flagging in `priceNotes`).
- **Communities**: no ratings. Facebook groups are the dominant form of ADHD/autism community in Hungary, but **their pages are login-walled** — WebFetch/curl only ever get Facebook's generic sign-in screen, never the group's name, description, or member count. So a FB-group entry can't be fully self-verified: confirm the group *exists* (real group ID in the URL, and ideally cited by a real secondary source — the `jovoido.hu` "legjobb Facebook csoportok" roundup and psychologists' own site link-outs both worked as such), take the member count from public search-result snippets, and say plainly in the entry body that the count is search-sourced and not fetch-verified. Screen communities on the honesty bar too: skip groups built on contested pseudoscience (a "cure autism"/anti-vaccine group, a Facilitated-Communication-centered group) the same way a contested influencer gets skipped — being a real, active group isn't enough if its premise fails the "real and checkable" spirit. Legitimate non-FB community forms found this session: long-running open web forums (`asperger.hu`), self-advocacy associations (AOSZ, AURA, AutiSpektrum), and physical community centers/clubs (Autikum, Autizmus Alapítvány Felnőtt Klub) — the latter are addressable and geocode like clinics.

## Food, recipes & supplements (the honesty bar is strictest here)

This category is a pseudoscience minefield — "cure autism" diets and megadose supplement protocols are everywhere in Hungarian search results — so it follows the same honesty screen as communities/influencers, applied harder. Rules that emerged seeding it (2026-07-05):

- **Supplements/vitamins: evidence-based only.** Only include a supplement where real research supports it, and state the *actual* evidence level in the body, never a cure claim. Concretely landed: omega-3 (RCT evidence, but it only helps kids with *low* blood levels and can worsen normal-level kids — say that) and vitamin D (correlational only — low D is *associated* with ADHD, not proven to cause or cure it). Frame all of them as "correct a documented deficiency, after testing, with a doctor," not "treats ADHD/autism."
- **Anchor supplement entries on a reputable evidence source, not a sales page.** `pharmaonline.hu` (professional pharma outlet) worked well; supplement *webshops* (anatur, netamin, biofitt, osimagnesium, zinzino/omega3-teszt — the last is MLM) were deliberately avoided as `sourceUrl`s because they mix real citations with marketing. Don't name a specific commercial brand as "the" product — quality/dose is individual; say "available at pharmacies, choose a reputable brand, consult a doctor."
- **The GFCF (glutén-/kazeinmentes) diet needs a dedicated *honest* entry, not silence.** Present the tension explicitly: systematic reviews show minimal/no effect and poor study quality (kiskanalkommando, pharma sources), yet some families and AOSZ's dietitian report subgroup improvement — and *every* serious source agrees it must be done under dietitian supervision (deficiency risk). AOSZ's "A diétához szakember kell" is the authoritative anchor. Do **not** use the pseudoscience sources this surfaces (szellemvilag.hu, ihu.legacy, "Soha többé Autizmus"-adjacent pages — same exclusion as the STA community).
- **Recipes: frame honestly.** Hungarian *ADHD/autism-specific* recipes barely exist. Don't relabel a generic recipe as an "ADHD recipe." Instead link a real, reputable recipe/collection and state plainly in the body *why* it's relevant (protein → steadier focus; make-ahead → less morning executive load; predictable texture → sensory-friendly) while making clear it's a general recipe, not a medical intervention.
- **Reputable HU sources found this round** (all fetch-verified, expert-authored): koraifejleszto.hu (Korai Fejlesztő Központ / Autizmus Alapítvány), kiskanalkommando.hu (gyermekdietetikus), aosz.hu, szafi-dietetikai-team.hu (dietitian team), pharmaonline.hu, 21napalatt.hu (recipes). These are good return-to sources for a second pass (covers, more recipes, iron/zinc/magnesium as their own honest entries).

## Cover images / photos

Self-host under `public/covers/`, don't hotlink. Sourcing pattern:

1. Try `curl -sA "Mozilla/5.0" <page-url> | grep -io 'og:image" content="[^"]*"'` — works for libri.hu, bookline.hu, most YouTube pages (after following redirects, see gotchas.md), Spotify show/episode pages, Apple Podcasts pages.
2. If that's empty, the image is probably lazy-loaded — grep for platform-specific patterns instead: WooCommerce sites use `wp-post-image` / `data-large_image="..."`, YouTube channel pages need `yt3.googleusercontent.com` avatar URLs (also via og:image, usually works), some CDNs serve `.jpg.webp` — check the actual bytes with `file -b` after downloading, don't trust the URL's stated extension (this happened: a `.jpg`-named URL was actually WebP; renamed to `.webp` after `file` caught it).
3. Download with the same browser User-Agent you used to fetch the page — some CDNs (Nominatim's own rules aside) reject bot-looking requests.
4. Reference as `/covers/<slug>.<ext>` in frontmatter, matching the content file's slug for easy pairing.

This is standard practice for any directory/review site (Goodreads, moly.hu, Amazon all do it) — small promotional thumbnails to identify what's being linked to, not redistribution of the underlying work.

**Movie posters**: the film's Wikipedia article `og:image` is the infobox poster — `curl -sL -A "Mozilla/5.0" <wiki-url> | grep -io '<meta property="og:image" content="[^"]*"'`. Reliable for most films. Watch for two mismatches: (1) a `fr`/other-language article may return a *logo* instead of a poster — check the English article (e.g. "The Specials" for *Hors normes*); (2) an article covering both a book and its film adaptation returns the *book* cover (happened with *The Reason I Jump*) — don't use it for a `kind: documentary`/film entry. If the article has no poster image at all (some older/smaller films), leave `coverImage` unset rather than hotlink an unverified image — several movie entries are intentionally cover-less for this reason (see content-status.md).

## Streaming availability (movies)

Check JustWatch Hungary via **WebFetch** on `https://www.justwatch.com/hu/film/<slug>` — it parses the page and returns the HU providers plus the Hungarian release title. Two gotchas: (1) slugs aren't guessable, and a 404 on a *guessed* slug means "wrong slug," not "unavailable" — find the real slug via a `justwatch.com` web search first (the `/us/movie/<slug>` slug matches the `/hu/film/<slug>` one). (2) A 404 on the *correct* slug does mean no HU catalog entry → honest `availability: unavailable`. Only set `in-stock` when the HU page actually lists a HU provider — never infer HU availability from the US/AU page a web search happens to surface.

## Geocoding (for map-enabled categories: diagnosis, schools)

Use the free Nominatim API (OpenStreetMap), no key required:

```bash
curl -s -A "neurodiverse-hu-map/1.0 (research contact: n/a)" \
  --get "https://nominatim.openstreetmap.org/search" \
  --data-urlencode "q=<street address>, <city>, Hungary" \
  --data-urlencode "format=json" \
  --data-urlencode "limit=1"
sleep 1.1   # Nominatim usage policy: max 1 request/second
```

Set a real, honest User-Agent (Nominatim's usage policy requires it, and blocks generic ones). If a full address with house number returns `[]`, retry with just the street name — Nominatim often can't resolve a specific building but resolves the street fine, which is precise enough for a city-scale map pin. Prefer results where `class`/`type` is `amenity`/`hospital`/`school` etc. (means it matched the actual institution, not just a nearby road) when there's a choice.

## Scope discipline

When a search round starts mostly resurfacing entries you already have, or things that fail the "real and checkable" bar (a book that's out of print with zero purchasable copies anywhere, a clinic address given only at district level with no street), that's the signal to stop that round — say so plainly rather than padding the count with weak entries. See content-status.md for where each category currently sits against its realistic total.
