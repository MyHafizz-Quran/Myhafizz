/**
 * Verset et hadith du jour : le même pour tout le monde un jour donné,
 * choisi de façon déterministe à partir de la date locale.
 */
import { SURAHS } from "@/components/quranData";

// Versets choisis : courts, porteurs de sens hors contexte (sourate, verset).
export const DAILY_VERSES = [
  [1, 5], [2, 45], [2, 152], [2, 153], [2, 186], [2, 201], [2, 255], [2, 286], [3, 8], [3, 92],
  [3, 139], [3, 173], [3, 190], [3, 200], [6, 162], [7, 23], [10, 62], [13, 11], [13, 28], [14, 7],
  [16, 18], [16, 128], [17, 9], [17, 24], [18, 10], [20, 25], [20, 114], [21, 87], [25, 63], [25, 74],
  [28, 24], [29, 69], [33, 41], [33, 56], [38, 29], [39, 10], [39, 53], [40, 60], [47, 7], [49, 10],
  [49, 13], [50, 16], [51, 56], [54, 17], [55, 13], [59, 18], [64, 16], [65, 2], [65, 3], [67, 2],
  [94, 5], [94, 6], [96, 1], [112, 1], [2, 2], [2, 216], [12, 87], [3, 159], [35, 28], [57, 4],
];

export const SOURCES = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  nawawi: "Les 40 hadiths de an-Nawawi",
};

/** Numéro du jour local (change à minuit, heure de l'appareil). */
export function dayNumber(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
const pick = (n, len, salt) => ((n * salt) % len + len) % len;
const todayKey = () => new Date().toLocaleDateString("en-CA");

function cached(name, loader) {
  const k = `mh_daily_${name}`;
  try { const c = JSON.parse(localStorage.getItem(k)); if (c?.day === todayKey()) return Promise.resolve(c.data); } catch { /* cache illisible */ }
  return loader().then((data) => { try { localStorage.setItem(k, JSON.stringify({ day: todayKey(), data })); } catch { /* stockage plein */ } return data; });
}

export function verseOfDay() {
  const [s, a] = DAILY_VERSES[pick(dayNumber(), DAILY_VERSES.length, 37)];
  return cached("verse", async () => {
    const r = await fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/editions/quran-uthmani,fr.hamidullah`);
    if (!r.ok) throw new Error("verse");
    const [ar, fr] = (await r.json()).data;
    let text = ar.text;
    // L'API préfixe le verset 1 (sauf sourates 1 et 9) par la Basmala : on la retire
    if (a === 1 && s !== 1 && s !== 9) {
      const w = text.split(" ");
      if (w[0].replace(/[\u064B-\u065F\u0670]/g, "") === "بسم" && w.length > 4) text = w.slice(4).join(" ");
    }
    return { surah: s, ayah: a, number: ar.number, ar: text, fr: fr.text, surahName: SURAHS.find((x) => x.number === s)?.englishName || ar.surah.englishName };
  });
}

export function hadithOfDay() {
  return cached("hadith", async () => {
    const r = await fetch("/data/hadiths.json");
    if (!r.ok) throw new Error("hadith");
    const list = await r.json();
    return list[pick(dayNumber(), list.length, 7919)];
  });
}
