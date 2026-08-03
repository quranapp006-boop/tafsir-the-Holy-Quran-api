/**
 * Query/service layer. Pure functions over an {@link AdhkarStore}, with no
 * dependency on any HTTP framework. This is what both the Hono server and the
 * test harness call into.
 */
import type {
	AdhkarItem,
	AdhkarItemWithMeta,
	ApiMeta,
	Category,
	Paginated,
	Quran,
} from "./types.js"
import type { AdhkarStore } from "./data.js"
import {
	DEFAULT_RECITER_ID,
	getReciter,
	resolveFilenameUrl,
} from "./audio.js"

export interface ListItemsQuery {
	category?: string
	q?: string
	hasAudio?: boolean
	hasQuran?: boolean
	limit?: number
	offset?: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function clampLimit(limit?: number): number {
	if (limit == null || Number.isNaN(limit)) return DEFAULT_LIMIT
	return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)))
}

function clampOffset(offset?: number): number {
	if (offset == null || Number.isNaN(offset) || offset < 0) return 0
	return Math.floor(offset)
}

export function getMeta(store: AdhkarStore): ApiMeta {
	return {
		version: store.index.version,
		description: store.index.description,
		totalCategories: store.categories.length,
		totalItems: store.allItems.length,
	}
}

export function listCategories(store: AdhkarStore): Category[] {
	return store.categories
}

export function getCategory(
	store: AdhkarStore,
	slug: string,
): Category | undefined {
	return store.categoryBySlug.get(slug)
}

export function getCategoryItems(
	store: AdhkarStore,
	slug: string,
): AdhkarItem[] | undefined {
	return store.itemsBySlug.get(slug)
}

export function getItem(
	store: AdhkarStore,
	slug: string,
	index: number,
): AdhkarItem | undefined {
	const items = store.itemsBySlug.get(slug)
	if (!items) return undefined
	return items[index]
}

/** Case-insensitive substring match across the searchable Arabic text fields. */
function matchesQuery(item: AdhkarItemWithMeta, q: string): boolean {
	const needle = q.trim()
	if (!needle) return true
	const haystack = [
		item.content.ar,
		item.content.en,
		item.description.ar,
		item.description.en,
		item.meta.reference,
		item.categoryTitle,
	]
		.filter((s): s is string => Boolean(s))
		.join("\n")
	return haystack.includes(needle)
}

export function listItems(
	store: AdhkarStore,
	query: ListItemsQuery = {},
): Paginated<AdhkarItemWithMeta> {
	let items = store.allItems
	if (query.category) {
		items = items.filter((it) => it.categorySlug === query.category)
	}
	if (query.q) {
		items = items.filter((it) => matchesQuery(it, query.q!))
	}
	if (query.hasAudio != null) {
		items = items.filter(
			(it) => it.media.audio.length > 0 === query.hasAudio,
		)
	}
	if (query.hasQuran != null) {
		items = items.filter((it) => Boolean(it.quran) === query.hasQuran)
	}

	const total = items.length
	const limit = clampLimit(query.limit)
	const offset = clampOffset(query.offset)
	const page = items.slice(offset, offset + limit)
	return { total, limit, offset, count: page.length, items: page }
}

export function searchItems(
	store: AdhkarStore,
	q: string,
	opts: { limit?: number; offset?: number } = {},
): Paginated<AdhkarItemWithMeta> {
	return listItems(store, { q, limit: opts.limit, offset: opts.offset })
}

/**
 * Return a copy of an embedded Qur'an block with each ayah (and basmala)
 * enriched with a resolved `audioUrl` for the given reciter. Items without
 * a parseable audio filename are left unchanged.
 */
export function enrichQuranAudio(quran: Quran, reciterId: string): Quran {
	const basmala = quran.basmala
		? {
				...quran.basmala,
				audioUrl: quran.basmala.audio
					? resolveFilenameUrl(quran.basmala.audio, reciterId)
					: undefined,
			}
		: undefined
	return {
		...quran,
		basmala,
		ayahs: quran.ayahs.map((a) => ({
			...a,
			audioUrl: a.audio ? resolveFilenameUrl(a.audio, reciterId) : undefined,
		})),
	}
}

/** Enrich a single item's embedded Qur'an block (if any) with audio URLs. */
export function enrichItemAudio<T extends AdhkarItem>(
	item: T,
	reciterId: string | undefined,
): T {
	if (!reciterId || !item.quran) return item
	if (!getReciter(reciterId)) return item
	return { ...item, quran: enrichQuranAudio(item.quran, reciterId) }
}

/** Default reciter id used when a request asks for audio without naming one. */
export function defaultReciterId(): string {
	return DEFAULT_RECITER_ID
}

export function randomItem(
	store: AdhkarStore,
	categorySlug?: string,
): AdhkarItemWithMeta | undefined {
	const pool = categorySlug
		? store.allItems.filter((it) => it.categorySlug === categorySlug)
		: store.allItems
	if (pool.length === 0) return undefined
	return pool[Math.floor(Math.random() * pool.length)]
}
