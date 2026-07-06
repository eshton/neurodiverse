// Client-side executors for the chat assistant's tools. The tool *schemas* live
// server-side in functions/api/chat.ts (that's what the model is offered); this
// module runs the tool CALLS the model makes, entirely in the browser against the
// already-loaded /db/content.json — so content lookups never hit the network/LLM.
// The only coupling with the function is the tool NAMES in executeTool()'s switch.
//
// Tools:
//   search_resources / get_resource → return data (JSON string) for the model
//   show_resource / link_to         → return a `render` payload the chat renders,
//                                      plus a short confirmation string for the model

import { CATEGORY_META } from './categories';

export interface DbItem {
  href: string;
  title: string;
  category: string;
  slug: string;
  summary: string;
  topics?: string[];
  ageGroup?: string;
  city?: string;
  address?: string;
  coverImage?: string;
  sourceUrl?: string;
  tags?: string[];
  body?: string;
  [k: string]: unknown;
}

export type ToolRender =
  | { type: 'card'; item: DbItem }
  | { type: 'link'; href: string; label: string };

export interface ToolResult {
  content: string; // sent back to the model as the tool result
  render?: ToolRender; // optional UI to append to the chat thread
}

// --- content.json loader (memoized, same shape/approach as DetailPanel) ---------

interface Db {
  items: DbItem[];
  byHref: Map<string, DbItem>;
}
let dbPromise: Promise<Db> | null = null;

export function loadDb(): Promise<Db> {
  return (dbPromise ??= fetch('/db/content.json')
    .then((r) => {
      if (!r.ok) throw new Error('content.json ' + r.status);
      return r.json();
    })
    .then((d: { items: DbItem[] }) => ({
      items: d.items,
      byHref: new Map(d.items.map((it) => [it.href, it])),
    }))
    .catch((err) => {
      dbPromise = null; // let the next call retry a failed fetch
      throw err;
    }));
}

// --- helpers --------------------------------------------------------------------

// Accent-fold + lowercase so "Szeged"/"szeged" and "diagnózis"/"diagnozis" match.
function fold(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[áà]/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/[óöő]/g, 'o')
    .replace(/[úüű]/g, 'u');
}

function normalizeHref(href: string): string {
  let h = (href || '').trim();
  if (h && !h.startsWith('/')) h = '/' + h;
  return h;
}

function scoreItem(item: DbItem, terms: string[]): number {
  if (terms.length === 0) return 1; // filters-only query: everything in the pool qualifies
  const title = fold(item.title);
  const summary = fold(item.summary);
  const tags = fold((item.tags || []).join(' '));
  const city = fold(item.city || '');
  const catLabel = fold(CATEGORY_META[item.category]?.label || '');
  const body = fold(String(item.body || ''));
  let score = 0;
  for (const t of terms) {
    if (!t) continue;
    if (title.includes(t)) score += 5;
    if (catLabel.includes(t)) score += 3;
    if (tags.includes(t)) score += 3;
    if (city.includes(t)) score += 3;
    if (summary.includes(t)) score += 2;
    if (body.includes(t)) score += 1;
  }
  return score;
}

const MAX_RESULTS = 6;

// --- tool implementations -------------------------------------------------------

