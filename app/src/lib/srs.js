// Révision espacée (variante simple de SM-2) + composition de la session du jour
// Notes : 0 = Oublié, 1 = Hésité, 2 = Facile
import { SURAHS } from "@/components/quranData";

export const GRADES = { FORGOT: 0, HARD: 1, EASY: 2 };
export const YOUNG_MAX_INTERVAL = 7; // au-delà : manzil (ancien)

export const todayStr = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + Math.round(n)); return todayStr(d); };

export function schedule(review, grade) {
  const r = { interval_days: 0, ease: 2.5, reps: 0, lapses: 0, ...(review || {}) };
  let { interval_days: iv, ease, reps, lapses } = r;
  if (grade === GRADES.FORGOT) {
    lapses += 1; reps = 0; iv = 1; ease = Math.max(1.3, ease - 0.2);
  } else if (grade === GRADES.HARD) {
    reps += 1; iv = Math.max(1, iv * 1.2); ease = Math.max(1.3, ease - 0.15);
  } else {
    reps += 1; iv = iv < 1 ? 1 : iv < 3 ? 3 : iv * ease; ease = Math.min(3, ease + 0.05);
  }
  iv = Math.min(iv, 180);
  return { interval_days: Math.round(iv * 10) / 10, ease: Math.round(ease * 100) / 100, reps, lapses,
    due_date: addDays(iv), last_grade: grade, last_reviewed: new Date().toISOString() };
}

// 0–100 : solidité d'un verset (pour la future carte de solidité)
export const strength = (rv) => (!rv ? 0 : Math.min(100, Math.round((Math.log2(1 + rv.interval_days) / Math.log2(181)) * 100)));

export const key = (s, v) => `${s}:${v}`;

/** Ordre de parcours du programme */
export function planOrder(plan) {
  const start = plan?.start_surah || 114;
  const list = [...SURAHS].sort((a, b) => a.number - b.number);
  if ((plan?.direction || "backward") === "backward") {
    return list.filter((s) => s.number <= start).reverse().concat(list.filter((s) => s.number > start).reverse());
  }
  return list.filter((s) => s.number >= start).concat(list.filter((s) => s.number < start));
}

/**
 * Compose la session du jour.
 * progress : lignes memorization_progress ; reviews : lignes verse_reviews
 */
export function buildSession({ plan, progress = [], reviews = [] }) {
  const today = todayStr();
  const memorized = new Set();
  progress.forEach((p) => (p.memorized_verses || []).forEach((v) => memorized.add(key(p.surah_number, v))));
  const byKey = new Map(reviews.map((r) => [key(r.surah_number, r.verse_number), r]));
  const reviewedToday = reviews.filter((r) => r.last_reviewed && todayStr(new Date(r.last_reviewed)) === today);

  // Sabaq : prochains versets non mémorisés selon le programme
  const sabaq = [];
  const dailyNew = plan?.daily_new ?? 3;
  // appris aujourd'hui = ligne créée aujourd'hui et jamais encore notée
  const learnedToday = reviews.filter((r) => r.last_grade == null && todayStr(new Date(r.created_at || 0)) === today).length;
  const need = Math.max(0, dailyNew - learnedToday);
  if (need) {
    outer: for (const s of planOrder(plan)) {
      for (let v = 1; v <= s.numberOfAyahs; v++) {
        if (!memorized.has(key(s.number, v))) {
          sabaq.push({ surah_number: s.number, verse_number: v });
          if (sabaq.length >= need) break outer;
        }
      }
      if (sabaq.length) break; // reste dans une seule sourate par jour
    }
  }

  // Révisions dues
  const due = reviews.filter((r) => r.due_date <= today);
  const sabqi = due.filter((r) => r.interval_days <= YOUNG_MAX_INTERVAL);
  let manzil = due.filter((r) => r.interval_days > YOUNG_MAX_INTERVAL);
  // Versets mémorisés avant le programme, jamais révisés : vont en manzil
  const legacy = [];
  memorized.forEach((k) => { if (!byKey.has(k)) { const [s, v] = k.split(":").map(Number); legacy.push({ surah_number: s, verse_number: v, legacy: true }); } });
  const cap = plan?.manzil_daily ?? 20;
  const sortByPos = (a, b) => a.surah_number - b.surah_number || a.verse_number - b.verse_number;
  manzil = [...manzil.sort((a, b) => a.due_date.localeCompare(b.due_date)), ...legacy.sort(sortByPos)].slice(0, Math.max(cap, 0));

  return {
    sabaq,
    sabqi: sabqi.sort(sortByPos),
    manzil: manzil.sort(sortByPos),
    doneToday: reviewedToday.length,
    totalMemorized: memorized.size,
  };
}

/** Objectif guidé : versets restants pour une plage de sourates, quota/jour conseillé */
export function goalPace({ surahs, memorizedSet, goalDate }) {
  const total = surahs.reduce((n, s) => n + s.numberOfAyahs, 0);
  let done = 0;
  surahs.forEach((s) => { for (let v = 1; v <= s.numberOfAyahs; v++) if (memorizedSet.has(key(s.number, v))) done++; });
  const days = goalDate ? Math.max(1, Math.ceil((new Date(goalDate) - new Date()) / 86400000)) : null;
  return { total, done, left: total - done, days, perDay: days ? Math.ceil((total - done) / days) : null };
}

/** Masquage progressif : 0 = complet, 1 = premières lettres, 2 = masqué */
export function maskWords(text, level) {
  if (level === 0) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const keep = (w) => /^[\u0660-\u0669\u06F0-\u06F90-9\u06DD\u06DE\u06E9]+$/.test(w); // numéros, signes
  if (level === 2) return words.map((w) => (keep(w) ? w : "ـــ")).join(" ");
  // garde la 1re lettre (avec ses signes diacritiques)
  return words.map((w) => {
    if (keep(w)) return w;
    const m = w.match(/^[\u0621-\u064A\u0671-\u06D3][\u064B-\u065F\u0670\u06D6-\u06ED]*/);
    return (m ? m[0] : w.slice(0, 1)) + "ـ";
  }).join(" ");
}

/** Série en cours (jours consécutifs jusqu'à aujourd'hui ou hier) */
export function currentStreak(days) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(todayStr(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(todayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Plus longue série */
export function longestStreak(days) {
  const sorted = [...new Set(days)].sort();
  let best = 0, run = 0, prev = null;
  for (const s of sorted) {
    const t = new Date(s + "T00:00:00Z").getTime();
    run = prev != null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  return best;
}
