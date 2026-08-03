/**
 * Query/service layer. Pure functions over an {@link AdhkarStore}, with no
 * dependency on any HTTP framework. This is what both the Hono server and the
 * test harness call into.
 */
import type { AdhkarItem, AdhkarItemWithMeta, ApiMeta, Category, Paginated, Quran } from "./types.js";
import type { AdhkarStore } from "./data.js";
export interface ListItemsQuery {
    category?: string;
    q?: string;
    hasAudio?: boolean;
    hasQuran?: boolean;
    limit?: number;
    offset?: number;
}
export declare function getMeta(store: AdhkarStore): ApiMeta;
export declare function listCategories(store: AdhkarStore): Category[];
export declare function getCategory(store: AdhkarStore, slug: string): Category | undefined;
export declare function getCategoryItems(store: AdhkarStore, slug: string): AdhkarItem[] | undefined;
export declare function getItem(store: AdhkarStore, slug: string, index: number): AdhkarItem | undefined;
export declare function listItems(store: AdhkarStore, query?: ListItemsQuery): Paginated<AdhkarItemWithMeta>;
export declare function searchItems(store: AdhkarStore, q: string, opts?: {
    limit?: number;
    offset?: number;
}): Paginated<AdhkarItemWithMeta>;
/**
 * Return a copy of an embedded Qur'an block with each ayah (and basmala)
 * enriched with a resolved `audioUrl` for the given reciter. Items without
 * a parseable audio filename are left unchanged.
 */
export declare function enrichQuranAudio(quran: Quran, reciterId: string): Quran;
/** Enrich a single item's embedded Qur'an block (if any) with audio URLs. */
export declare function enrichItemAudio<T extends AdhkarItem>(item: T, reciterId: string | undefined): T;
/** Default reciter id used when a request asks for audio without naming one. */
export declare function defaultReciterId(): string;
export declare function randomItem(store: AdhkarStore, categorySlug?: string): AdhkarItemWithMeta | undefined;
