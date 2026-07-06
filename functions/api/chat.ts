// Cloudflare Pages Function — POST /api/chat
//
// This is the project's ONLY server-side code. The whole site is otherwise a
// static build (see docs/deployment.md). It exists for one reason: the Ollama
// Cloud API key must never ship to the browser, so the LLM call has to run on
// the edge. The function is deliberately thin and STATELESS — it receives the
// full conversation each call, prepends the system prompt, attaches the tool
// definitions, adds the Authorization header, and proxies to Ollama Cloud. It
// does NOT run the tool loop and never touches the content dataset — the tools
// execute client-side against the already-loaded /db/content.json (privacy: the
// content lookups never leave the browser, only the conversation text does).
//
// Env bindings (set in Cloudflare Pages → Settings → Environment variables, and
// in a local .env for `wrangler pages dev`):
//   OLLAMA_API_KEY  — secret, from https://ollama.com/settings/keys (required)
//   OLLAMA_MODEL    — optional, defaults to a tool-capable cloud model

const OLLAMA_URL = 'https://ollama.com/api/chat';
const DEFAULT_MODEL = 'gpt-oss:120b-cloud';
const MAX_MESSAGES = 60; // guardrail against oversized histories

// Category keys, kept in sync with CATEGORIES in src/content.config.ts. Used to
// constrain the search tool's `category` argument so the model can't invent one.
const CATEGORIES = [
  'articles', 'books', 'communities', 'development', 'diagnosis', 'equipment',
  'food', 'influencers', 'movies', 'podcasts', 'research', 'schools', 'videos',
];

const SYSTEM_PROMPT = `Te a "Neurodiverz Térkép" segítője vagy — egy magyar, ADHD- és autizmus-forrásokat gyűjtő oldal beszélgetős asszisztense. Mindig magyarul válaszolj, közérthetően és tömören.

Az oldal valódi, ellenőrzött forrásokat tartalmaz 13 kategóriában: diagnózis (klinikák), iskolák, fejlesztés (terapeuták), közösségek, segédeszközök, könyvek, podcastok, videók, filmek, cikkek, kutatás, influenszerek, étel/receptek.

Fontos szabályok:
- SOHA ne találj ki forrást, nevet, címet vagy linket. Ha ajánlanál valamit, előbb KERESD MEG a search_resources eszközzel, és csak a valóban visszakapott találatokból dolgozz.
- Amikor konkrét forrást ajánlasz, jelenítsd meg a show_resource eszközzel (kártyaként), vagy adj rá kattintható linket a link_to eszközzel — ne csak a szövegben említsd.
- Ha a felhasználót egy oldalra irányítanád (pl. térkép, egy kategória listája), használd a link_to eszközt a megfelelő útvonallal.
- Ha nincs találat, mondd meg őszintén, és javasolj tágabb keresést vagy másik kategóriát.
- Nem adsz orvosi diagnózist vagy kezelési tanácsot. Sürgős esetben irányítsd szakemberhez.

Belső útvonalak linkekhez: "/map" (térkép), "/web/<kategória>" (böngészhető listák: books, podcasts, videos, equipment, movies, food, articles, research), "/hu/<kategória>/" (kategória listaoldala), "/hu/<kategória>/<slug>/" (egy forrás részletes oldala — ezt a search_resources adja vissza href-ként), "/rolunk", "/gyik".`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_resources',
      description:
        'Valódi forrásokat keres az oldal adatbázisában (kliens oldalon fut a betöltött adathalmazon). Mindig ezt használd, mielőtt bármit ajánlanál. Magyar kulcsszavakkal keress.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Keresőkifejezés, magyarul (pl. "felnőtt ADHD terapeuta", "autizmus könyv").' },
          category: { type: 'string', enum: CATEGORIES, description: 'Szűkítés egy kategóriára (opcionális).' },
          topic: { type: 'string', enum: ['adhd', 'autism'], description: 'Szűkítés ADHD-ra vagy autizmusra (opcionális).' },
          ageGroup: { type: 'string', enum: ['children', 'adults', 'both'], description: 'Korosztály szerinti szűrés (opcionális).' },
          city: { type: 'string', description: 'Város szerinti szűrés a helyhez kötött kategóriákhoz, pl. "Budapest", "Szeged" (opcionális).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_resource',
      description: 'Egy konkrét forrás összes részletét visszaadja a href alapján (amit a search_resources adott).',
      parameters: {
        type: 'object',
        required: ['href'],
        properties: {
          href: { type: 'string', description: 'A forrás href-je, pl. "/hu/diagnosis/vadaskert-alapitvany/".' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_resource',
      description: 'Megjelenít egy forrást kártyaként a beszélgetésben (borító, cím, összegzés, részletek link). Használd, amikor konkrét forrást ajánlasz.',
      parameters: {
        type: 'object',
        required: ['href'],
        properties: {
          href: { type: 'string', description: 'A megjelenítendő forrás href-je.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'link_to',
      description: 'Kattintható linket/gombot jelenít meg a válaszban egy oldalra vagy forrásra (belső útvonal vagy egy forrás href-je).',
      parameters: {
        type: 'object',
        required: ['href', 'label'],
        properties: {
          href: { type: 'string', description: 'Cél útvonal, pl. "/map" vagy "/web/books" vagy egy forrás href-je.' },
          label: { type: 'string', description: 'A link felirata, magyarul.' },
        },
      },
    },
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  const apiKey = env.OLLAMA_API_KEY;
  if (!apiKey) {
    return json(
      { error: 'A beszélgetős segítő jelenleg nincs beállítva (hiányzó API-kulcs). Próbáld később.' },
      503
    );
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Érvénytelen kérés.' }, 400);
  }

  const messages = payload?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'Érvénytelen kérés.' }, 400);
  }
  if (messages.length > MAX_MESSAGES) {
    return json({ error: 'A beszélgetés túl hosszú. Kezdj újat.' }, 413);
  }

  const model = env.OLLAMA_MODEL || DEFAULT_MODEL;

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        tools: TOOLS,
        stream: false,
      }),
    });
  } catch {
    return json({ error: 'Nem sikerült elérni a nyelvi modellt. Próbáld újra.' }, 502);
  }

  if (!ollamaRes.ok) {
    const detail = await ollamaRes.text().catch(() => '');
    return json(
      { error: 'A nyelvi modell hibát adott vissza. Próbáld újra később.', status: ollamaRes.status, detail: detail.slice(0, 500) },
      502
    );
  }

  let data: any;
  try {
    data = await ollamaRes.json();
  } catch {
    return json({ error: 'Váratlan válasz a nyelvi modelltől.' }, 502);
  }

  // Return just the assistant message; the client runs the tool loop.
  return json({ message: data.message ?? { role: 'assistant', content: '' } });
}
