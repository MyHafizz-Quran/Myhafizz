// Tafsir al-Muyassar (arabe simple, Complexe du roi Fahd) via l'API quran.com.
import { SURAHS } from "@/components/quranData";
const mem = new Map();
/** Clé « sourate:verset » à partir du numéro absolu du verset (1 à 6236). */
export function verseKey(abs) {
  let n = abs;
  for (const s of SURAHS) { if (n <= s.numberOfAyahs) return `${s.number}:${n}`; n -= s.numberOfAyahs; }
  return null;
}
export async function tafsirMuyassar(abs) {
  const k = verseKey(abs); if (!k) throw new Error("verset");
  if (!mem.has(k)) {
    mem.set(k, fetch(`https://api.quran.com/api/v4/tafsirs/16/by_ayah/${k}`).then((r) => { if (!r.ok) throw new Error("tafsir"); return r.json(); })
      .then((d) => (d?.tafsir?.text || "").replace(/<[^>]+>/g, "").trim()).catch((e) => { mem.delete(k); throw e; }));
  }
  return mem.get(k);
}
