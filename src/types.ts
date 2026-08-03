/**
 * Type definitions for the Adhkar (Islamic supplications) dataset and API.
 * These types describe both the on-disk JSON shape and the API response shapes.
 */

/** A single Qur'an ayah (verse) attached to a dhikr. */
export interface Ayah {
	/** Verse number within its surah. */
	number: number
	/** Arabic text of the verse. */
	text: string
	/** Audio filename for the verse recitation, if available. */
	audio?: string
	/** Resolved external audio URL, populated when a `reciter` is requested. */
	audioUrl?: string
}

/** The Basmala line that precedes a Qur'anic passage. */
export interface Basmala {
	text: string
	audio?: string
	/** Resolved external audio URL, populated when a `reciter` is requested. */
	audioUrl?: string
}

/** Optional Qur'an block embedded in a dhikr (e.g. Surah Al-Ikhlas). */
export interface Quran {
	basmala?: Basmala
	ayahs: Ayah[]
}

/** A piece of text with optional localizations (Arabic is the source). */
export interface LocalizedText {
	ar: string | null
	en: string | null
}

/** A single icon asset reference. */
export interface MediaIcon {
	/** Web path to the icon, e.g. "/assets/icons/adhan/1.png". */
	src: string
	/** Accessible alt text. */
	alt: string
}

/** A single audio asset reference. */
export interface MediaAudio {
	/** Logical reciter / variant id (e.g. "default"). */
	reciter: string
	/** Web path to the audio file, e.g. "/assets/audio/adhan/1.mp3". */
	src: string
	/** Length in seconds, when known (null until the asset is added). */
	duration: number | null
}

/** Structured media: zero or more audio sources. The representative icon now
 * lives once per category file (see {@link AdhkarFile.icon}), not per item. */
export interface Media {
	audio: MediaAudio[]
}

/** Item metadata: source reference + recommended repetition count. */
export interface ItemMeta {
	reference: string | null
	count: number | string
}

/**
 * A single dhikr / supplication item, in the structured (v2) schema.
 * Asset references are stored as logical web paths under /assets, so the
 * dataset is CDN-ready and decoupled from bare filenames.
 */
export interface AdhkarItem {
	/** Globally unique numeric id. */
	id: number
	/** Stable, URL-safe identifier, e.g. "adhan-1". */
	slug: string
	/** Owning category slug, e.g. "adhan". */
	category: string
	/** Arabic title of the owning category. */
	categoryTitle: string
	/** The dhikr text (Arabic source, optional translations). */
	content: LocalizedText
	/** Virtue / explanatory note (Arabic source, optional translations). */
	description: LocalizedText
	/** Source reference + repetition count. */
	meta: ItemMeta
	/** Structured icon + audio assets. */
	media: Media
	/** Optional embedded Qur'an passage. */
	quran?: Quran
}

/** The raw on-disk shape of an `adhkar_*.json` file. */
export interface AdhkarFile {
	title: string
	/** Single representative icon for the whole category. */
	icon: MediaIcon | null
	items: AdhkarItem[]
}

/** The raw on-disk shape of `_index.json`. */
export interface AdhkarIndexFile {
	version: string
	description: string
	total_files: number
	total_items: number
	files: Record<string, number>
	categories: string[]
}

/**
 * A category as exposed by the API. `slug` is a stable, URL-safe identifier
 * derived from the source filename (e.g. "the-morning").
 */
export interface Category {
	/** URL-safe identifier, e.g. "the-morning". */
	slug: string
	/** Original source file id, e.g. "adhkar_the_morning". */
	fileId: string
	/** Arabic title of the category. */
	title: string
	/** Number of items in the category. */
	count: number
	/** Single representative icon for the category. */
	icon: MediaIcon | null
}

/** A dhikr item enriched with its category slug and position. */
export interface AdhkarItemWithMeta extends AdhkarItem {
	/** Slug of the owning category. */
	categorySlug: string
	/** Zero-based index of the item within its category. */
	index: number
}

/** Standard paginated list envelope. */
export interface Paginated<T> {
	total: number
	limit: number
	offset: number
	count: number
	items: T[]
}

/** Top-level metadata returned by `GET /api/meta`. */
export interface ApiMeta {
	version: string
	description: string
	totalCategories: number
	totalItems: number
}

/** Standard error body. */
export interface ApiError {
	error: string
	message: string
}
