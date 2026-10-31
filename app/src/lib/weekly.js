// Bilan de la semaine : calculé côté appareil à partir des données déjà chargées.
import { todayStr } from "@/lib/srs";

const DAY = 864e5;
const KAHF_KEY = "mh_kahf_read";

/** Début (00:00) du jour situé `n` jours avant aujourd'hui. */
export function daysAgo(n, now = new Date()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d;
}

/** Statistiques sur les 7 derniers jours (aujourd'hui inclus) et les 7 jours d'avant. */
export function weekStats({ reviews = [], days = [], readSessions = [] }, now = new Date()) {
  const from = daysAgo(6, now), prevFrom = daysAgo(13, now);
  const inRange = (iso, a, b) => { if (!iso) return false; const t = new Date(iso).getTime(); return t >= a.getTime() && t < b.getTime(); };
  const end = new Date(now.getTime() + DAY);
  const learned = reviews.filter((r) => inRange(r.created_at, from, end)).length;
  const learnedPrev = reviews.filter((r) => inRange(r.created_at, prevFrom, from)).length;
  const revised = reviews.filter((r) => inRange(r.last_reviewed, from, end) && !inRange(r.created_at, from, end)).length;
  const set = new Set(days);
  const timeline = Array.from({ length: 7 }, (_, i) => { const d = daysAgo(6 - i, now); return { date: d, done: set.has(todayStr(d)) }; });
  const active = timeline.filter((d) => d.done).length;
  const activePrev = Array.from({ length: 7 }, (_, i) => set.has(todayStr(daysAgo(13 - i, now)))).filter(Boolean).length;
  const lessons = readSessions.filter((s) => inRange(s.created_at, from, end)).length;
  const fragile = reviews.filter((r) => (r.lapses || 0) > 0 && (r.interval_days || 0) < 3).length;
  return { learned, learnedPrev, revised, active, activePrev, timeline, lessons, fragile, total: reviews.length };
}

/** Jeudi après 18 h (veille de Jumu'a) ou vendredi. */
export function isJumuaTime(now = new Date()) {
  const d = now.getDay();
  return d === 5 || (d === 4 && now.getHours() >= 18);
}

/** Date du vendredi concerné (clé de la lecture d'Al-Kahf). */
function fridayKey(now = new Date()) {
  const d = new Date(now); if (d.getDay() === 4) d.setDate(d.getDate() + 1);
  return todayStr(d);
}
export const kahfRead = (now) => localStorage.getItem(KAHF_KEY) === fridayKey(now);
export function setKahfRead(v, now) {
  if (v) localStorage.setItem(KAHF_KEY, fridayKey(now)); else localStorage.removeItem(KAHF_KEY);
}

/** Phrase de synthèse, encourageante et sans reproche. */
export function summaryLine(s) {
  if (s.active === 0) return "Une nouvelle semaine commence. Quelques minutes par jour suffisent.";
  if (s.active >= 6) return "Semaine très régulière. Continue à ce rythme.";
  if (s.active > s.activePrev) return "Plus régulier que la semaine dernière.";
  if (s.learned > 0 && s.revised > 0) return "Tu as appris et révisé cette semaine. C'est l'équilibre qui fait tenir le hifz.";
  return "Chaque jour compte, même quelques versets.";
}
