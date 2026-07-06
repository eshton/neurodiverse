import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Locale is a content dimension (see src/content.config.ts), not Astro's
// built-in i18n routing feature — only `hu` has content today, `uk`/`us`
// are reserved locale values ready for future content.

// Production origin — used for canonical URLs, Open Graph tags, the sitemap, and
// robots.txt. Set SITE_URL in the environment (locally in the shell/.env, and in
// the Cloudflare Pages project variables) to the real domain; the fallback is
// the Cloudflare Pages default subdomain. A wrong value ships wrong
// canonical/sitemap URLs, so keep it accurate for production.
const SITE = process.env.SITE_URL || 'https://neurodiverse.pages.dev';

export default defineConfig({
  site: SITE,
  // /web has no combined view anymore — each content type is its own permalinked
  // list (/web/<category>). Send the bare /web to the first category so old links
  // and the header don't 404. Query strings (e.g. ?age=) aren't preserved across
  // this static redirect, so callers that need the age param (the landing page,
  // header) link straight to /web/books.
  redirects: {
    '/web': '/web/books',
  },
  // Hover/viewport prefetch so a link's target page is already in memory by the
  // time it's clicked — pairs with <ClientRouter/> for instant, refresh-free
  // navigation over the static build. See docs/proposals/client-data-layer.md.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
