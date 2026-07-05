# Architecture

## Stack

Astro 7, static output. Tailwind v4 (CSS-first config, `@theme` tokens in `src/styles/global.css`, `@custom-variant dark` for class-based dark mode toggled via `localStorage` + a button in the layout). Content lives as markdown files under `src/content/<category>/<locale>/*.md`, typed via Astro content collections (`src/content.config.ts`). No database — git is the datastore, which is what makes both manual curation and future agentic curation (an agent opens a PR adding/editing a markdown file) work the same way.

Map feature (diagnosis/schools) uses Leaflet + OpenStreetMap tiles — free, no API key, no billing risk. Geocoding for lat/lng is done once at content-authoring time via the Nominatim API (see curation-methodology.md), not at runtime.

## Content model

`src/content.config.ts` defines a `base` Zod schema shared by every category, then extends it per category with category-specific fields via `collectionFor(category, extraFields)`.

### Base fields (every item, every category)

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `locale` | `hu \| uk \| us` | Only `hu` has content. Locale is a data dimension, not Astro's built-in i18n routing — adding UK/US later is just adding content files with `locale: uk`/`us` and activating those routes, no schema change. |
| `topics` | array of `adhd \| autism` | min 1. Items can be tagged both. |
| `summary` | string | |
| `tags` | string array | free-form, default `[]` |
| `sourceUrl` | URL | canonical link to the actual thing (purchase page, show page, video, clinic homepage) |
| `coverImage` | string, optional | path under `/covers/`, e.g. `/covers/szetszortsag.jpg`. Self-hosted, not hotlinked — see curation-methodology.md |
| `ratings` | array of `{source, score, scale, url?, note?, checkedAt}` | generic — no aggregation/weighting logic exists yet. Empty array is fine and expected when no real rating exists for that content type (see below). |
| `availability` | `in-stock \| unavailable`, default `in-stock` | for retail-style items (books) going out of print/stock. Don't repurpose this for clinic intake status — use `priceNotes` free text instead (see diagnosis). |
| `entryType` | `full \| episode`, default `full` | `episode` = a one-off piece of content from a channel/show that isn't itself dedicated to ADHD/autism (e.g. one Partizán Podcast episode). `full` = the whole show/channel/book/clinic is the entity. |
| `parentTitle` | string, optional | required alongside `entryType: episode` — the name of the parent show/channel, rendered as a badge on both listing and detail pages. |
| `curatedBy` | `manual \| agent`, default `manual` | not yet used by any actual agent pipeline, but the field exists for when one lands. |
| `lastReviewed` | date | when the entry's data was last checked against its source. Always set this to the date you actually verified it, not the file-creation date. |

### Category-specific fields

- **books**: `author`, `isbn?`
- **podcasts**: `creator`, `platform`, `episodeCount?`
- **videos**: `creator`, `platform`, `viewCount?`, `subscriberCount?` — YouTube has no public star ratings anymore, so view/subscriber counts are the honest substitute; they live here, not in `ratings`.
- **influencers**: `handle`, `platforms` (array, min 1)
- **equipment**: `priceRange?`, `retailerUrls` (array, default `[]`)
- **food**: `kind` (`recipe \| product`), `dietaryTags` (default `[]`)
- **communities**: `providerType` (`group-therapy \| therapist \| institution`), `city`, `contact?`
- **diagnosis**: `providerType` (`doctor \| clinic \| foundation \| hospital`), `city`, `address?`, `lat?`, `lng?`, `contact?`, `priceNotes?`
- **schools**: same shape as diagnosis, `providerType` is `mainstream-integration \| special-needs-school \| kindergarten` instead.
- **development**: therapists/psychologists/centers doing ongoing developmental/therapeutic work (ABA, sensory integration, skills groups, gyógypedagógia) — distinct from `diagnosis` (getting diagnosed) and `communities` (peer support groups/institutions). Same geo shape as diagnosis/schools (`city`, `address?`, `lat?`, `lng?`, `contact?`, `priceNotes?`) plus `providerType` (`psychologist \| therapist \| developmental-pedagogue \| occupational-therapist \| center`) and `ageGroup` (`children \| adults \| both`) — most real entries are multi-practitioner centers (`center`), individual solo practitioners are the minority. The same institution can legitimately have one entry here and a separate one in `diagnosis` if it runs both services (e.g. Autizmus Alapítvány: `autizmus-alapitvany-ambulancia` in diagnosis, `terc` here) — that's not a duplicate, it's two different services at the same address.

`CATEGORIES` (exported from `content.config.ts`) is the single source of truth for which categories exist — page routing, homepage cards, and `getStaticPaths` all derive from it. Adding a category = add it to `collections` in `content.config.ts`, add its label (and emoji, for the homepage) to the `CATEGORY_LABELS`/`CATEGORY_META` maps in the three page files, create `src/content/<category>/hu/`.

