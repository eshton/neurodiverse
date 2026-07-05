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
  lastReviewed: z.coerce.date(),
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
    publishedDate: z.string().optional(),
  }),
  equipment: collectionFor('equipment', {
    priceRange: z.string().optional(),
    retailerUrls: z.array(z.string().url()).default([]),
    city: z.string().optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
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
  }),
  diagnosis: collectionFor('diagnosis', {
    providerType: z.enum(['doctor', 'clinic', 'foundation', 'hospital']),
    city: z.string(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    contact: z.string().optional(),
    priceNotes: z.string().optional(),
  }),
  schools: collectionFor('schools', {
    providerType: z.enum(['mainstream-integration', 'special-needs-school', 'kindergarten']),
    city: z.string(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    contact: z.string().optional(),
    priceNotes: z.string().optional(),
  }),
  development: collectionFor('development', {
    providerType: z.enum(['psychologist', 'therapist', 'developmental-pedagogue', 'occupational-therapist', 'center']),
    city: z.string(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    contact: z.string().optional(),
    priceNotes: z.string().optional(),
  }),
};

export const CATEGORIES = Object.keys(collections) as (keyof typeof collections)[];
