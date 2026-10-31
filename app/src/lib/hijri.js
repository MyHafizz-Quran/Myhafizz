// Calendrier hégirien (Umm al-Qura, via Intl) et jours importants.
const NUM = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric" });
export const MONTHS = ["Mouharram", "Safar", "Rabi' al-Awwal", "Rabi' ath-Thani", "Joumada al-Oula", "Joumada ath-Thania", "Rajab", "Cha'bane", "Ramadan", "Chawwal", "Dhou al-Qi'da", "Dhou al-Hijja"];

/** { d, m, y } hégiriens pour une date (m de 1 à 12). */
export function hijri(date = new Date()) {
  const p = Object.fromEntries(NUM.formatToParts(date).filter((x) => x.type !== "literal").map((x) => [x.type, +x.value]));
  return { d: p.day, m: p.month, y: p.year };
}
export const hijriLabel = (date = new Date()) => { const h = hijri(date); return `${h.d} ${MONTHS[h.m - 1]} ${h.y}`; };

const EVENTS = [
  { m: 1, d: 1, name: "Nouvel an hégirien" },
  { m: 1, d: 9, name: "Tasou'a", fast: true, note: "Jeûne recommandé avec Achoura" },
  { m: 1, d: 10, name: "Achoura", fast: true, note: "Jeûne recommandé" },
  { m: 9, d: 1, name: "Début du Ramadan", note: "Date à confirmer par l'observation du croissant" },
  { m: 10, d: 1, name: "Aïd al-Fitr", note: "Date à confirmer par l'observation du croissant" },
  { m: 12, d: 1, name: "Début des 10 jours de Dhou al-Hijja", note: "Jours les plus méritoires de l'année" },
  { m: 12, d: 9, name: "Jour d'Arafat", fast: true, note: "Jeûne recommandé (pour qui n'est pas en pèlerinage)" },
  { m: 12, d: 10, name: "Aïd al-Adha" },
];
const WHITE = [13, 14, 15];

/** Jours importants des `days` prochains jours (aujourd'hui inclus). */
export function upcoming(days = 400, from = new Date()) {
  const out = []; const start = new Date(from); start.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const date = new Date(start); date.setDate(start.getDate() + i);
    const h = hijri(date);
    EVENTS.filter((e) => e.m === h.m && e.d === h.d).forEach((e) => out.push({ ...e, date, h, inDays: i }));
    if (WHITE.includes(h.d) && h.m !== 9 && !(h.m === 12 && h.d === 13)) out.push({ name: `Jour blanc (${h.d} ${MONTHS[h.m - 1]})`, fast: true, white: true, note: "Jeûne recommandé les 13, 14 et 15 de chaque mois", date, h, inDays: i });
  }
  return out;
}

/** Infos Ramadan : en cours, ou nombre de jours avant le début. */
export function ramadanInfo(now = new Date()) {
  const h = hijri(now);
  if (h.m === 9) return { during: true, day: h.d };
  const next = upcoming(400, now).find((e) => e.m === 9 && e.d === 1);
  return { during: false, inDays: next?.inDays ?? null, date: next?.date ?? null };
}

export const inDaysLabel = (n) => (n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : `Dans ${n} jours`);
