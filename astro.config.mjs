import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Locale is a content dimension (see src/content.config.ts), not Astro's
// built-in i18n routing feature — only `hu` has content today, `uk`/`us`
// are reserved locale values ready for future content.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
