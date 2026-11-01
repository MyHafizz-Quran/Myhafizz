import { db } from "@/api/neonClient";

/** Réciteurs dont les fichiers par verset correspondent aux minutages mot à mot de quran.com. */
export const WORD_TIMED_RECITERS = { "ar.alafasy": 7 };
export const hasWordTimings = (reciter) => !!WORD_TIMED_RECITERS[reciter];

/** Index du mot (dans la liste sans le signe de fin) lu à `ms`, ou -1. Gère [mot, pos, début, fin] et [pos, début, fin]. */
export function wordAt(segments, ms) {
  if (!segments?.length) return -1;
  for (const s of segments) {
    const [pos, start, end] = s.length >= 4 ? [s[1], s[2], s[3]] : [s[0] + 1, s[1], s[2]];
    if (ms >= start && ms < end) return pos - 1;
  }
  return -1;
}
export function wordStart(segments, idx) {
  const s = (segments || []).find((x) => (x.length >= 4 ? x[1] : x[0] + 1) === idx + 1);
  return s ? (s.length >= 4 ? s[2] : s[1]) : null;
}

/** Position de lecture (dernier verset écouté ou lu). */
const POS_KEY = "mh_read_pos";
export function saveReadPos(surah, ayah) {
  if (!surah || !ayah) return;
  try { localStorage.setItem(POS_KEY, JSON.stringify({ surah: Number(surah), ayah: Number(ayah), at: Date.now() })); } catch { /* ignore */ }
}
export function getReadPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    return p && Date.now() - p.at < 30 * 86400000 ? p : null;
  } catch { return null; }
}

/** Lexique français relu (publié dans l'admin) pour une sourate : { "ayah:pos": "sens" }. */
const frCache = new Map();
export async function loadFrLexicon(surah) {
  if (frCache.has(surah)) return frCache.get(surah);
  const p = db.from("word_fr").select("ayah, pos, fr").eq("surah", surah).eq("status", "published").limit(3000)
    .then(({ data }) => Object.fromEntries((data || []).map((r) => [`${r.ayah}:${r.pos}`, r.fr])))
    .catch(() => ({}));
  frCache.set(surah, p);
  return p;
}
