import type { APIRoute } from 'astro';

// Emitted as /robots.txt at build. Points crawlers at the sitemap and stays in
// sync with the configured `site` (astro.config / SITE_URL) instead of a
// hardcoded static file that could drift from the real domain.
export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site).href : '/sitemap-index.xml';
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
