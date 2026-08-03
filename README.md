# Adhkar API

A lightweight REST API for **adhkar / zekr** (Islamic supplications), built with
[Hono](https://hono.dev). It serves 27 categories and 103 supplications, each
with Arabic text, a virtue/description, a source reference, and optional audio
and embedded Qur'an passages. It also resolves playable Qur'an recitation URLs
across multiple everyayah.com reciters.

## Project layout

```
adhkar-api/
├── data/                 # Source JSON dataset (27 category files + _index.json)
├── assets/               # Static media: icons/<category>/, audio/<category>/
├── scripts/              # Cross-platform build helpers (clean, copy-assets, migrate-media)
├── src/
│   ├── types.ts          # Shared TypeScript types (data + API shapes)
│   ├── data.ts           # Loads JSON into in-memory indexes (no deps)
│   ├── audio.ts          # Reciter registry + ayah audio URL resolution (no deps)
│   ├── service.ts        # Pure query/filter logic (no deps)
│   └── index.ts          # Hono HTTP server wiring routes to the service
├── sdk/
│   └── client.ts         # Fetch-based TypeScript client SDK
├── test/
│   └── service.test.ts   # Dependency-free test harness for the service layer
├── openapi.yaml          # OpenAPI 3.0 specification
├── package.json
└── tsconfig.json
```

The **data + query layers are framework-agnostic**: `index.ts` (Hono) is just a
thin HTTP adapter over `service.ts`, so the core logic is easy to test or reuse
in another runtime (serverless, Bun, Deno, etc.).

## Data model (v2 structured schema)

Each supplication is stored as a **structured, scalable record** rather than a
flat row with bare filenames. The golden rule: *store logical structure + stable
IDs + paths, never just filenames.*

```jsonc
{
  "id": 77,                      // globally unique numeric id
  "slug": "adhan-1",             // stable, URL-safe identifier
  "category": "adhan",           // category slug
  "categoryTitle": "أذكار الأذان",
  "content": { "ar": "...", "en": null },        // localizable text
  "description": { "ar": "...", "en": null },    // localizable note
  "meta": { "reference": "البخاري 152:1", "count": 1 },
  "media": {
    "audio": [
      { "reciter": "default", "src": "/assets/audio/adhan/1.mp3", "duration": null }
    ]
  }
  // optional: "quran": { basmala, ayahs[] }
}
```

Each category file (`adhkar_*.json`) carries a single representative icon at the
top level — one image for the whole category, not one per item:

```jsonc
{
  "title": "أذكار الأذان",
  "icon": { "src": "/assets/icons/adhan/1.png", "alt": "أذكار الأذان" },
  "items": [ /* ... */ ]
}
```

Why this shape:

- **Scalable** — IDs and slugs are stable; the dataset grows to thousands of
  entries without name collisions.
- **Multi-reciter** — `media.audio` is an array, so additional reciters are just
  more entries.
- **Localization-ready** — `content`/`description` carry `ar` now and `en`
  (or any locale) later.
- **CDN-ready** — media `src` values are logical web paths, so you can swap
  `/assets/...` for a CDN origin without touching the data.
- **Mobile-ready** — a predictable, typed shape for Flutter / React Native
  clients.

### Static assets

Media lives under `assets/`, organised by kind and category:

```
assets/
├── icons/
│   ├── adhan/1.png
│   └── the-morning/1.png ...
└── audio/
    ├── adhan/1.mp3
    └── the-morning/1.mp3 ...
```

The server exposes these over HTTP via Hono's static middleware:

```ts
app.use("/assets/*", serveStatic({ root: "./assets", rewriteRequestPath: (p) => p.replace(/^\/assets/, "") }))
```

so a record's `media.audio[0].src` (`/assets/audio/adhan/1.mp3`) is directly
playable. `npm run build` copies `assets/` into `dist/` for standalone
deployment. To move to a CDN later, serve `assets/` from the CDN and rewrite the
`src` prefix — no data changes required.

> **Note on binaries:** the dataset ships with the full folder layout and correct
> `src` paths, but the actual `.png`/`.mp3` files are placeholders (`.gitkeep`).
> Drop your real media into the matching `assets/icons/<category>/<n>.png` and
> `assets/audio/<category>/<n>.mp3` paths and they are served immediately.
> `duration` is `null` until measured from the real audio.

## Getting started
```bash
npm install      # installs hono + @hono/node-server
npm run dev      # start with hot reload (tsx watch, NODE_ENV=development)
# or, for a production build:
npm run build    # clean dist, compile to dist/, and bundle data/ + openapi.yaml
npm start        # node dist/index.js
npm run start:prod   # same, with NODE_ENV=production
```

`npm run build` is cross-platform (Windows/macOS/Linux): it runs `npm run clean`
(removes `dist/`), compiles `src/` to `dist/`, then copies `data/` and
`openapi.yaml` into `dist/` so the compiled output can be deployed on its own.

The server listens on `http://localhost:3000` (override with `PORT`).
Point `ADHKAR_DATA_DIR` at a different data folder if needed; otherwise the
server auto-detects the dataset next to the compiled files (`dist/data`) or at
the project root.

```bash
npm test         # run the service-layer tests (no server required)
npm run typecheck
```

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/` | API info and endpoint list |
| GET | `/health` | Health check |
| GET | `/openapi.yaml` | OpenAPI 3.0 spec |
| GET | `/api/v1/meta` | Dataset metadata (version, totals) |
| GET | `/api/v1/categories` | List all categories |
| GET | `/api/v1/categories/:slug` | A category with all its items |
| GET | `/api/v1/categories/:slug/items` | Items of a category |
| GET | `/api/v1/categories/:slug/items/:index` | A single item by index |
| GET | `/api/v1/adhkar` | Flattened list with filters |
| GET | `/api/v1/search?q=` | Full-text search (Arabic) |
| GET | `/api/v1/random` | A random dhikr (optional `?category=`) |
| GET | `/api/v1/audio/reciters` | List available reciters / audio sources |
| GET | `/api/v1/audio/ayah/:surah/:ayah` | Resolve audio URL(s) for an ayah (optional `?reciter=`) |

> **Versioning:** the API is served under `/api/v1/*`. The same routes also
> remain available unversioned under `/api/*` as a backward-compatible alias.

## Audio resolution

The dataset stores ayah audio as `SSSAAA.mp3` filenames (3-digit surah + 3-digit
ayah, e.g. `112001.mp3` = surah 112, ayah 1). The audio layer maps a
`(surah, ayah)` pair to playable URLs from everyayah.com using the convention:

- **everyayah** — `https://everyayah.com/data/<path>/<SSS><AAA>.mp3`

Bundled reciters: `husary`, `minshawy-murattal`, `yasser-ad-dussary`,
`warsh-yassin-al-jazaery`, and `ghamadi`.

Passing `?reciter=<id>` to any item endpoint (`/api/v1/categories/:slug`,
`/api/v1/categories/:slug/items`, `/api/v1/categories/:slug/items/:index`,
`/api/v1/adhkar`) enriches each embedded Qur'an ayah (and basmala) with a
resolved `audioUrl` for that reciter.

### Query parameters for `/api/v1/adhkar`

| Param | Type | Notes |
| ----- | ---- | ----- |
| `category` | string | Filter by category slug |
| `q` | string | Substring match over zekr/description/reference/category |
| `hasAudio` | boolean | Only items with (or without) audio |
| `hasQuran` | boolean | Only items with (or without) an embedded Qur'an passage |
| `limit` | integer | 1–200, default 50 |
| `offset` | integer | default 0 |

## Category slugs

Slugs are derived from the source filenames, e.g. `adhkar_the_morning` →
`the-morning`. Examples: `the-morning`, `evening`, `sleep`, `waking-up`,
`after-prayer`, `prayer-opening`, `after-tashahhud`, `bowing`, `lifting-bowing`,
`prostration`, `adhan`, `between-sujood`, `enter-mosque`, `exit-mosque`,
`before-ablution`, `after-ablution`, `before-meal`, `after-meal`, `travel`,
`istikharah`, `enter-home`, `exit-home`, `wearing-clothes`,
`wearing-new-clothes`, `put-clothes`, `enter-bathroom`, `exit-bathroom`.

## Example requests

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/meta
curl http://localhost:3000/api/v1/categories
curl http://localhost:3000/api/v1/categories/the-morning
curl "http://localhost:3000/api/v1/adhkar?hasQuran=true&limit=5"
curl "http://localhost:3000/api/v1/search?q=%D8%A7%D9%84%D9%84%D9%87%D9%85"
curl http://localhost:3000/api/v1/random?category=evening
curl http://localhost:3000/api/v1/audio/reciters
curl http://localhost:3000/api/v1/audio/ayah/3/191
curl "http://localhost:3000/api/v1/audio/ayah/2/255?reciter=husary"
curl "http://localhost:3000/api/v1/adhkar?hasQuran=true&reciter=husary&limit=3"
```

## Using the client SDK

> The SDK is optional and simply wraps the raw HTTP endpoints.
> It is built on the standard `fetch` API, so it is safe to use in both Node.js
> (18+) and browser environments.

```ts
import { AdhkarClient } from "./sdk/client.js"

const client = new AdhkarClient({ baseUrl: "http://localhost:3000" })

const categories = await client.listCategories()
const morning = await client.getCategory("the-morning")
const withQuran = await client.listAdhkar({ hasQuran: true, limit: 10 })
const hit = await client.search("اللهم")
const random = await client.random("evening")
const reciters = await client.listReciters()
const ayahAudio = await client.ayahAudio(3, 191) // all sources
const husaryUrl = await client.ayahAudio(2, 255, "husary")
const morningWithAudio = await client.getCategory("the-morning", { reciter: "husary" })
```

## Data model

Each item:

```jsonc
{
  "category": "أذكار الصباح",
  "count": "3",
  "description": "…virtue / note…",
  "reference": "سورة الإخلاص",
  "zekr": "… Arabic text …",
  "icon": "sun_icon.png",
  "audio": "after_ablution_1.mp3",   // optional
  "quran": {                          // optional
    "basmala": { "text": "…", "audio": "112000.mp3" },
    "ayahs": [{ "number": 1, "text": "…", "audio": "112001.mp3" }]
  }
}
```

## License

MIT (code). The supplication texts are religious source material.
