// Notifications personnalisées (catalogue validé le 01/11/2026).
// 3 notifications max par jour et par appareil (rappels de prière compris), rien de 22 h à 6 h
// pour ces types, chaque type se coupe dans les réglages, silence complet après 14 jours d'absence.

export const EXTRA_TYPES = ["verset", "hadith", "nom", "bravo", "hebdo", "tafsir", "arabe", "tajwid", "dates"];
export const DAILY_CAP = 3;
const WINDOW_MIN = 40;

// Même liste et même tirage que l'app (src/lib/daily.js).
const DAILY_VERSES = [
  [1, 5], [2, 45], [2, 152], [2, 153], [2, 186], [2, 201], [2, 255], [2, 286], [3, 8], [3, 92],
  [3, 139], [3, 173], [3, 190], [3, 200], [6, 162], [7, 23], [10, 62], [13, 11], [13, 28], [14, 7],
  [16, 18], [16, 128], [17, 9], [17, 24], [18, 10], [20, 25], [20, 114], [21, 87], [25, 63], [25, 74],
  [28, 24], [29, 69], [33, 41], [33, 56], [38, 29], [39, 10], [39, 53], [40, 60], [47, 7], [49, 10],
  [49, 13], [50, 16], [51, 56], [54, 17], [55, 13], [59, 18], [64, 16], [65, 2], [65, 3], [67, 2],
  [94, 5], [94, 6], [96, 1], [112, 1], [2, 2], [2, 216], [12, 87], [3, 159], [35, 28], [57, 4],
];
const pick = (n, len, salt) => ((n * salt) % len + len) % len;
const dayNum = (ymd) => Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86400000);

const verseCache = new Map();
async function verseText(s, a) {
  const k = `${s}:${a}`;
  if (!verseCache.has(k)) {
    verseCache.set(k, fetch(`https://api.alquran.cloud/v1/ayah/${k}/fr.hamidullah`).then((r) => r.json()).then((j) => j?.data?.text || null).catch(() => null));
  }
  return verseCache.get(k);
}
const short = (t, n = 150) => (t && t.length > n ? `${t.slice(0, n - 1).trim()}…` : t);

/** Fêtes et dates du calendrier hégirien (umm al-qura), à l'heure locale. */
export function hijri(tz, d) {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: tz, day: "numeric", month: "numeric" }).formatToParts(d);
  return { day: Number(parts.find((p) => p.type === "day")?.value), month: Number(parts.find((p) => p.type === "month")?.value) };
}
const DATES = {
  "9-1": { title: "Ramadan Moubarak", body: "Le mois du Coran commence. Fixe-toi un objectif de lecture pour ce Ramadan.", url: "/Lire" },
  "9-21": { title: "Les 10 dernières nuits", body: "Cherche la Nuit du Destin. Une invocation à retenir : Allâhumma innaka 'Afuwwun tuhibbu l-'afwa fa'fu 'annî.", url: "/Noms?n=82" },
  "10-1": { title: "Aïd Moubarak", body: "Qu'Allah accepte ton jeûne et tes prières. Garde un peu de Coran chaque jour après Ramadan.", url: "/Dashboard" },
  "12-1": { title: "Les 10 jours de Dhou l-Hijja", body: "Les meilleurs jours de l'année commencent : multiplie le dhikr et les bonnes œuvres.", url: "/Dashboard" },
  "12-9": { title: "Jour de 'Arafa", body: "Le jeûne de ce jour efface les péchés de l'année passée et de l'année à venir (Muslim 1162).", url: "/Dashboard" },
  "12-10": { title: "Aïd al-Adha Moubarak", body: "Qu'Allah accepte tes actes. Takbîr et dhikr pendant les jours de Tachriq.", url: "/Dashboard" },
  "1-1": { title: "Nouvel an de l'Hégire", body: "Une nouvelle année commence : quel objectif de mémorisation te fixes-tu ?", url: "/Lire" },
  "1-9": { title: "Achoura demain", body: "Le Prophète ﷺ recommandait de jeûner le 9 et le 10 Muharram (Muslim 1134).", url: "/Dashboard" },
};

function streakOf(days, today) {
  if (!days?.length) return 0;
  const gap = Math.round((Date.parse(today) - Date.parse(days[0])) / 86400000);
  if (gap > 1) return 0;
  let s = 1;
  for (let i = 1; i < days.length && Math.round((Date.parse(days[i - 1]) - Date.parse(days[i])) / 86400000) === 1; i++) s++;
  return s;
}
const MILESTONES = [3, 7, 14, 21, 30, 40, 50, 60, 100, 150, 200, 365];

/**
 * Liste des notifications à envoyer maintenant pour un appareil.
 * local = { today, hour, min, weekday }, ctx = reminder_context, state = regularity().
 */
