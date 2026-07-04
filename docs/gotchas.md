# Gotchas

Environment/tooling traps hit during this session. Read before repeating the same debugging.

## Shell

- **This shell is zsh, not bash.** Bash-only associative-array syntax (`declare -A`, `"${!arr[@]}"`) fails with `bad substitution`. Use a plain `name url` pairs file + `while read -r name url; do ...; done < file` loop instead, or explicit `bash -c '...'` if you really need bash arrays.
- **Bash tool calls share `cd` state across calls in this session.** `cd public/covers && curl ... ` in one call leaves the next call's cwd at `public/covers` — an `astro build` run there creates `public/covers/dist/` instead of the project's `dist/`. Always use absolute paths for anything not trivially obviously scoped, or explicitly `cd` back to the project root before build/dev commands.
- The user's shell has an `rtk` hook intercepting some commands (e.g. `find`) that rejects certain flag combinations (`-not`, `-exec`) with an error rather than passing through — if `find` fails oddly, it's this, not a real filesystem issue. Fall back to plain `grep -r`/`ls` or split the command.

## Fetching

- **YouTube URLs need `curl -L`** (or an equivalent follow-redirects flag) — legacy channel-name URLs like `youtube.com/somehandle` 302-redirect, and without following it you get a 200-with-empty-body-looking result that's actually just an unfollowed redirect. `curl -sL -A "Mozilla/5.0" <url>` is the working pattern used throughout this session.
- **moly.hu (the real Hungarian Goodreads-equivalent) blocks both WebFetch and curl-with-browser-UA with a 403.** Confirmed, not a fluke — tried multiple times, multiple pages. No workaround found this session. If book ratings matter enough to chase further, this is the source that would have them, but it needs something beyond a plain HTTP fetch (real browser via Chrome DevTools MCP, if that becomes available — see below).
- **lira.hu also 403s plain curl/WebFetch requests** — for at least one item, fell back to a different retailer's page (konyvtunder.hu) for the same product, which worked fine. When one Hungarian retailer blocks you, try another before giving up on a data point.
- Nominatim (OpenStreetMap geocoding) requires a **real identifying User-Agent** and **max 1 request/second** — generic/empty UAs get rejected, and hammering it will get you rate-limited or blocked. Always `sleep 1.1` between calls in a loop.
- Hungarian-locale scraping: don't search page HTML for English strings like "subscribers" or "likes" — YouTube/etc. render the locale-appropriate text (`"feliratkozó"`, `"ezer"` for thousand) and that's what's actually in the DOM.

## Chrome DevTools MCP

Hit a persistent "browser is already running for /Users/aston/.cache/chrome-devtools-mcp/chrome-profile, use --isolated" error every time `new_page`/`list_pages`/etc. were called this session, including on a fresh call much later — looks like a stale lock from a prior session's browser process that never released. Didn't chase killing it (didn't want to blindly kill a Chrome process that might be something else the user has open). If live browser verification/screenshots are needed and this error recurs, either ask the user to close/check their Chrome DevTools MCP browser instance, or use an isolated context explicitly — `new_page` takes an `isolatedContext` param, though that alone didn't clear this particular error in testing.

## Astro / content collections

- Content collection config lives at `src/content.config.ts` (project-root-of-`src`, **not** `src/content/config.ts` — that's outdated guidance from older Astro versions). Confirmed against Astro 7 docs directly, not from training-data memory, because this exact detail changed across Astro versions.
- An empty/non-existent collection directory (e.g. `schools/hu/` with zero files) doesn't break the build — you get a harmless `The collection "schools" does not exist or is empty` warning per `getCollection` call, and an empty array. Fine to leave a category scaffolded-but-unseeded.
- Astro's built-in `i18n` config (the `i18n: {locales, defaultLocale}` option in `astro.config.mjs`) is for folder-per-locale page routing (`src/pages/en/`, `src/pages/fr/`) and wasn't used here — this project's locale is a content *data* field plus a `[locale]` dynamic route param instead, because content is data-driven (categories × locale), not a fixed set of translated pages. Don't add the `i18n` config option here without rethinking the routing — it'll fight the dynamic-route approach.
- Leaflet + Vite: the default marker icon breaks under bundling unless you explicitly `import iconUrl from 'leaflet/dist/images/marker-icon.png'` (etc.) and pass them to `L.Icon.Default.mergeOptions(...)`. Without this, markers render with a broken-image icon.
