import { getCachedSurah, cacheSurah } from "@/lib/offlineStorage";
import { SURAHS } from "@/components/quranData";

export const GOALS = [
  { key: "juz_amma", label: "Juz Amma", hint: "Sourates 78 à 114", range: [78, 114], start: 114, direction: "backward" },
  { key: "tabarak", label: "Juz Tabarak", hint: "Sourates 67 à 77", range: [67, 77], start: 77, direction: "backward" },
  { key: "baqara", label: "Al-Baqara", hint: "286 versets", range: [2, 2], start: 2, direction: "forward" },
  { key: "full", label: "Tout le Coran", hint: "114 sourates", range: [1, 114], start: 114, direction: "backward" },
];
export const goalSurahs = (key) => {
  const g = GOALS.find((x) => x.key === key) || GOALS[0];
  return SURAHS.filter((s) => s.number >= g.range[0] && s.number <= g.range[1]);
};

const mem = new Map();
// L'API préfixe le verset 1 de chaque sourate (sauf 1 et 9) par la Basmala : on la retire
const stripBasmala = (n, a) => {
  if (a.numberInSurah !== 1 || n === 1 || n === 9) return a;
  const w = a.text.split(" ");
  return w[0].replace(/[\u064B-\u065F\u0670]/g, "") === "بسم" && w.length > 4 ? { ...a, text: w.slice(4).join(" ") } : a;
};

/** Texte arabe (+ traduction) d'une sourate, depuis le cache hors-ligne ou l'API */
export async function loadSurah(n) {
  if (mem.has(n)) return mem.get(n);
  const p = (async () => {
    const cached = await Promise.race([getCachedSurah(n), new Promise((r) => setTimeout(() => r(null), 1500))]);
    if (cached?.ayahs?.length) return cached.ayahs.map((a) => stripBasmala(n, a));
    const [ar, fr] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${n}/ar.alafasy`).then((r) => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${n}/fr.hamidullah`).then((r) => r.json()).catch(() => null),
    ]);
    const tr = {};
    fr?.data?.ayahs?.forEach((a) => { tr[a.numberInSurah] = a.text; });
    const ayahs = ar.data.ayahs.map((a) => ({ ...a, translation: tr[a.numberInSurah] || null }));
    cacheSurah(n, { ayahs, transliteration: {} });
    return ayahs.map((a) => stripBasmala(n, a));
  })();
  mem.set(n, p);
  p.catch(() => mem.delete(n));
  return p;
}

export const audioUrl = (absNumber, reciter = "ar.alafasy") =>
  `https://cdn.islamic.network/quran/audio/128/${reciter}/${absNumber}.mp3`;
