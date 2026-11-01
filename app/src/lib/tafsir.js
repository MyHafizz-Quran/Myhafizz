// Tafsirs stockés dans Neon (copie fidèle des sources) : l'Abrégé en français, as-Sa'di, al-Muyassar et Ibn Kathir en arabe.
import { SURAHS } from "@/components/quranData";
import { db } from "@/api/neonClient";

const rpc = (fn, args) => db.rpc(fn, args).then(({ data, error }) => { if (error) throw error; return data; });
const mem = new Map();
const cached = (k, f) => { if (!mem.has(k)) mem.set(k, f().catch((e) => { mem.delete(k); throw e; })); return mem.get(k); };

export const DEFAULT_SRC = "fr_mukhtasar";
export const SOURCES = [
  { key: "fr_mukhtasar", label: "Abrégé", lang: "fr", credit: "L'Abrégé de l'exégèse du Coran (Al-Mukhtasar), Centre Tafsir des études coraniques" },
  { key: "ar_saadi", label: "as-Sa'di", lang: "ar", credit: "Tafsir as-Sa'di (Taysir al-Karim ar-Rahman)" },
  { key: "ar_muyassar", label: "al-Muyassar", lang: "ar", credit: "At-Tafsir al-Muyassar, Complexe du Roi Fahd" },
  { key: "ar_ibnkathir", label: "Ibn Kathir", lang: "ar", credit: "Tafsir Ibn Kathir (Tafsir al-Quran al-Azim)" },
];
export const srcOf = (k) => SOURCES.find((s) => s.key === k) || SOURCES[0];
export const getSrc = () => { try { return srcOf(localStorage.getItem("mh-tafsir-src")).key; } catch { return DEFAULT_SRC; } };
export const setSrc = (k) => { try { localStorage.setItem("mh-tafsir-src", k); } catch { /* ignore */ } };

/** Clé « sourate:verset » à partir du numéro absolu du verset (1 à 6236). */
export function verseKey(abs) {
  let n = abs;
  for (const s of SURAHS) { if (n <= s.numberOfAyahs) return `${s.number}:${n}`; n -= s.numberOfAyahs; }
  return null;
}
/** Explications d'une suite de versets : [{ ayah, from, to, body }] (body vide si l'explication est groupée avec un verset précédent). */
export const tafsirRange = (src, surah, from, to) => cached(`${src}:${surah}:${from}:${to}`, () => rpc("tafsir_get", { p_src: src, p_surah: surah, p_from: from, p_to: to }));
/** L'explication d'un seul verset, en remontant au début du groupe si besoin. */
export async function tafsirOne(src, surah, ayah) {
  const [r] = await tafsirRange(src, surah, ayah, ayah);
  if (!r) return null;
  if (r.body) return r;
  const [g] = await tafsirRange(src, surah, r.from, r.from);
  return g ? { ...g, ayah, from: r.from, to: r.to } : null;
}
export const tafsirOfAbs = (src, abs) => { const k = verseKey(abs); if (!k) return Promise.reject(new Error("verset")); const [s, a] = k.split(":").map(Number); return tafsirOne(src, s, a); };

export const tafsirMe = () => rpc("tafsir_me", {});
export const tafsirQuestions = (surah, from, to) => rpc("tafsir_questions", { p_surah: surah, p_from: from, p_to: to });
export const tafsirDone = (surah, from, to, answers) => rpc("tafsir_done", { p_surah: surah, p_from: from, p_to: to, p_answers: answers });

/** Découpe une sourate en leçons de 3 à 8 versets (environ 5 à 10 minutes de lecture). */
export const lessonsOf = (surah) => cached(`plan:${surah}`, async () => {
  const plan = await rpc("tafsir_plan", { p_surah: surah });
  const out = []; let cur = null;
  for (const [ayah, len] of plan) {
    if (!cur) cur = { from: ayah, to: ayah, chars: 0 };
    else if ((cur.to - cur.from + 1 >= 3 && cur.chars + len > 1400) || cur.to - cur.from + 1 >= 8) { out.push(cur); cur = { from: ayah, to: ayah, chars: 0 }; }
    cur.to = ayah; cur.chars += len;
  }
  if (cur) {
    const last = out[out.length - 1];
    if (last && cur.to - cur.from + 1 < 2 && last.to - last.from + 1 < 8) { last.to = cur.to; last.chars += cur.chars; } else out.push(cur);
  }
  return out.map((l, i) => ({ ...l, i, min: Math.max(3, Math.round(l.chars / 220) + (l.to - l.from + 1)) }));
});
export const surahMeta = (n) => SURAHS[n - 1];