## Routing

- `src/pages/index.astro` — redirects to `/hu/`.
- `src/pages/[locale]/index.astro` — homepage, category grid with live counts.
- `src/pages/[locale]/[category]/index.astro` — listing. Topic filter via `?topic=adhd|autism` query param (plain links, no JS). Renders `<ClinicMap>` above the list when the category is in `MAP_CATEGORIES` (currently `diagnosis`, `schools`, `development`) and at least one filtered item has `lat`/`lng`.
- `src/pages/[locale]/[category]/[slug].astro` — detail page. `getStaticPaths` walks every category's collection and derives `{locale, category, slug}` from the content file's `id` (glob loader IDs are `<locale>/<filename-without-extension>`, so `slug = id.split('/').slice(1).join('/')`). Renders every extra (non-base) field generically via a label lookup map (`FIELD_LABELS`) — adding a new category-specific field to the schema means adding its Hungarian label there too, or it'll render with the raw key name.

## Components

- `src/layouts/Layout.astro` — header/nav/dark-mode toggle/footer, imports global.css.
- `src/components/ClinicMap.astro` — **Google Maps JS API** wrapper (switched from Leaflet/OpenStreetMap; see below for why and what that costs). Takes `clinics: Array<{title, lat, lng, city, address?, href, coverImage?}>` and a `region: 'budapest' | 'hungary'` prop (default `'hungary'`). Each region has its own `restriction.latLngBounds` + `strictBounds: true` + `minZoom` so the map can't be panned/zoomed out past that region — Budapest's box is a tight crop around the city, Hungary's covers the whole country. The listing page (`[category]/index.astro`) renders **two separate map instances** for map-enabled categories, splitting the geo-tagged items on `city === 'Budapest'` — one Budapest-only map, one for everywhere else. Detail pages pick the matching region automatically from the single item's `city`. The component supports multiple instances per page via `querySelectorAll('.clinic-map')`, not a single hardcoded `id`; the Google Maps script tag is loaded once and shared (`loadGoogleMaps()` memoizes the loader promise, later calls await the same load rather than re-injecting the `<script>` tag). `href: ''` renders the title as plain bold text instead of a link (used for the single-marker map on a detail page, where linking to itself is pointless). Single marker → centered at zoom 14 (clamped to the region's `minZoom`); multiple → `fitBounds`. When an item has `coverImage`, its marker becomes a 40×40 circular photo — built by drawing the source image onto an offscreen `<canvas>` clipped to a circle with a white stroke, then handed to the classic `google.maps.Marker` as a data-URL `icon` (this avoids needing `AdvancedMarkerElement` + a Map ID just to get a styled marker; the canvas step also means every marker renders at identical dimensions regardless of the source image's format/aspect ratio, same guarantee the old inline-style approach gave). The backdrop baked into that canvas is neutral gray (`#d4d4d8`), not white — several scraped logos are white-shapes-on-transparent (styled to sit on a colored header on their source site) and go invisible on a pure white circle; gray gives them contrast without affecting photos, which fill the frame and never show the backdrop anyway. A pure-white-only logo with no other distinguishing color (happened once — adhd-kozpont) is still unusable against *any* flat backdrop; when that happens, drop the image rather than keep a blank-looking marker. Popups use `google.maps.InfoWindow`, opened on marker click.

### Why Google Maps, and what it costs

This was Leaflet + OpenStreetMap originally (free, no API key, no billing account, ever) — see `docs/gotchas.md` for Leaflet-specific traps that no longer apply now that it's gone. Switched to Google Maps JS API on request. Requires: a **Maps JavaScript API** key from a Google Cloud project with **billing enabled** (mandatory even to stay inside the free tier — no billing account = the API won't serve requests at all), and that key **restricted by HTTP referrer** to this site's domain(s) so it can't be lifted and abused elsewhere. Pricing as of this write-up: first 10,000 map loads/month free, then $7/1,000 loads — a low-traffic directory site should realistically stay at $0, but there's no "always free, zero account" tier for a real embedded map with custom markers (the genuinely-free options — the legacy `output=embed` iframe, or the Maps Demo Key — don't support custom markers/popups or aren't meant for production, respectively). The key lives in `.env` as `PUBLIC_GOOGLE_MAPS_API_KEY` (the `PUBLIC_` prefix is required for Astro/Vite to expose it to browser code — this is fine because a Maps JS key is meant to run client-side and is secured by domain restriction, not by being secret) and must also be set in Cloudflare Pages' project environment variables for production builds, not just locally — see `docs/deployment.md`.