export async function extrasDue({ r, local, ctx, state, db, now }) {
  const on = new Set(r.prayers || []);
  const out = [];
  if (state.kind === "away") return out;
  const minutes = local.hour * 60 + local.min;
  if (local.hour >= 22 || local.hour < 6) return out;
  const at = (h, m) => minutes >= h * 60 + m && minutes < h * 60 + m + WINDOW_MIN;
  const today = local.today;

  if (on.has("dates") && at(7, 30)) {
    const h = hijri(r.tz, new Date(now));
    const ev = DATES[`${h.month}-${h.day}`];
    if (ev) out.push({ key: "dates", val: today, msg: { ...ev, tag: "mh-dates" } });
  }
  if (on.has("verset") && at(8, 0)) {
    const [s, a] = DAILY_VERSES[pick(dayNum(today), DAILY_VERSES.length, 37)];
    const t = await verseText(s, a);
    out.push({ key: "verset", val: today, msg: { title: "Le verset du jour", body: t ? `« ${short(t)} » (${s}:${a})` : "Un verset à méditer et à mémoriser t'attend.", url: "/Dashboard", tag: "mh-verset" } });
  }
  if (on.has("nom") && at(9, 0)) {
    const idx = Math.floor(now / 86400000);
    const n = (await db.query("select * from public.allah_name_of($1)", [idx]).catch(() => ({ rows: [] }))).rows[0];
    if (n) out.push({ key: "nom", val: today, msg: { title: `Le nom du jour : ${n.translit}`, body: `${n.meaning}. Découvre son sens et le verset où il apparaît.`, url: `/Noms?n=${n.n}`, tag: "mh-nom" } });
  }
  if (on.has("hebdo") && local.weekday === "Sat" && at(10, 0)) {
    const week = (ctx?.days || []).filter((d) => Math.round((Date.parse(today) - Date.parse(d)) / 86400000) < 7).length;
    if (week >= 1) out.push({ key: "hebdo", val: today, msg: { title: "Ta semaine sur MyHafizz", body: week >= 5 ? `${week} jours d'apprentissage cette semaine, macha'Allah. Continue comme ça.` : `${week} jour${week > 1 ? "s" : ""} d'apprentissage cette semaine. Chaque séance compte, même courte.`, url: "/Dashboard", tag: "mh-hebdo" } });
  }
  if (on.has("hadith") && at(12, 30)) {
    out.push({ key: "hadith", val: today, msg: { title: "Le hadith du jour", body: "Un hadith authentique, avec sa source, t'attend sur l'accueil.", url: "/Dashboard", tag: "mh-hadith" } });
  }
  if (on.has("arabe") && ctx?.arabic_level === "none" && state.kind !== "done" && dayNum(today) % 2 === 0 && at(18, 0)) {
    out.push({ key: "arabe", val: today, msg: { title: "Lire l'arabe : 5 minutes", body: "Une petite leçon aujourd'hui et tu avances vers la lecture du Coran.", url: "/LireArabe", tag: "mh-arabe" } });
  }
  if (on.has("tafsir") && ctx?.tafsir_any && local.weekday === "Thu" && at(19, 0)) {
    const last = ctx.tafsir_last ? new Date(ctx.tafsir_last).toISOString().slice(0, 10) : null;
    if (!last || Math.round((Date.parse(today) - Date.parse(last)) / 86400000) >= 3) {
      out.push({ key: "tafsir", val: today, msg: { title: "Ton Tafsir t'attend", body: "Comprendre ce que tu récites change ta prière. Reprends ta leçon de Tafsir.", url: "/Tafsir", tag: "mh-tafsir" } });
    }
  }
  // Tajwid (Tuḥfat al-Aṭfāl) : les jours impairs vers 18 h 30, si commencé et pas touché depuis 2 jours.
  // Une seule fois, le samedi vers 17 h : découverte pour ceux qui lisent l'arabe et n'ont pas commencé.
  if (on.has("tajwid") && (at(18, 30) || (local.weekday === "Sat" && at(17, 0)))) {
    const q = await db.query(
      `select coalesce(max(p.done_at), null) as last, count(*) filter (where p.passed) as passed, count(*) as started,
              (select row_to_json(u) from public.tajwid_units u where u.n not in (select unit from public.tajwid_progress where user_id = $1 and passed) order by u.n limit 1) as next
       from public.tajwid_progress p where p.user_id = $1`, [r.user_id]).catch(() => ({ rows: [] }));
    const t = q.rows[0];
    if (t && Number(t.started) > 0 && t.next && dayNum(today) % 2 === 1 && at(18, 30)) {
      const gap = t.last ? Math.round((Date.parse(today) - Date.parse(new Date(t.last).toISOString().slice(0, 10))) / 86400000) : 99;
      if (gap >= 2) out.push({ key: "tajwid", val: today, msg: { title: "Tajwid : la suite de la Tuḥfa", body: `${t.next.n === 0 ? "Introduction" : `Unité ${t.next.n}`} · ${t.next.title}. Quelques vers, une règle et 5 minutes d'exercices.`, url: `/Tajwid?u=${t.next.n}`, tag: "mh-tajwid" } });
    } else if (t && Number(t.started) === 0 && ctx?.arabic_level && ctx.arabic_level !== "none" && local.weekday === "Sat" && at(17, 0)) {
      out.push({ key: "tajwid_intro", val: "v1", msg: { title: "Nouveau : le Tajwid", body: "Apprends les règles de récitation avec la Tuḥfat al-Aṭfāl, vers par vers, avec des exemples du Coran.", url: "/Tajwid", tag: "mh-tajwid" } });
    }
  }
  if (on.has("bravo") && state.kind === "done" && at(21, 0)) {
    const s = streakOf(ctx?.days, today);
    if (MILESTONES.includes(s)) out.push({ key: "bravo", val: today, msg: { title: `${s} jours d'affilée`, body: "Bravo, macha'Allah. La régularité est ce qu'Allah aime le plus, même si c'est peu.", url: "/Dashboard", tag: "mh-bravo" } });
  }
  return out;
}
