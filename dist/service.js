import { DEFAULT_RECITER_ID, getReciter, resolveFilenameUrl, } from "./audio.js";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
function clampLimit(limit) {
    if (limit == null || Number.isNaN(limit))
        return DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}
function clampOffset(offset) {
    if (offset == null || Number.isNaN(offset) || offset < 0)
        return 0;
    return Math.floor(offset);
}
export function getMeta(store) {
    return {
        version: store.index.version,
        description: store.index.description,
        totalCategories: store.categories.length,
        totalItems: store.allItems.length,
    };
}
export function listCategories(store) {
    return store.categories;
}
export function getCategory(store, slug) {
    return store.categoryBySlug.get(slug);
}
export function getCategoryItems(store, slug) {
    return store.itemsBySlug.get(slug);
}
export function getItem(store, slug, index) {
    const items = store.itemsBySlug.get(slug);
    if (!items)
        return undefined;
    return items[index];
}
/** Case-insensitive substring match across the searchable Arabic text fields. */
function matchesQuery(item, q) {
    const needle = q.trim();
    if (!needle)
        return true;
    const haystack = [
        item.content.ar,
        item.content.en,
        item.description.ar,
        item.description.en,
        item.meta.reference,
        item.categoryTitle,
    ]
        .filter((s) => Boolean(s))
        .join("\n");
    return haystack.includes(needle);
}
export function listItems(store, query = {}) {
    let items = store.allItems;
    if (query.category) {
        items = items.filter((it) => it.categorySlug === query.category);
    }
    if (query.q) {
        items = items.filter((it) => matchesQuery(it, query.q));
    }
    if (query.hasAudio != null) {
        items = items.filter((it) => it.media.audio.length > 0 === query.hasAudio);
    }
    if (query.hasQuran != null) {
        items = items.filter((it) => Boolean(it.quran) === query.hasQuran);
    }
    const total = items.length;
    const limit = clampLimit(query.limit);
    const offset = clampOffset(query.offset);
    const page = items.slice(offset, offset + limit);
    return { total, limit, offset, count: page.length, items: page };
}
export function searchItems(store, q, opts = {}) {
    return listItems(store, { q, limit: opts.limit, offset: opts.offset });
}
/**
 * Return a copy of an embedded Qur'an block with each ayah (and basmala)
 * enriched with a resolved `audioUrl` for the given reciter. Items without
 * a parseable audio filename are left unchanged.
 */
export function enrichQuranAudio(quran, reciterId) {
    const basmala = quran.basmala
        ? {
            ...quran.basmala,
            audioUrl: quran.basmala.audio
                ? resolveFilenameUrl(quran.basmala.audio, reciterId)
                : undefined,
        }
        : undefined;
    return {
        ...quran,
        basmala,
        ayahs: quran.ayahs.map((a) => ({
            ...a,
            audioUrl: a.audio ? resolveFilenameUrl(a.audio, reciterId) : undefined,
        })),
    };
}
/** Enrich a single item's embedded Qur'an block (if any) with audio URLs. */
export function enrichItemAudio(item, reciterId) {
    if (!reciterId || !item.quran)
        return item;
    if (!getReciter(reciterId))
        return item;
    return { ...item, quran: enrichQuranAudio(item.quran, reciterId) };
}
/** Default reciter id used when a request asks for audio without naming one. */
export function defaultReciterId() {
    return DEFAULT_RECITER_ID;
}
export function randomItem(store, categorySlug) {
    const pool = categorySlug
        ? store.allItems.filter((it) => it.categorySlug === categorySlug)
        : store.allItems;
    if (pool.length === 0)
        return undefined;
    return pool[Math.floor(Math.random() * pool.length)];
}
//# sourceMappingURL=service.js.map