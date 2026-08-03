/**
 * Lightweight test harness for the framework-agnostic service layer.
 * Runs without any HTTP server or external dependency: `npm test`.
 */
import assert from "node:assert/strict"
import { loadStore } from "../src/data.js"
import {
	enrichItemAudio,
	getCategory,
	getItem,
	getMeta,
	listCategories,
	listItems,
	randomItem,
	searchItems,
} from "../src/service.js"
import {
	buildAudioUrl,
	getReciter,
	parseAudioFilename,
	resolveAyahAudio,
	RECITERS,
} from "../src/audio.js"

let passed = 0
function test(name: string, fn: () => void) {
	fn()
	passed++
	console.log(`  \u2713 ${name}`)
}

const store = loadStore()

test("loads all categories", () => {
	const cats = listCategories(store)
	assert.equal(cats.length, store.index.total_files)
	assert.ok(cats.every((c) => c.slug && c.title))
})

test("meta totals are computed from actual data", () => {
	const meta = getMeta(store)
	const sumOfCategoryCounts = store.categories.reduce((n, c) => n + c.count, 0)
	// The API is authoritative: totals are derived from the loaded files,
	// not from the (occasionally stale) aggregate fields in _index.json.
	assert.equal(meta.totalItems, store.allItems.length)
	assert.equal(meta.totalItems, sumOfCategoryCounts)
	assert.equal(meta.totalCategories, store.categories.length)
})

test("resolves a known category by slug", () => {
	const cat = getCategory(store, "the-morning")
	assert.ok(cat, "the-morning category exists")
	assert.equal(cat!.fileId, "adhkar_the_morning")
})

test("gets a single item by index", () => {
	const item = getItem(store, "the-morning", 0)
	assert.ok(item)
	assert.ok(item!.content.ar && item!.content.ar.length > 0)
})

test("filters by hasQuran", () => {
	const withQuran = listItems(store, { hasQuran: true, limit: 200 })
	assert.ok(withQuran.total > 0)
	assert.ok(withQuran.items.every((it) => Boolean(it.quran)))
})

test("filters by hasAudio", () => {
	const withAudio = listItems(store, { hasAudio: true, limit: 200 })
	assert.ok(withAudio.total > 0)
	assert.ok(withAudio.items.every((it) => it.media.audio.length > 0))
})

test("items use the structured (v2) schema", () => {
	const item = getItem(store, "adhan", 0)!
	assert.ok(item)
	assert.equal(typeof item.id, "number")
	assert.equal(item.slug, "adhan-1")
	assert.equal(item.category, "adhan")
	assert.ok(item.content.ar && item.content.ar.length > 0)
	assert.ok(Array.isArray(item.media.audio))
	assert.equal(item.media.audio[0].src, "/assets/audio/adhan/1.mp3")
})

test("each category exposes a single representative icon", () => {
	const category = store.categoryBySlug.get("adhan")!
	assert.ok(category)
	assert.equal(category.icon?.src, "/assets/icons/adhan/1.png")
})

test("all item ids are unique", () => {
	const all = listItems(store, { limit: 200 }).items
	const ids = new Set(all.map((it) => it.id))
	assert.equal(ids.size, all.length)
})

test("pagination honours limit/offset", () => {
	const page = listItems(store, { limit: 10, offset: 5 })
	assert.equal(page.limit, 10)
	assert.equal(page.offset, 5)
	assert.ok(page.items.length <= 10)
})

test("search finds Arabic text", () => {
	const res = searchItems(store, "اللَّهُمَّ")
	assert.ok(res.total > 0)
})

test("random returns an item from a category", () => {
	const item = randomItem(store, "evening")
	assert.ok(item)
	assert.equal(item!.categorySlug, "evening")
})

test("parses SSSAAA audio filenames", () => {
	assert.deepEqual(parseAudioFilename("112001.mp3"), { surah: 112, ayah: 1 })
	assert.deepEqual(parseAudioFilename("002255.mp3"), { surah: 2, ayah: 255 })
	assert.equal(parseAudioFilename("after_ablution_1.mp3"), undefined)
})

test("builds everyayah URLs matching the known convention", () => {
	const husary = getReciter("husary")!
	assert.equal(
		buildAudioUrl(husary, 3, 191),
		"https://everyayah.com/data/Husary_128kbps/003191.mp3",
	)
	const warsh = getReciter("warsh-yassin-al-jazaery")!
	assert.equal(
		buildAudioUrl(warsh, 3, 191),
		"https://everyayah.com/data/warsh/warsh_yassin_al_jazaery_64kbps/003191.mp3",
	)
})

test("builds the Ghamadi everyayah URL", () => {
	const ghamadi = getReciter("ghamadi")!
	assert.equal(
		buildAudioUrl(ghamadi, 3, 191),
		"https://everyayah.com/data/Ghamadi_40kbps/003191.mp3",
	)
})

test("resolveAyahAudio returns all sources or a single one", () => {
	const all = resolveAyahAudio(3, 191)!
	assert.equal(Object.keys(all.sources).length, RECITERS.length)
	const one = resolveAyahAudio(3, 191, "husary")!
	assert.deepEqual(Object.keys(one.sources), ["husary"])
	assert.equal(resolveAyahAudio(3, 191, "nope"), undefined)
})

test("enrichItemAudio adds audioUrl to quran ayahs", () => {
	const withQuran = listItems(store, { hasQuran: true, limit: 1 }).items[0]
	const enriched = enrichItemAudio(withQuran, "husary")
	assert.ok(enriched.quran)
	assert.ok(enriched.quran!.ayahs.every((a) => a.audioUrl?.startsWith("https://")))
	// Original item is not mutated.
	assert.equal(withQuran.quran!.ayahs[0].audioUrl, undefined)
})

console.log(`\nAll ${passed} tests passed.`)
