/**
 * Hono REST API server for the Adhkar dataset.
 *
 * Run in dev:   npm run dev
 * Run built:    npm run build && npm start
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadStore } from "./data.js";
import { enrichItemAudio, getCategory, getCategoryItems, getItem, getMeta, listCategories, listItems, randomItem, searchItems, } from "./service.js";
import { getReciter, listReciters, resolveAyahAudio } from "./audio.js";
const store = loadStore();
const app = new Hono();
// Versioned API router. Mounted below at /api/v1 (canonical) and /api (alias).
const api = new Hono();
app.use("*", logger());
app.use("*", cors());
// Serve static media assets (icons, audio) from the ./assets directory.
// Dataset paths like "/assets/audio/adhan/1.mp3" resolve to files on disk.
app.use("/assets/*", serveStatic({
    root: "./assets",
    rewriteRequestPath: (p) => p.replace(/^\/assets/, ""),
}));
/** Parse a boolean-ish query value ("true"/"1" => true, "false"/"0" => false). */
function parseBool(value) {
    if (value == null)
        return undefined;
    if (["true", "1", "yes"].includes(value.toLowerCase()))
        return true;
    if (["false", "0", "no"].includes(value.toLowerCase()))
        return false;
    return undefined;
}
function parseIntOr(value) {
    if (value == null)
        return undefined;
    const n = Number.parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
}
// --- Root + health -------------------------------------------------------
app.get("/", (c) => c.json({
    name: "Adhkar API",
    description: "REST API for Islamic supplications (adhkar / zekr).",
    docs: "/openapi.yaml",
    version: "v1",
    endpoints: [
        "GET /health",
        "GET /api/v1/meta",
        "GET /api/v1/categories",
        "GET /api/v1/categories/:slug",
        "GET /api/v1/categories/:slug/items",
        "GET /api/v1/categories/:slug/items/:index",
        "GET /api/v1/adhkar",
        "GET /api/v1/search?q=",
        "GET /api/v1/random",
        "GET /api/v1/audio/reciters",
        "GET /api/v1/audio/ayah/:surah/:ayah",
        "GET /assets/* (static icons & audio)",
    ],
    note: "All /api/v1/* routes are also available unversioned under /api/* for backward compatibility.",
}));
app.get("/health", (c) => c.json({ status: "ok" }));
// Serve the OpenAPI spec so tooling (Swagger UI, codegen) can consume it.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.get("/openapi.yaml", (c) => {
    const specPath = [
        path.resolve(__dirname, "openapi.yaml"),
        path.resolve(__dirname, "..", "openapi.yaml"),
    ].find((p) => fs.existsSync(p));
    if (!specPath)
        return c.json(notFound("file", "openapi.yaml"), 404);
    return c.body(fs.readFileSync(specPath, "utf8"), 200, {
        "Content-Type": "application/yaml",
    });
});
// --- Meta ----------------------------------------------------------------
api.get("/meta", (c) => c.json(getMeta(store)));
// --- Categories ----------------------------------------------------------
api.get("/categories", (c) => c.json({ items: listCategories(store) }));
api.get("/categories/:slug", (c) => {
    const slug = c.req.param("slug");
    const reciter = c.req.query("reciter");
    const category = getCategory(store, slug);
    if (!category)
        return c.json(notFound("category", slug), 404);
    const items = (getCategoryItems(store, slug) ?? []).map((it) => enrichItemAudio(it, reciter));
    return c.json({ ...category, items });
});
api.get("/categories/:slug/items", (c) => {
    const slug = c.req.param("slug");
    const reciter = c.req.query("reciter");
    const items = getCategoryItems(store, slug);
    if (!items)
        return c.json(notFound("category", slug), 404);
    return c.json({
        slug,
        total: items.length,
        items: items.map((it) => enrichItemAudio(it, reciter)),
    });
});
api.get("/categories/:slug/items/:index", (c) => {
    const slug = c.req.param("slug");
    const reciter = c.req.query("reciter");
    const index = Number.parseInt(c.req.param("index"), 10);
    if (Number.isNaN(index))
        return c.json(badRequest("index must be a number"), 400);
    const item = getItem(store, slug, index);
    if (!item)
        return c.json(notFound("item", `${slug}#${index}`), 404);
    return c.json(enrichItemAudio(item, reciter));
});
// --- Flattened list + filters -------------------------------------------
api.get("/adhkar", (c) => {
    const q = c.req.query();
    const page = listItems(store, {
        category: q.category,
        q: q.q,
        hasAudio: parseBool(q.hasAudio),
        hasQuran: parseBool(q.hasQuran),
        limit: parseIntOr(q.limit),
        offset: parseIntOr(q.offset),
    });
    if (q.reciter) {
        page.items = page.items.map((it) => enrichItemAudio(it, q.reciter));
    }
    return c.json(page);
});
// --- Audio ---------------------------------------------------------------
api.get("/audio/reciters", (c) => c.json({ items: listReciters() }));
api.get("/audio/ayah/:surah/:ayah", (c) => {
    const surah = Number.parseInt(c.req.param("surah"), 10);
    const ayah = Number.parseInt(c.req.param("ayah"), 10);
    if (Number.isNaN(surah) || Number.isNaN(ayah)) {
        return c.json(badRequest("surah and ayah must be numbers"), 400);
    }
    const reciter = c.req.query("reciter");
    if (reciter && !getReciter(reciter)) {
        return c.json(notFound("reciter", reciter), 404);
    }
    const resolved = resolveAyahAudio(surah, ayah, reciter);
    if (!resolved)
        return c.json(notFound("reciter", reciter ?? "<any>"), 404);
    return c.json(resolved);
});
// --- Search --------------------------------------------------------------
api.get("/search", (c) => {
    const q = c.req.query("q");
    if (!q)
        return c.json(badRequest("query parameter 'q' is required"), 400);
    return c.json(searchItems(store, q, {
        limit: parseIntOr(c.req.query("limit")),
        offset: parseIntOr(c.req.query("offset")),
    }));
});
// --- Random --------------------------------------------------------------
api.get("/random", (c) => {
    const category = c.req.query("category");
    const item = randomItem(store, category);
    if (!item)
        return c.json(notFound("category", category ?? "<any>"), 404);
    return c.json(item);
});
// Mount the API under a versioned path, keeping /api as a backward-compatible alias.
app.route("/api/v1", api);
app.route("/api", api);
// --- Fallbacks -----------------------------------------------------------
app.notFound((c) => c.json(notFound("route", c.req.path), 404));
app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal_error", message: err.message }, 500);
});
function notFound(kind, id) {
    return { error: "not_found", message: `No ${kind} found for '${id}'.` };
}
function badRequest(message) {
    return { error: "bad_request", message };
}
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
// Only start listening when run directly (not when imported by tests).
if (process.env.ADHKAR_NO_LISTEN !== "1") {
    serve({ fetch: app.fetch, port }, (info) => {
        console.log(`Adhkar API listening on http://localhost:${info.port}`);
    });
}
export { app };
//# sourceMappingURL=index.js.map