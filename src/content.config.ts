import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const rating = z.object({
  source: z.string(),
  score: z.number(),
  scale: z.number(),
  url: z.string().url().optional(),
  note: z.string().optional(),
  checkedAt: z.coerce.date(),
});

// A single physical site. Used by the `locations` array below so one entry can
// pin on the map in more than one place (e.g. a hospital with two departments,
// a foundation with regional offices). `city` is required (it drives the
// Budapest/vidék map split and the listing headings); everything else is
// optional — a site with no lat/lng is still listed, it just gets no pin.
const location = z.object({
  label: z.string().optional(), // branch/site name, e.g. "Bethlen utcai telephely"
  city: z.string(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contact: z.string().optional(),
  priceNotes: z.string().optional(),
  note: z.string().optional(), // free text, e.g. a verification caveat for this site
});

// Multi-location support, mixed into every mappable category. The top-level
// city/address/lat/lng stay the *primary* site (unchanged for the ~single-site
// majority — no migration). `locations` holds ADDITIONAL sites beyond that
// primary. `locationStatus` records the research outcome per entry so coverage
// is auditable and continuable:
//   multiple-confirmed — extra sites found & verified (they're in `locations`)
//   single-confirmed   — verified this is the only site
//   unsure             — couldn't determine whether other sites exist
const multiLocation = {
  locations: z.array(location).optional(),
  locationStatus: z.enum(['single-confirmed', 'multiple-confirmed', 'unsure']).optional(),
};

// Funding/access model for the beutaló-based (state-funded) service layer,
// mixed into the referral-relevant mappable categories (diagnosis/schools/
// development). Optional so existing entries validate; backfilled from each
// entry's own summary/priceNotes where the model is already stated, and set on
// every public/state entry. Powers the map's "közfinanszírozott" filter — see
// GitHub issue #1.
//   funding: state = TB/köz-financed · private = self-pay · mixed = both
//   referralRequired: is a beutaló (GP/specialist referral) needed?
const access = {
  funding: z.enum(['state', 'private', 'mixed']).optional(),
  referralRequired: z.boolean().optional(),
};

const base = z.object({
  title: z.string(),
  locale: z.enum(['hu', 'uk', 'us']),
  topics: z.array(z.enum(['adhd', 'autism'])).min(1),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  sourceUrl: z.string().url(),
  coverImage: z.string().optional(),
  ratings: z.array(rating).default([]),
  availability: z.enum(['in-stock', 'unavailable']).default('in-stock'),
  ageGroup: z.enum(['children', 'adults', 'both']).default('both'),
  entryType: z.enum(['full', 'episode']).default('full'),
  parentTitle: z.string().optional(),
  curatedBy: z.enum(['manual', 'agent']).default('manual'),
  // When the content was published/released — for content types that have one
  // (books, articles, videos, podcasts…). Kept a plain string (not z.coerce.date)
  // so partial dates work and it renders as-is: "YYYY", "YYYY-MM", or "YYYY-MM-DD"
  // (must be quoted in YAML). Place-based entries (clinics/schools) omit it;
  // movies/research use their own `year` (number) instead.
  publishedDate: z.string().optional(),
  // lastReviewed: when the entry's data was last checked against its source and
  // found still correct — set it to the verification date even if nothing changed.
  lastReviewed: z.coerce.date(),
  // lastEdited: when the entry's content was last actually changed. Required on
  // every entry (seeded from git history). Distinct from lastReviewed — a
  // re-verified-but-unchanged entry gets a new lastReviewed, same lastEdited.
  lastEdited: z.coerce.date(),
});

function collectionFor(category: string, extra: z.ZodRawShape = {}) {
  return defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./src/content/${category}` }),
    schema: base.extend(extra),
  });
}

export const collections = {
  books: collectionFor('books', {
    author: z.string(),
    isbn: z.string().optional(),
  }),
  podcasts: collectionFor('podcasts', {
    creator: z.string(),
    platform: z.string(),
    episodeCount: z.number().optional(),
  }),
  videos: collectionFor('videos', {
    creator: z.string(),
    platform: z.string(),
    viewCount: z.number().optional(),
    subscriberCount: z.number().optional(),
  }),
  influencers: collectionFor('influencers', {
    handle: z.string(),
    platforms: z.array(z.string()).min(1),
  }),
  articles: collectionFor('articles', {
    publication: z.string(),
    author: z.string().optional(),
    // publishedDate is now a base field (shared with books/videos/podcasts).
  }),
  equipment: collectionFor('equipment', {
    priceRange: z.string().optional(),
    retailerUrls: z.array(z.string().url()).default([]),
    city: z.string().optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    ...multiLocation,
  }),
  food: collectionFor('food', {
    kind: z.enum(['recipe', 'product', 'guide', 'supplement']),
    dietaryTags: z.array(z.string()).default([]),
  }),
  movies: collectionFor('movies', {
    kind: z.enum(['documentary', 'narrative']),
    format: z.enum(['film', 'series']).optional(), // omitted = film; set 'series' for TV series
    director: z.string().optional(),
    creator: z.string().optional(), // series showrunner/creator (director is film-oriented)
    year: z.number().optional(),
    seasons: z.number().optional(), // series only
    runtimeMinutes: z.number().optional(),
    streamingUrls: z.array(z.string().url()).default([]),
  }),
  research: collectionFor('research', {
    authors: z.string(),
    venue: z.string(), // journal, publisher, or trial registry (e.g. "Psychiatria Hungarica", "ClinicalTrials.gov")
    year: z.number(),
    publicationType: z.enum(['journal-article', 'review', 'clinical-trial']),
    language: z.enum(['hu', 'en']), // language of the paper itself; the summary is always Hungarian
    doi: z.string().optional(), // DOI, repository handle, or registry id (e.g. NCT number)
    openAccess: z.boolean().optional(),
  }),
  communities: collectionFor('communities', {
    providerType: z.enum(['group-therapy', 'therapist', 'institution', 'online-group']),
    city: z.string().optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    contact: z.string().optional(),
    ...multiLocation,
  }),
  diagnosis: collectionFor('diagnosis', {
    // `expert-committee` = Tanulási Képességet Vizsgáló Szakértői Bizottság —
    // state SNI-assessment committees (~1/county), assessment-adjacent so they
    // live here on the diagnosis map rather than a separate category (issue #1).
    providerType: z.enum(['doctor', 'clinic', 'foundation', 'hospital', 'expert-committee']),
    city: z.string(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    contact: z.string().optional(),
    priceNotes: z.string().optional(),
    ...multiLocation,
    ...access,
  }),
  schools: collectionFor('schools', {
    providerType: z.enum(['mainstream-integration', 'special-needs-school', 'kindergarten']),
    city: z.string(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    contact: z.string().optional(),
    priceNotes: z.string().optional(),
    ...multiLocation,
    ...access,
  }),
  development: collectionFor('development', {
    providerType: z.enum(['psychologist', 'therapist', 'developmental-pedagogue', 'occupational-therapist', 'center']),
    city: z.string(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    contact: z.string().optional(),
    priceNotes: z.string().optional(),
    ...multiLocation,
    ...access,
  }),
};

export const CATEGORIES = Object.keys(collections) as (keyof typeof collections)[];
