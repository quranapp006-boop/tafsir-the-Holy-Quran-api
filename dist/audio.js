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
export const EVERYAYAH_BASE = "https://everyayah.com/data";
/** Known reciters / audio sources. The first entry is the default. */
export const RECITERS = [
    {
        id: "husary",
        name: "Mahmoud Khalil Al-Husary",
        source: "everyayah",
        path: "Husary_128kbps",
        bitrate: "128kbps",
    },
    {
        id: "minshawy-murattal",
        name: "Mohamed Siddiq Al-Minshawi (Murattal)",
        source: "everyayah",
        path: "Minshawy_Murattal_128kbps",
        bitrate: "128kbps",
    },
    {
        id: "yasser-ad-dussary",
        name: "Yasser Ad-Dussary",
        source: "everyayah",
        path: "Yasser_Ad-Dussary_128kbps",
        bitrate: "128kbps",
    },
    {
        id: "warsh-yassin-al-jazaery",
        name: "Yassin Al-Jazaery (Warsh narration)",
        source: "everyayah",
        path: "warsh/warsh_yassin_al_jazaery_64kbps",
        bitrate: "64kbps",
    },
    {
        id: "ghamadi",
        name: "Saad Al-Ghamadi",
        source: "everyayah",
        path: "Ghamadi_40kbps",
        bitrate: "40kbps",
    },
];
export const DEFAULT_RECITER_ID = RECITERS[0].id;
const reciterById = new Map(RECITERS.map((r) => [r.id, r]));
export function getReciter(id) {
    return reciterById.get(id);
}
export function listReciters() {
    return RECITERS;
}
/** Zero-pad a positive integer to three digits. */
export function pad3(n) {
    return String(n).padStart(3, "0");
}
/**
 * Parse a dataset audio filename like `112001.mp3` into `{ surah, ayah }`.
 * Returns undefined for filenames that don't match the 6-digit convention.
 */
export function parseAudioFilename(filename) {
    const base = filename.replace(/\.mp3$/i, "").trim();
    if (!/^\d{6}$/.test(base))
        return undefined;
    return {
        surah: Number.parseInt(base.slice(0, 3), 10),
        ayah: Number.parseInt(base.slice(3, 6), 10),
    };
}
/** Build a single audio URL for a reciter + ayah. */
export function buildAudioUrl(reciter, surah, ayah) {
    const ss = pad3(surah);
    const aa = pad3(ayah);
    return `${EVERYAYAH_BASE}/${reciter.path}/${ss}${aa}.mp3`;
}
/** Build audio URLs for an ayah across every reciter (keyed by reciter id). */
export function buildAllAudioUrls(surah, ayah) {
    const out = {};
    for (const r of RECITERS)
        out[r.id] = buildAudioUrl(r, surah, ayah);
    return out;
}
/** Resolve audio for an ayah; if reciterId is given, only that source is returned. */
export function resolveAyahAudio(surah, ayah, reciterId) {
    if (reciterId) {
        const r = getReciter(reciterId);
        if (!r)
            return undefined;
        return { surah, ayah, sources: { [r.id]: buildAudioUrl(r, surah, ayah) } };
    }
    return { surah, ayah, sources: buildAllAudioUrls(surah, ayah) };
}
/**
 * Resolve an audio URL for a stored dataset filename (e.g. `112001.mp3`).
 * Returns undefined if the filename is not in the expected format or the
 * reciter is unknown.
 */
export function resolveFilenameUrl(filename, reciterId = DEFAULT_RECITER_ID) {
    const ref = parseAudioFilename(filename);
    const reciter = getReciter(reciterId);
    if (!ref || !reciter)
        return undefined;
    return buildAudioUrl(reciter, ref.surah, ref.ayah);
}
//# sourceMappingURL=audio.js.map