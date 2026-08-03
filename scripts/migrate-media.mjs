/**
 * One-time data migration: filename strings -> structured, scalable schema.
 *
 * Transforms every data/adhkar_*.json item from the legacy shape
 *   { category, count, description, reference, zekr, icon, audio, quran? }
 * into the structured shape
 *   { id, slug, category, categoryTitle, content{ar,en}, description{ar,en},
 *     meta{reference,count}, media{icon,audio[]}, quran? }
 * and builds the assets/ folder layout (icons/<slug>/, audio/<slug>/).
 *
 * Idempotent: items already migrated (have `content`) are left untouched.
 * The embedded Qur'an block is preserved verbatim (its ayah audio is resolved
 * separately via everyayah.com, not from /assets).
 *
 * Run:  node scripts/migrate-media.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const ASSETS_DIR = path.join(ROOT, "assets")

/** "adhkar_the_morning" -> "the-morning" */
function fileIdToSlug(fileId) {
	return fileId.replace(/^adhkar_/, "").replace(/_/g, "-")
}

/** Extension of a filename (without dot), defaulting when absent. */
function extOf(filename, fallback) {
	const m = /\.([a-z0-9]+)$/i.exec(filename ?? "")
	return m ? m[1].toLowerCase() : fallback
}

function toCount(raw) {
	const n = Number(raw)
	return Number.isFinite(n) ? n : raw
}

const indexPath = path.join(DATA_DIR, "_index.json")
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"))

let globalId = 0
let migratedItems = 0
let migratedFiles = 0

for (const fileId of Object.keys(index.files)) {
	const filePath = path.join(DATA_DIR, `${fileId}.json`)
	if (!fs.existsSync(filePath)) continue
	const slug = fileIdToSlug(fileId)
	const file = JSON.parse(fs.readFileSync(filePath, "utf8"))
	let fileChanged = false

	file.items = file.items.map((item, i) => {
		const n = i + 1
		globalId += 1
		const id = globalId

		// Already migrated: keep, but ensure a stable id/slug.
		if (item && typeof item === "object" && "content" in item) {
			return item
		}

		fileChanged = true
		migratedItems += 1

		const icon = item.icon
			? {
					src: `/assets/icons/${slug}/${n}.${extOf(item.icon, "png")}`,
					alt: file.title,
			  }
			: null

		const audio = item.audio
			? [
					{
						reciter: "default",
						src: `/assets/audio/${slug}/${n}.${extOf(item.audio, "mp3")}`,
						duration: null,
					},
			  ]
			: []

		const migrated = {
			id,
			slug: `${slug}-${n}`,
			category: slug,
			categoryTitle: file.title,
			content: { ar: item.zekr ?? "", en: null },
			description: { ar: item.description ?? null, en: null },
			meta: { reference: item.reference ?? null, count: toCount(item.count) },
			media: { icon, audio },
		}
		if (item.quran) migrated.quran = item.quran
		return migrated
	})

	if (fileChanged) migratedFiles += 1
	fs.writeFileSync(filePath, JSON.stringify(file, null, 2) + "\n", "utf8")

	// Build the asset folder layout for this category.
	for (const kind of ["icons", "audio"]) {
		const dir = path.join(ASSETS_DIR, kind, slug)
		fs.mkdirSync(dir, { recursive: true })
		const keep = path.join(dir, ".gitkeep")
		if (!fs.existsSync(keep)) fs.writeFileSync(keep, "")
	}
}

// Refresh the index metadata to reflect the new schema version.
index.version = "2.0"
index.description =
	"Zekr (Islamic Supplications) - structured schema (id, slug, content, meta, media)"
index.total_items = globalId
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8")

console.log(
	`Migrated ${migratedItems} items across ${migratedFiles} files (total ${globalId}).`,
)
