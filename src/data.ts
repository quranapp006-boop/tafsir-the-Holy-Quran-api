/**
 * Data loading layer. Reads every `adhkar_*.json` file plus `_index.json`
 * from the data directory and builds in-memory indexes. Framework-agnostic
 * and dependency-free so it can be reused and tested in isolation.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type {
	AdhkarFile,
	AdhkarIndexFile,
	AdhkarItem,
	AdhkarItemWithMeta,
	Category,
} from "./types.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Resolve the data directory in priority order:
 *   1. ADHKAR_DATA_DIR env var (explicit override)
 *   2. <dir>/data        — a standalone build (dist/data, copied at build time)
 *   3. <dir>/../data     — dev (src/../data) or a full-project deploy (dist/../data)
 * Falls back to the last candidate so loadStore can throw a clear error.
 */
function resolveDataDir(): string {
	if (process.env.ADHKAR_DATA_DIR) {
		return path.resolve(process.env.ADHKAR_DATA_DIR)
	}
	const candidates = [
		path.resolve(__dirname, "data"),
		path.resolve(__dirname, "..", "data"),
	]
	for (const dir of candidates) {
		if (fs.existsSync(path.join(dir, "_index.json"))) return dir
	}
	return candidates[candidates.length - 1]
}

/** Absolute path to the directory holding the JSON data files. */
export const DATA_DIR = resolveDataDir()

/** Convert a source file id like "adhkar_the_morning" into slug "the-morning". */
export function fileIdToSlug(fileId: string): string {
	return fileId.replace(/^adhkar_/, "").replace(/_/g, "-")
}

export interface AdhkarStore {
	index: AdhkarIndexFile
	categories: Category[]
	/** slug -> category */
	categoryBySlug: Map<string, Category>
	/** slug -> ordered items */
	itemsBySlug: Map<string, AdhkarItem[]>
	/** every item, flattened, with category + index metadata */
	allItems: AdhkarItemWithMeta[]
}

function readJson<T>(file: string): T {
	return JSON.parse(fs.readFileSync(file, "utf8")) as T
}

/**
 * Load the entire dataset from {@link DATA_DIR} into memory.
 * Throws if the data directory or index file is missing.
 */
export function loadStore(dataDir: string = DATA_DIR): AdhkarStore {
	const indexPath = path.join(dataDir, "_index.json")
	if (!fs.existsSync(indexPath)) {
		throw new Error(`Adhkar index not found at ${indexPath}`)
	}
	const index = readJson<AdhkarIndexFile>(indexPath)

	const categories: Category[] = []
	const categoryBySlug = new Map<string, Category>()
	const itemsBySlug = new Map<string, AdhkarItem[]>()
	const allItems: AdhkarItemWithMeta[] = []

	// Preserve the ordering declared in _index.json's `files` map.
	for (const fileId of Object.keys(index.files)) {
		const filePath = path.join(dataDir, `${fileId}.json`)
		if (!fs.existsSync(filePath)) continue
		const file = readJson<AdhkarFile>(filePath)
		const slug = fileIdToSlug(fileId)
		const category: Category = {
			slug,
			fileId,
			title: file.title,
			count: file.items.length,
			icon: file.icon ?? null,
		}
		categories.push(category)
		categoryBySlug.set(slug, category)
		itemsBySlug.set(slug, file.items)
		file.items.forEach((item, i) => {
			allItems.push({ ...item, categorySlug: slug, index: i })
		})
	}

	return { index, categories, categoryBySlug, itemsBySlug, allItems }
}
