/**
 * Data loading layer. Reads every `adhkar_*.json` file plus `_index.json`
 * from the data directory and builds in-memory indexes. Framework-agnostic
 * and dependency-free so it can be reused and tested in isolation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * Resolve the data directory in priority order:
 *   1. ADHKAR_DATA_DIR env var (explicit override)
 *   2. <dir>/data        — a standalone build (dist/data, copied at build time)
 *   3. <dir>/../data     — dev (src/../data) or a full-project deploy (dist/../data)
 * Falls back to the last candidate so loadStore can throw a clear error.
 */
function resolveDataDir() {
    if (process.env.ADHKAR_DATA_DIR) {
        return path.resolve(process.env.ADHKAR_DATA_DIR);
    }
    const candidates = [
        path.resolve(__dirname, "data"),
        path.resolve(__dirname, "..", "data"),
    ];
    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, "_index.json")))
            return dir;
    }
    return candidates[candidates.length - 1];
}
/** Absolute path to the directory holding the JSON data files. */
export const DATA_DIR = resolveDataDir();
/** Convert a source file id like "adhkar_the_morning" into slug "the-morning". */
export function fileIdToSlug(fileId) {
    return fileId.replace(/^adhkar_/, "").replace(/_/g, "-");
}
function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}
/**
 * Load the entire dataset from {@link DATA_DIR} into memory.
 * Throws if the data directory or index file is missing.
 */
export function loadStore(dataDir = DATA_DIR) {
    const indexPath = path.join(dataDir, "_index.json");
    if (!fs.existsSync(indexPath)) {
        throw new Error(`Adhkar index not found at ${indexPath}`);
    }
    const index = readJson(indexPath);
    const categories = [];
    const categoryBySlug = new Map();
    const itemsBySlug = new Map();
    const allItems = [];
    // Preserve the ordering declared in _index.json's `files` map.
    for (const fileId of Object.keys(index.files)) {
        const filePath = path.join(dataDir, `${fileId}.json`);
        if (!fs.existsSync(filePath))
            continue;
        const file = readJson(filePath);
        const slug = fileIdToSlug(fileId);
        const category = {
            slug,
            fileId,
            title: file.title,
            count: file.items.length,
            icon: file.icon ?? null,
        };
        categories.push(category);
        categoryBySlug.set(slug, category);
        itemsBySlug.set(slug, file.items);
        file.items.forEach((item, i) => {
            allItems.push({ ...item, categorySlug: slug, index: i });
        });
    }
    return { index, categories, categoryBySlug, itemsBySlug, allItems };
}
//# sourceMappingURL=data.js.map