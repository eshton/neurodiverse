// Shared client-side Google Maps JS API loader + marker-icon helpers, used by both
// the embedded ClinicMap component (category listing/detail pages) and the full-page
// MapExplorer (homepage). Loads the script at most once per page even if both
// components are present, by memoizing the loader promise on `window`.

import { canMaps, grant, CONSENT_EVENT } from './consent';

// Neutral gray backdrop, not white: several scraped logos are white-on-transparent
// (designed to sit on a colored header on their source site) and vanish on a pure
// white circle/card. Gray gives those shapes contrast without hurting photos, which
// fill the frame anyway and never show the backdrop. Still used for the popup image.
export const BACKDROP = '#d4d4d8';

// Same emoji used for each category's icon on the category-grid homepage
// (src/pages/[locale]/index.astro CATEGORY_META) — kept in sync deliberately so a
// "school" means the same glyph everywhere on the site.
export const CATEGORY_ICONS: Record<string, string> = {
  diagnosis: '🩺',
  schools: '🏫',
  development: '🧩',
  communities: '🤝',
  equipment: '🎧',
};

// One saturated, high-contrast fill per map category so pins are distinguishable
// from each other at a glance AND pop against the muted basemap (MAP_STYLES below).
// The hues are deliberately far apart (red / blue / orange / green / purple).
export const CATEGORY_COLORS: Record<string, string> = {
  diagnosis: '#e11d48', // rose
  schools: '#2563eb', // blue
  development: '#d97706', // amber
  communities: '#16a34a', // green
  equipment: '#7c3aed', // brand purple
};

const DEFAULT_PIN_COLOR = '#7c3aed';

// Classic teardrop marker geometry (unscaled CSS px). Anchored at the tip so the
// point sits exactly on the location and the icon head floats above it. Sized up
// from 32×44 so pins are easier to spot and the head icon is more legible.
export const PIN_WIDTH = 42;
export const PIN_HEIGHT = 58;

export const POPUP_IMG_STYLE = `display:block;width:100%;max-width:180px;height:100px;object-fit:cover;object-position:center;background:${BACKDROP};border-radius:0.5rem;margin-bottom:0.35rem;`;

// Explicit "open in new tab" button in the marker popup, instead of a plain
// text link — keeps the map page open (and its filter/location state intact)
// while the content page loads in its own tab.
export const POPUP_BTN_STYLE = `display:inline-block;margin-top:0.35rem;padding:0.3rem 0.7rem;background:#7c3aed;color:white;border-radius:9999px;font-size:0.8rem;text-decoration:none;`;

