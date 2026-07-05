// Shared client-side Google Maps JS API loader + marker-icon helpers, used by both
// the embedded ClinicMap component (category listing/detail pages) and the full-page
// MapExplorer (homepage). Loads the script at most once per page even if both
// components are present, by memoizing the loader promise on `window`.

export const MARKER_SIZE = 30;

// Neutral gray backdrop, not white: several scraped logos are white-on-transparent
// (designed to sit on a colored header on their source site) and vanish on a pure
// white circle/card. Gray gives those shapes contrast without hurting photos, which
// fill the frame anyway and never show the backdrop.
export const BACKDROP = '#d4d4d8';

// Dark border on every marker (photo or fallback) so pins read clearly against any
// map style/terrain color, instead of blending in at a glance.
const BORDER_COLOR = '#27272a';

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

export const POPUP_IMG_STYLE = `display:block;width:100%;max-width:180px;height:100px;object-fit:cover;object-position:center;background:${BACKDROP};border-radius:0.5rem;margin-bottom:0.35rem;`;

// Explicit "open in new tab" button in the marker popup, instead of a plain
// text link — keeps the map page open (and its filter/location state intact)
// while the content page loads in its own tab.
export const POPUP_BTN_STYLE = `display:inline-block;margin-top:0.35rem;padding:0.3rem 0.7rem;background:#7c3aed;color:white;border-radius:9999px;font-size:0.8rem;text-decoration:none;`;

// Hides Google's own default POI markers/labels (restaurants, shops, transit stops,
// etc.) so the only pins on the map are ours — Google's built-ins otherwise clutter
// the view with places irrelevant to this site's content.
export const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

function drawBadge(ctx: CanvasRenderingContext2D, size: number, category?: string) {
  const emoji = category ? CATEGORY_ICONS[category] : undefined;
  if (!emoji) return;
  const r = size * 0.19;
  const cx = size - r - 1;
  const cy = size - r - 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = BORDER_COLOR;
  ctx.stroke();
  ctx.font = `${r * 1.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, cx, cy + r * 0.05);
}

// Bakes a photo into a circular, bordered PNG so the marker icon has guaranteed
// dimensions and styling regardless of the source image's aspect ratio or format
// (svg/webp/jpg/png all go through the same canvas pipeline). Resolves to '' on
// load failure so callers can fall back to the default pin. When `category` is
// given, stamps a small rounded badge with that category's icon in the corner so
// the type reads at a glance even though the marker shows a photo.
export function circularIcon(url: string, category?: string): Promise<string> {
  return new Promise((resolve) => {
    const size = MARKER_SIZE * 2; // 2x for retina
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = BACKDROP;
      ctx.fill();
      ctx.clip();
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = BORDER_COLOR;
      ctx.stroke();
      drawBadge(ctx, size, category);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

// Fallback marker for entities with no coverImage: a solid brand-colored circle
// with the category's icon centered, dark-bordered like every other marker —
// used instead of Google's default red teardrop pin, which carries no type info.
// Synchronous (no image to load), unlike circularIcon.
export function categoryIcon(category: string): string {
  const size = MARKER_SIZE * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#7c3aed';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = BORDER_COLOR;
  ctx.stroke();
  const emoji = CATEGORY_ICONS[category];
  if (emoji) {
    ctx.font = `${size * 0.42}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.02);
  }
  return canvas.toDataURL('image/png');
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