async function searchResources(args: any): Promise<ToolResult> {
  const { query = '', category, topic, ageGroup, city } = args || {};
  const { items } = await loadDb();

  let pool = items;
  if (category) pool = pool.filter((i) => i.category === category);
  if (topic) pool = pool.filter((i) => (i.topics || []).includes(topic));
  if (ageGroup && ageGroup !== 'both')
    pool = pool.filter((i) => i.ageGroup === ageGroup || i.ageGroup === 'both' || !i.ageGroup);
  if (city) {
    const c = fold(city);
    pool = pool.filter((i) => fold(i.city || '').includes(c) || fold(i.address || '').includes(c));
  }

  const terms = fold(query).split(/\s+/).filter(Boolean);
  const results = pool
    .map((i) => ({ i, s: scoreItem(i, terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_RESULTS)
    .map(({ i }) => ({
      title: i.title,
      category: i.category,
      categoryLabel: CATEGORY_META[i.category]?.label ?? i.category,
      href: i.href,
      summary: i.summary,
      city: i.city,
      topics: i.topics,
      ageGroup: i.ageGroup,
    }));

  return { content: JSON.stringify({ count: results.length, results }) };
}

async function getResource(args: any): Promise<ToolResult> {
  const href = normalizeHref(args?.href || '');
  const { byHref } = await loadDb();
  const item = byHref.get(href);
  if (!item) return { content: JSON.stringify({ error: 'not_found', href }) };
  const { body, ...rest } = item;
  // Trim the body so a long entry doesn't blow up the context.
  return { content: JSON.stringify({ ...rest, body: String(body || '').slice(0, 1500) }) };
}

async function showResource(args: any): Promise<ToolResult> {
  const href = normalizeHref(args?.href || '');
  const { byHref } = await loadDb();
  const item = byHref.get(href);
  if (!item) return { content: JSON.stringify({ error: 'not_found', href }) };
  return { content: `Kártyaként megjelenítve: ${item.title}`, render: { type: 'card', item } };
}

function linkTo(args: any): ToolResult {
  const href = normalizeHref(args?.href || '');
  const label = String(args?.label || 'Megnyitás').trim();
  if (!href) return { content: JSON.stringify({ error: 'missing_href' }) };
  return { content: `Link megjelenítve: ${label} → ${href}`, render: { type: 'link', href, label } };
}

export async function executeTool(name: string, args: any): Promise<ToolResult> {
  try {
    switch (name) {
      case 'search_resources':
        return await searchResources(args);
      case 'get_resource':
        return await getResource(args);
      case 'show_resource':
        return await showResource(args);
      case 'link_to':
        return linkTo(args);
      default:
        return { content: JSON.stringify({ error: 'unknown_tool', name }) };
    }
  } catch (e) {
    return { content: JSON.stringify({ error: 'tool_failed', message: String(e) }) };
  }
}

// --- render helpers (HTML strings appended into the chat thread) -----------------

function esc(v: string): string {
  return String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}

const isInternal = (href: string) => href.startsWith('/');

// A clickable link chip. Internal routes navigate in-place (ClientRouter + prefetch);
// external URLs open in a new tab.
export function linkChipHtml(href: string, label: string): string {
  const internal = isInternal(href);
  const attrs = internal ? '' : ' target="_blank" rel="noopener noreferrer"';
  const arrow = internal ? '→' : '↗';
  return (
    `<a href="${esc(href)}"${attrs} class="inline-flex items-center gap-1 mt-2 mr-2 px-3 py-1.5 rounded-full bg-brand-600 text-white text-sm hover:bg-brand-700 transition no-underline">` +
    `${esc(label)} <span aria-hidden="true">${arrow}</span></a>`
  );
}

// A rich resource card: cover thumbnail + title + category badge + summary + links.
export function resourceCardHtml(item: DbItem): string {
  const meta = CATEGORY_META[item.category];
  const badge = meta ? `${meta.icon} ${esc(meta.label)}` : esc(item.category);
  const cover = item.coverImage
    ? `<img src="${esc(item.coverImage)}" alt="" class="w-16 h-16 rounded-lg object-cover shrink-0 bg-zinc-200 dark:bg-zinc-700">`
    : '';
  const place = item.city ? `<span class="text-zinc-500 dark:text-zinc-400">· ${esc(item.city)}</span>` : '';
  const details = `<a href="${esc(item.href)}" class="text-brand-700 dark:text-brand-300 underline text-sm">Részletek →</a>`;
  const external =
    typeof item.sourceUrl === 'string' && /^https?:\/\//.test(item.sourceUrl)
      ? ` <a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-brand-700 dark:text-brand-300 underline text-sm ml-3">Megnyitás ↗</a>`
      : '';
  return (
    `<div class="mt-2 flex gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">` +
    cover +
    `<div class="min-w-0">` +
    `<div class="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">${badge} ${place}</div>` +
    `<div class="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">${esc(item.title)}</div>` +
    `<p class="text-sm text-zinc-600 dark:text-zinc-300 mt-0.5 line-clamp-3">${esc(item.summary)}</p>` +
    `<div class="mt-1">${details}${external}</div>` +
    `</div></div>`
  );
}

// Render any tool's UI payload to an HTML string (empty if it has none).
export function renderToolUi(render: ToolRender | undefined): string {
  if (!render) return '';
  if (render.type === 'card') return resourceCardHtml(render.item);
  if (render.type === 'link') return linkChipHtml(render.href, render.label);
  return '';
}
