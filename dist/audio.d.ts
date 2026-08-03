/**
 * Qur'an ayah audio resolution layer.
 *
 * The dataset stores ayah audio filenames in the form `SSSAAA.mp3` (3-digit
 * surah + 3-digit ayah, e.g. `112001.mp3` = surah 112, ayah 1). This module
 * maps a (surah, ayah) pair to playable URLs from a set of everyayah.com
 * sources, using the known URL convention:
 *
 *   everyayah:  https://everyayah.com/data/{path}/{SSS}{AAA}.mp3
 *
 * No network access is performed here — URLs are constructed deterministically.
 */
export type AudioSourceType = "everyayah";
export interface Reciter {
    /** Stable, URL-safe identifier. */
    id: string;
    /** Human-readable reciter / source name. */
    name: string;
    /** Which URL convention this reciter uses. */
    source: AudioSourceType;
    /** For everyayah: the folder path under `/data/`. */
    path?: string;
    /** Audio bitrate, when known. */
    bitrate?: string;
}
export declare const EVERYAYAH_BASE = "https://everyayah.com/data";
/** Known reciters / audio sources. The first entry is the default. */
export declare const RECITERS: Reciter[];
export declare const DEFAULT_RECITER_ID: string;
export declare function getReciter(id: string): Reciter | undefined;
export declare function listReciters(): Reciter[];
/** Zero-pad a positive integer to three digits. */
export declare function pad3(n: number): string;
export interface AyahRef {
    surah: number;
    ayah: number;
}
/**
 * Parse a dataset audio filename like `112001.mp3` into `{ surah, ayah }`.
 * Returns undefined for filenames that don't match the 6-digit convention.
 */
export declare function parseAudioFilename(filename: string): AyahRef | undefined;
/** Build a single audio URL for a reciter + ayah. */
export declare function buildAudioUrl(reciter: Reciter, surah: number, ayah: number): string;
/** Build audio URLs for an ayah across every reciter (keyed by reciter id). */
export declare function buildAllAudioUrls(surah: number, ayah: number): Record<string, string>;
export interface ResolvedAyahAudio {
    surah: number;
    ayah: number;
    /** Per-reciter URL map. */
    sources: Record<string, string>;
}
/** Resolve audio for an ayah; if reciterId is given, only that source is returned. */
export declare function resolveAyahAudio(surah: number, ayah: number, reciterId?: string): ResolvedAyahAudio | undefined;
/**
 * Resolve an audio URL for a stored dataset filename (e.g. `112001.mp3`).
 * Returns undefined if the filename is not in the expected format or the
 * reciter is unknown.
 */
export declare function resolveFilenameUrl(filename: string, reciterId?: string): string | undefined;
