// Gamification du parcours « Apprendre à lire » : objectif du jour, badges, défis de la semaine.
import { UNITS } from "@/lib/qaida";

export function dayStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
/** Lundi 0 h, heure locale */
export function weekStart(d = new Date()) { const x = dayStart(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
export function daysLeftInWeek(d = new Date()) { return 7 - ((d.getDay() + 6) % 7); }

// ── Objectif du jour ──
export const GOAL_CHOICES = [1, 2, 3, 5];
export function getGoal() { const n = Number(localStorage.getItem("mh_read_goal")); return GOAL_CHOICES.includes(n) ? n : 2; }
export function setGoal(n) { localStorage.setItem("mh_read_goal", String(n)); }
export function todayCount(sessions) { const t = dayStart().getTime(); return sessions.filter((s) => new Date(s.created_at).getTime() >= t).length; }

// ── Badges ──
const UNIT_BADGE = { u1: "Alphabet", u2: "Lettres liées", u3: "Voyelles", u4: "Madd et chadda", u5: "Mots du Coran", u6: "Premières sourates" };
export const BADGES = [
  ...UNITS.map((u) => ({ id: `unit-${u.id}`, name: UNIT_BADGE[u.id] || u.title, hint: `Terminer l'unité « ${u.title} »`, test: (done) => u.lessons.every((l) => done.has(l.id)) })),
  { id: "fatiha", name: "Al-Fâtiḥa", hint: "Lire Al-Fâtiḥa en entier", test: (done) => done.has("u6l4") && done.has("u6l5") },
  { id: "perfect", name: "Sans faute", hint: "Une leçon sans aucune erreur", test: (_d, rows) => rows.some((r) => r.attempts > 0 && r.best_score === 100) },
  { id: "perfect10", name: "Œil sûr", hint: "10 leçons sans aucune erreur", test: (_d, rows) => rows.filter((r) => r.attempts > 0 && r.best_score === 100).length >= 10 },
];
export function earnedBadges(rows) {
  const done = new Set(rows.map((r) => r.lesson_id));
  return BADGES.filter((b) => b.test(done, rows));
}

// ── Défis de la semaine (se renouvellent chaque lundi) ──
export function weeklyChallenges(sessions) {
  const ws = weekStart().getTime();
  const week = sessions.filter((s) => new Date(s.created_at).getTime() >= ws);
  const days = new Set(week.map((s) => dayStart(new Date(s.created_at)).getTime())).size;
  const perfect = week.filter((s) => s.score === 100).length;
  const xp = week.reduce((t, s) => t + (s.xp || 0), 0);
  return [
    { id: "regular", title: "Régulier", desc: "Lire 5 jours différents cette semaine", value: days, target: 5, unit: "jours" },
    { id: "perfect", title: "Sans faute", desc: "Réussir 3 leçons sans aucune erreur", value: perfect, target: 3, unit: "leçons" },
    { id: "marathon", title: "Marathon", desc: "Gagner 150 points de lecture", value: xp, target: 150, unit: "points" },
  ].map((c) => ({ ...c, done: c.value >= c.target, pct: Math.min(100, Math.round((c.value / c.target) * 100)) }));
}