// Mutes the whole basemap (low saturation, light, grayed roads) so our colored
// category pins are the most vivid thing on the map and stand out clearly — and
// hides Google's own default POI/transit markers and labels, which otherwise
// clutter the view with places irrelevant to this site's content.
export const MAP_STYLES = [
  // Desaturate + lighten the base geometry so nothing on the map competes with the pins.
  { elementType: 'geometry', stylers: [{ saturation: -60 }, { lightness: 15 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#71717a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d4d4d8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f4f4f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 25 }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
  // Hide Google's own POI/transit clutter — only our pins should show.
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// Draws a classic map-pin marker: a colored teardrop that points down at the exact
// location, with the category's emoji sitting in a white disc in the head above the
// point. The body is filled with the category's distinct color, outlined in white
// with a soft drop shadow so it stands out crisply against the muted basemap. This
// replaced the circular cover-photo markers (photos still show in the popup) — a
// uniform pin shape reads as "a place here" far more clearly at map zoom, and the
// per-category color + icon carries the type. Synchronous (no image to load).
export function categoryPin(category: string): string {
  const scale = 2; // 2x for retina
  const w = PIN_WIDTH * scale;
  const h = PIN_HEIGHT * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const color = CATEGORY_COLORS[category] ?? DEFAULT_PIN_COLOR;
  const strokeW = 2.5 * scale;
  const margin = 3 * scale; // room for the stroke + shadow so nothing clips
  const cx = w / 2;
  const r = (w - margin * 2) / 2 - strokeW / 2; // head radius
  const cy = margin + strokeW / 2 + r; // head center
  const tipY = h - margin; // where the point touches the ground

  // Teardrop outline: from the tip, up the two tangent lines to the head circle,
  // then the long arc over the top of the head and back down to the tip.
  const d = tipY - cy;
  const ang = Math.acos(r / d); // angle at center between straight-down and each tangent point
  const p1 = { x: cx + r * Math.sin(ang), y: cy + r * Math.cos(ang) };
  const p2 = { x: cx - r * Math.sin(ang), y: cy + r * Math.cos(ang) };
  const start = Math.atan2(p1.y - cy, p1.x - cx);
  const end = Math.atan2(p2.y - cy, p2.x - cx);

  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.lineTo(p1.x, p1.y);
  ctx.arc(cx, cy, r, start, end, true); // anticlockwise = the long way, over the top
  ctx.closePath();

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 3 * scale;
  ctx.shadowOffsetY = 1.5 * scale;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = strokeW;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // White disc behind the emoji so it reads on any pin color.
  const discR = r * 0.62;
  ctx.beginPath();
  ctx.arc(cx, cy, discR, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const emoji = CATEGORY_ICONS[category];
  if (emoji) {
    ctx.font = `${discR * 1.25}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy + discR * 0.05);
  }

  return canvas.toDataURL('image/png');
}

// --- Google Maps consent gate (ePrivacy/GDPR) ----------------------------------
// Google Maps is a third party: loading its JS contacts Google's servers and can
// set cookies. So we don't inject it until the user has granted the `maps` consent
// category (see src/lib/consent.ts — set via the site-wide banner, or per-map via
// the placeholder button below). Until then each map container shows a placeholder.
let consentWaiters: Array<() => void> = [];

function resolveWaiters() {
  const waiters = consentWaiters;
  consentWaiters = [];
  waiters.forEach((resolve) => resolve());
}

// When maps consent is granted anywhere (the consent banner or a placeholder's
// own "enable" button), release every map that's waiting to load on this page.
if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_EVENT, () => {
    if (canMaps()) resolveWaiters();
  });
}

function renderConsentPlaceholder(el: HTMLElement) {
  el.innerHTML =
    `<div class="h-full w-full flex items-center justify-center p-6 text-center">` +
    `<div class="max-w-sm">` +
    `<div class="text-3xl mb-2" aria-hidden="true">🗺️</div>` +
    `<p class="text-sm text-zinc-600 dark:text-zinc-300">A térkép a <strong>Google Maps</strong> szolgáltatását használja, amely betöltéskor kapcsolatba lép a Google szervereivel, és sütiket helyezhet el. A megjelenítéshez engedélyezned kell.</p>` +
    `<button type="button" data-maps-consent class="mt-3 inline-block px-4 py-2 rounded-full bg-brand-600 text-white text-sm hover:bg-brand-700 transition">Térkép engedélyezése</button>` +
    `<p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Részletek az <a href="/adatvedelem/" class="underline">Adatvédelemben</a>.</p>` +
    `</div></div>`;
  el.querySelector('[data-maps-consent]')?.addEventListener('click', () => grant('maps'));
}

// Resolves once the user has allowed Google Maps. If the `maps` consent isn't
// granted yet, it renders a placeholder into `el` and waits — the placeholder's
// button (or the site-wide banner) grants consent and releases every waiting map.
// Call this BEFORE loadGoogleMaps() in each map component.
export function whenMapsAllowed(el: HTMLElement): Promise<void> {
  if (canMaps()) return Promise.resolve();
  return new Promise((resolve) => {
    consentWaiters.push(resolve);
    renderConsentPlaceholder(el);
  });
}

let loaderPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error('PUBLIC_GOOGLE_MAPS_API_KEY is not set'));
      return;
    }
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      (window as any).__gmapsCallbacks ??= [];
      (window as any).__gmapsCallbacks.push(resolve);
      return;
    }
    (window as any).__gmapsCallbacks = [resolve];
    (window as any).__gmapsInit = () => {
      (window as any).__gmapsCallbacks.forEach((cb: () => void) => cb());
    };
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__gmapsInit&loading=async`;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps JS API'));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function getGoogle(): any {
  return (window as any).google;
}
