import type { AdhkarIndexFile, AdhkarItem, AdhkarItemWithMeta, Category } from "./types.js";
/** Absolute path to the directory holding the JSON data files. */
export declare const DATA_DIR: string;
/** Convert a source file id like "adhkar_the_morning" into slug "the-morning". */
export declare function fileIdToSlug(fileId: string): string;
export interface AdhkarStore {
    index: AdhkarIndexFile;
    categories: Category[];
    /** slug -> category */
    categoryBySlug: Map<string, Category>;
    /** slug -> ordered items */
    itemsBySlug: Map<string, AdhkarItem[]>;
    /** every item, flattened, with category + index metadata */
    allItems: AdhkarItemWithMeta[];
}
/**
 * Load the entire dataset from {@link DATA_DIR} into memory.
 * Throws if the data directory or index file is missing.
 */
export declare function loadStore(dataDir?: string): AdhkarStore;
