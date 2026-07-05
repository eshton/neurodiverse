// Single source of truth for per-category presentation + grouping. Previously
// the label map was copy-pasted into three page files, one component, and the
// detail panel — and movies got left out of the homepage copy, so its card
// rendered blank. Import from here instead of redefining these anywhere.
//
// (Existence of a category is still owned by CATEGORIES in content.config.ts;
// this module only adds display metadata and browsing-surface grouping.)

export interface CategoryMeta {
  label: string;
  icon: string; // emoji, also reused for map markers via googleMaps.ts
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  books: { label: 'Könyvek', icon: '📚' },
  podcasts: { label: 'Podcastok', icon: '🎙️' },
  videos: { label: 'Videók', icon: '🎬' },
  movies: { label: 'Filmek', icon: '🎞️' },
  influencers: { label: 'Influenszerek', icon: '📣' },
  articles: { label: 'Cikkek', icon: '📰' },
  equipment: { label: 'Segédeszközök', icon: '🎧' },
  food: { label: 'Étel és receptek', icon: '🍽️' },
  research: { label: 'Kutatás', icon: '🔬' },
  communities: { label: 'Közösségek', icon: '🤝' },
  diagnosis: { label: 'Diagnózis', icon: '🩺' },
  schools: { label: 'Iskolák', icon: '🏫' },
  development: { label: 'Fejlesztés', icon: '🧩' },
};

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label])
);

// Hungarian labels for the category-specific (non-base) schema fields, rendered
// generically on the detail page and in the detail panel.
export const FIELD_LABELS: Record<string, string> = {
  author: 'Szerző', publication: 'Kiadvány', publishedDate: 'Megjelenés', isbn: 'ISBN',
  creator: 'Készítő', platform: 'Platform',
  episodeCount: 'Epizódszám', viewCount: 'Megtekintés', subscriberCount: 'Feliratkozó',
  handle: 'Fiók', platforms: 'Platformok', priceRange: 'Ár', retailerUrls: 'Vásárlási linkek',
  kind: 'Típus', format: 'Formátum', seasons: 'Évadok', dietaryTags: 'Diétás címkék',
  providerType: 'Típus', ageGroup: 'Korosztály',
  city: 'Város', address: 'Cím', contact: 'Elérhetőség', priceNotes: 'Ár megjegyzés',
  director: 'Rendező', year: 'Év', runtimeMinutes: 'Hossz (perc)', streamingUrls: 'Elérhető ezeken',
  authors: 'Szerzők', venue: 'Megjelenés', publicationType: 'Publikáció típusa',
  language: 'Nyelv', doi: 'DOI / azonosító', openAccess: 'Szabadon elérhető',
};

// Hungarian display for enum-ish field *values* that would otherwise render in
// English (food/movie/research kinds, language codes, booleans). Used by the
// detail page and the detail panel; keyed by the raw value.
export const VALUE_LABELS: Record<string, string> = {
  recipe: 'Recept', product: 'Termék', guide: 'Útmutató', supplement: 'Étrendkiegészítő',
  documentary: 'dokumentumfilm', narrative: 'játékfilm', film: 'film', series: 'sorozat',
  'journal-article': 'szakcikk', review: 'áttekintő tanulmány', 'clinical-trial': 'klinikai vizsgálat',
  hu: 'magyar', en: 'angol', true: 'igen', false: 'nem',
};

// Categories reachable via the /web/ grid (no physical location). Drives the
// "back" link target on listing/detail pages and the web grid's own item pull.
export const WEB_CATEGORIES = new Set([
  'books', 'podcasts', 'videos', 'equipment', 'movies', 'food', 'articles', 'research',
]);

// Categories whose geo-tagged items are pinned on the map homepage (`/`).
// Equipment is intentionally in BOTH this and WEB_CATEGORIES — most equipment is
// online-only, but the one item with a real address still earns a pin.
export const MAP_PIN_CATEGORIES = ['diagnosis', 'schools', 'development', 'communities', 'equipment'] as const;

// Categories that render an embedded ClinicMap above their listing at
// /hu/<category>/. Narrower than MAP_PIN_CATEGORIES (equipment's single located
// item isn't worth a whole map on its listing page).
export const LISTING_MAP_CATEGORIES = new Set(['diagnosis', 'schools', 'development', 'communities']);
