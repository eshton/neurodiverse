import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Locale is a content dimension (see src/content.config.ts), not Astro's
// built-in i18n routing feature — only `hu` has content today, `uk`/`us`
// are reserved locale values ready for future content.
export default defineConfig({
  // Hover/viewport prefetch so a link's target page is already in memory by the
  // time it's clicked — pairs with <ClientRouter/> for instant, refresh-free
  // navigation over the static build. See docs/proposals/client-data-layer.md.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
