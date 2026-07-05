#!/usr/bin/env node
// Generates public/db/content.json — the committed, open-source dataset that
// backs the client-side data layer (see docs/proposals/client-data-layer.md).
//
// Source of truth is the markdown under src/content/<category>/<locale>/*.md.
// This runs as `prebuild` so the committed JSON can never silently drift from
// the content; regenerate manually with `npm run build:db`.
//
// Deterministic output (sorted, no timestamps) so re-running only changes the
// file when the content actually changed — keeps git diffs clean.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'src', 'content');
const OUT_FILE = join(ROOT, 'public', 'db', 'content.json');

// Defaults mirror the Zod schema in src/content.config.ts. Kept in sync by
// hand because that config imports astro-only modules and can't be required
// from a plain Node script — if you add a defaulted field there, add it here.
const BASE_DEFAULTS = {
  tags: [],
  ratings: [],
  availability: 'in-stock',
  ageGroup: 'both',
  entryType: 'full',
  curatedBy: 'manual',
};
const CATEGORY_DEFAULTS = {
  equipment: { retailerUrls: [] },
  movies: { streamingUrls: [] },
  food: { dietaryTags: [] },
};

function splitFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw.trim() };
  return { data: YAML.parse(m[1]) ?? {}, body: m[2].trim() };
}

// YAML may parse `2026-07-04` into a Date; normalize every Date to an ISO
// date string so the JSON is stable and framework-agnostic for consumers.
function normalizeDates(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeDates(v)]));
  }
  return value;
}

const items = [];
const perCategory = {};

for (const category of readdirSync(CONTENT_DIR).sort()) {
  const categoryDir = join(CONTENT_DIR, category);
  const locales = readdirSync(categoryDir).filter((d) => {
    try { return readdirSync(join(categoryDir, d)); } catch { return false; }
  });
  for (const locale of locales) {
    const localeDir = join(categoryDir, locale);
    const files = readdirSync(localeDir).filter((f) => f.endsWith('.md')).sort();
    for (const file of files) {
      const slug = basename(file, '.md');
      const { data, body } = splitFrontmatter(readFileSync(join(localeDir, file), 'utf8'));
      const record = normalizeDates({
        id: `${locale}/${slug}`,
        category,
        slug,
        href: `/${locale}/${category}/${slug}/`,
        ...BASE_DEFAULTS,
        ...(CATEGORY_DEFAULTS[category] ?? {}),
        ...data,
        body,
      });
      items.push(record);
      perCategory[category] = (perCategory[category] ?? 0) + 1;
    }
  }
}

// Stable ordering: category, then slug.
items.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));

const db = {
  schemaVersion: 1,
  count: items.length,
  categories: Object.fromEntries(Object.entries(perCategory).sort()),
  items,
};

if (!existsSync(dirname(OUT_FILE))) mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(db, null, 2) + '\n');
console.log(`Wrote ${OUT_FILE} — ${items.length} items across ${Object.keys(perCategory).length} categories.`);
