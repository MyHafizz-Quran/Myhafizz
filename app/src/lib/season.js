// Objectif de saison (ex. « Juz Amma avant Ramadan ») : rythme calculé à partir des versets mémorisés.
import { SURAHS } from "@/components/quranData";
const KEY = "mh_season_goal";
export const PRESETS = [
  { id: "amma", label: "Juz Amma (juz 30)", surahs: range(78, 114) },
  { id: "tabarak", label: "Juz Tabarak (juz 29)", surahs: range(67, 77) },
  { id: "juz2930", label: "Juz 29 et 30", surahs: range(67, 114) },
  { id: "kahf", label: "Sourate Al-Kahf", surahs: [18] },
  { id: "mulk", label: "Sourate Al-Mulk", surahs: [67] },
  { id: "baqara", label: "Sourate Al-Baqara", surahs: [2] },
  { id: "all", label: "Tout le Coran", surahs: range(1, 114) },
];
function range(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
export const getSeason = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
export const setSeason = (g) => { if (g) localStorage.setItem(KEY, JSON.stringify(g)); else localStorage.removeItem(KEY); window.dispatchEvent(new Event("mh-season")); };

/** Avancement : versets faits, total, jours restants et versets par jour à tenir. */
export function seasonStatus(goal, progress = [], now = new Date()) {
  if (!goal) return null;
  const preset = PRESETS.find((p) => p.id === goal.preset); if (!preset) return null;
  const set = new Set(preset.surahs);
  const total = SURAHS.filter((s) => set.has(s.number)).reduce((n, s) => n + s.numberOfAyahs, 0);
  const done = progress.filter((p) => set.has(p.surah_number)).reduce((n, p) => n + (p.memorized_verses?.length || 0), 0);
  const end = new Date(goal.deadline + "T23:59:59");
  const daysLeft = Math.max(0, Math.ceil((end - now) / 864e5));
  const left = Math.max(0, total - done);
  return { label: preset.label, total, done, left, daysLeft, perDay: daysLeft ? Math.ceil(left / daysLeft) : left, pct: total ? Math.round((done / total) * 100) : 0, deadline: end };
}
