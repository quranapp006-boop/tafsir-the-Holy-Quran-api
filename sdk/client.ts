/**
 * Adhkar API client SDK.
 *
 * A tiny, dependency-free, fetch-based TypeScript client. Works in Node 18+
 * (global fetch), browsers, Deno, and Bun.
 *
 * @example
 * ```ts
 * import { AdhkarClient } from "./sdk/client.js"
 * const client = new AdhkarClient({ baseUrl: "http://localhost:3000" })
 * const categories = await client.listCategories()
 * const morning = await client.getCategory("the-morning")
 * ```
 */
import type {
	AdhkarItem,
	AdhkarItemWithMeta,
	ApiMeta,
	Category,
	Paginated,
} from "../src/types.js"
import type { Reciter, ResolvedAyahAudio } from "../src/audio.js"

export interface AdhkarClientOptions {
	/** Base URL of the API, e.g. "http://localhost:3000". */
	baseUrl: string
	/** Optional custom fetch implementation (defaults to global fetch). */
	fetch?: typeof fetch
	/** Optional default headers merged into every request. */
	headers?: Record<string, string>
}

export interface ListAdhkarParams {
	category?: string
	q?: string
	hasAudio?: boolean
	hasQuran?: boolean
	limit?: number
	offset?: number
	/** When set, embedded Qur'an ayahs are enriched with this reciter's audio URLs. */
	reciter?: string
}

/** Error thrown when the API returns a non-2xx response. */
export class AdhkarApiError extends Error {
	readonly status: number
	readonly body: unknown
	constructor(status: number, message: string, body: unknown) {
		super(message)
		this.name = "AdhkarApiError"
		this.status = status
		this.body = body
	}
}

export class AdhkarClient {
	private readonly baseUrl: string
	private readonly fetchImpl: typeof fetch
	private readonly headers: Record<string, string>

	constructor(options: AdhkarClientOptions) {
		this.baseUrl = options.baseUrl.replace(/\/$/, "")
		const f = options.fetch ?? globalThis.fetch
		if (!f) {
			throw new Error(
				"No fetch implementation found. Provide options.fetch on older runtimes.",
			)
		}
		this.fetchImpl = f
		this.headers = options.headers ?? {}
	}

	private async request<T>(path: string, query?: Record<string, unknown>): Promise<T> {
		const url = new URL(this.baseUrl + path)
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value !== undefined && value !== null) {
					url.searchParams.set(key, String(value))
				}
			}
		}
		const res = await this.fetchImpl(url.toString(), {
			headers: { Accept: "application/json", ...this.headers },
		})
		const body = await res.json().catch(() => undefined)
		if (!res.ok) {
			const message =
				(body as { message?: string } | undefined)?.message ??
				`Request failed with status ${res.status}`
			throw new AdhkarApiError(res.status, message, body)
		}
		return body as T
	}

	/** Dataset metadata (version, totals). */
	getMeta(): Promise<ApiMeta> {
		return this.request<ApiMeta>("/api/meta")
	}

	/** List all categories. */
	async listCategories(): Promise<Category[]> {
		const res = await this.request<{ items: Category[] }>("/api/categories")
		return res.items
	}

	/** Get a single category including all of its items. */
	getCategory(
		slug: string,
		opts: { reciter?: string } = {},
	): Promise<Category & { items: AdhkarItem[] }> {
		return this.request<Category & { items: AdhkarItem[] }>(
			`/api/categories/${encodeURIComponent(slug)}`,
			{ reciter: opts.reciter },
		)
	}

	/** Get only the items of a category. */
	async getCategoryItems(
		slug: string,
		opts: { reciter?: string } = {},
	): Promise<AdhkarItem[]> {
		const res = await this.request<{ items: AdhkarItem[] }>(
			`/api/categories/${encodeURIComponent(slug)}/items`,
			{ reciter: opts.reciter },
		)
		return res.items
	}

	/** Get a single item by category slug and zero-based index. */
	getItem(
		slug: string,
		index: number,
		opts: { reciter?: string } = {},
	): Promise<AdhkarItem> {
		return this.request<AdhkarItem>(
			`/api/categories/${encodeURIComponent(slug)}/items/${index}`,
			{ reciter: opts.reciter },
		)
	}

	/** List/filter the flattened collection of all items. */
	listAdhkar(params: ListAdhkarParams = {}): Promise<Paginated<AdhkarItemWithMeta>> {
		return this.request<Paginated<AdhkarItemWithMeta>>(
			"/api/adhkar",
			{ ...params } as Record<string, unknown>,
		)
	}

	/** Full-text search across the Arabic text fields. */
	search(
		q: string,
		opts: { limit?: number; offset?: number } = {},
	): Promise<Paginated<AdhkarItemWithMeta>> {
		return this.request<Paginated<AdhkarItemWithMeta>>("/api/search", { q, ...opts })
	}

	/** Get a random dhikr, optionally scoped to a category. */
	random(category?: string): Promise<AdhkarItemWithMeta> {
		return this.request<AdhkarItemWithMeta>("/api/random", { category })
	}

	/** List the available reciters / audio sources. */
	async listReciters(): Promise<Reciter[]> {
		const res = await this.request<{ items: Reciter[] }>("/api/audio/reciters")
		return res.items
	}

	/**
	 * Resolve audio URL(s) for a Qur'an ayah. Omit `reciter` to get every
	 * source; pass one to get just that reciter's URL.
	 */
	ayahAudio(
		surah: number,
		ayah: number,
		reciter?: string,
	): Promise<ResolvedAyahAudio> {
		return this.request<ResolvedAyahAudio>(
			`/api/audio/ayah/${surah}/${ayah}`,
			{ reciter },
		)
	}
}

export type {
	AdhkarItem,
	AdhkarItemWithMeta,
	ApiMeta,
	Category,
	Paginated,
} from "../src/types.js"
export type { Reciter, ResolvedAyahAudio } from "../src/audio.js"
