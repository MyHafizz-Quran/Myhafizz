// Jeux MyHafizz (lot J1) : niveaux progressifs, génération des questions,
// robot adversaire et explications après chaque réponse.
// Les réglages et la banque Al-Ilm viennent de la base (gérés par l'admin).
import { db } from "@/api/neonClient";
import { LETTERS, L, syllable } from "@/lib/qaida";
import { SURAH_FR } from "@/components/surahNamesFr";

export const AUDIO = (g) => `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${g}.mp3`;

let quranP;
/** Sourates 67 à 114 (Juz Tabarak + Juz Amma) : arabe, phonétique, traduction Hamidullah. */
export const loadQuran = () => (quranP ||= import("@/data/juzgames.json").then((m) => m.default));

/* ── Niveaux ──────────────────────────────────────────────────────────────
   aid : "phon" = tout en phonétique + audio (aucune lecture de l'arabe requise)
         "both" = arabe + phonétique dessous ; "ar" = arabe seul            */
export const GAMES = {
  lettres: {
    title: "Lettres éclair", hint: "Reconnaître les lettres et leur son", icon: "lettres",
    levels: [
      { n: 1, name: "Découverte", desc: "La lettre et son nom, sans chrono. Idéal si tu débutes.", timer: 0, mode: "see", aid: "phon" },
      { n: 2, name: "À l'oreille", desc: "Écoute le son, trouve la lettre. Le nom est écrit dessous.", timer: 0, mode: "hear", aid: "both" },
      { n: 3, name: "Lettres jumelles", desc: "Les lettres qui se ressemblent, 6 secondes.", timer: 6, mode: "twins", aid: "ar" },
      { n: 4, name: "Avec voyelles", desc: "Lire ba, bi, bou… 5 secondes.", timer: 5, mode: "syl", aid: "ar" },
      { n: 5, name: "Éclair", desc: "Toutes les lettres, chrono serré.", timer: "flash", mode: "see", aid: "ar" },
    ],
  },
  suite: {
    title: "La suite du verset", hint: "Retrouver le verset qui suit", icon: "suite",
    levels: [
      { n: 1, name: "Écoute et choisis", desc: "Phonétique, traduction et audio. Sans lire l'arabe.", aid: "phon", from: 100, to: 114 },
      { n: 2, name: "Arabe + phonétique", desc: "Les petites sourates, aide sous chaque choix.", aid: "both", from: 93, to: 114 },
      { n: 3, name: "Arabe seul", desc: "Sourates 87 à 114.", aid: "ar", from: 87, to: 114 },
      { n: 4, name: "Tout Juz Amma", desc: "Sourates 78 à 114.", aid: "ar", from: 78, to: 114 },
      { n: 5, name: "Juz Tabarak", desc: "Sourates 67 à 77.", aid: "ar", from: 67, to: 77 },
    ],
  },
  sourate: {
    title: "Quelle sourate ?", hint: "Reconnaître la sourate d'un verset", icon: "sourate",
    levels: [
      { n: 1, name: "Par le sens", desc: "Traduction et audio du verset. Sans lire l'arabe.", mode: "sens", aid: "phon", from: 105, to: 114 },
      { n: 2, name: "À l'écoute", desc: "Un extrait audio des petites sourates.", mode: "audio", aid: "phon", from: 100, to: 114 },
      { n: 3, name: "Écoute Juz Amma", desc: "Extraits audio, sourates 78 à 114.", mode: "audio", aid: "phon", from: 78, to: 114 },
      { n: 4, name: "Par le texte", desc: "Le verset écrit en arabe, Juz Amma.", mode: "texte", aid: "ar", from: 78, to: 114 },
      { n: 5, name: "Juz Tabarak", desc: "Texte arabe, sourates 67 à 77.", mode: "texte", aid: "ar", from: 67, to: 77 },
    ],
  },
  ordre: {
    title: "Remets dans l'ordre", hint: "Reconstituer les versets", icon: "ordre",
    levels: [
      { n: 1, name: "En phonétique", desc: "3 versets écrits en phonétique, avec audio.", aid: "phon", count: 3, from: 103, to: 114 },
      { n: 2, name: "Arabe + phonétique", desc: "4 versets, aide sous chaque verset.", aid: "both", count: 4, from: 97, to: 114 },
      { n: 3, name: "Arabe seul", desc: "4 versets, Juz Amma.", aid: "ar", count: 4, from: 78, to: 114 },
      { n: 4, name: "Plus long", desc: "5 versets, Juz Amma.", aid: "ar", count: 5, from: 78, to: 114 },
      { n: 5, name: "Juz Tabarak", desc: "5 versets, sourates 67 à 77.", aid: "ar", count: 5, from: 67, to: 77 },
    ],
  },
  ilm: {
    title: "Al-Ilm", hint: "Culture et histoire islamiques", icon: "ilm",
    levels: [
      { n: 1, name: "Facile", desc: "Les bases, pour tous.", difficulty: 1 },
      { n: 2, name: "Moyen", desc: "Pour aller plus loin.", difficulty: 2 },
      { n: 3, name: "Difficile", desc: "Pour les passionnés.", difficulty: 3 },
    ],
  },
};
export const GAME_ORDER = ["lettres", "ilm", "sourate", "suite", "ordre"];

export const ILM_CATEGORIES = [
  ["sira", "Sira"], ["prophetes", "Prophètes"], ["coran", "Coran"], ["compagnons", "Compagnons"], ["histoire", "Histoire"],
  ["croyance", "Croyance"], ["pratique", "Pratique"], ["hadith", "Hadith"], ["calendrier", "Calendrier"], ["mix", "Mélange"],
];

export const ROBOT = [
  { n: 1, name: "Facile", desc: "Le robot se trompe souvent" },
  { n: 2, name: "Moyen", desc: "Le robot se trompe parfois" },
  { n: 3, name: "Hafiz expert", desc: "Presque imbattable" },
];

/** Niveau de départ selon le profil (on ne bloque jamais un bon lecteur au niveau 1). */
export function startLevel(game, arabicLevel) {
  if (game === "ilm") return 1;
  if (arabicLevel === "good") return 3;
  if (arabicLevel === "some") return 2;
  return 1;
}

export function unlockedLevel(game, progress, profile) {
  const max = GAMES[game].levels.length;
  return Math.min(max, Math.max(progress?.[game]?.level || 1, startLevel(game, profile?.arabic_level)));
}

/* ── Données serveur ── */
const DEFAULT_SETTINGS = {
  games: { suite: true, sourate: true, ordre: true, lettres: true, ilm: true },
  robot: { 1: 0.3, 2: 0.15, 3: 0.05 },
  rules: { questions: 5, ilm_questions: 10, unlock_pct: 80, flash_seconds: 3 },
  duel: { enabled: true, hours: 24, win_bonus: 20 },
  khatma: { enabled: true, days: [3, 7, 14], bonus: 50, pct: 80 },
};
export async function loadSettings() {
  const { data } = await db.from("game_settings").select("key, value");
  const s = structuredClone(DEFAULT_SETTINGS);
  for (const r of data || []) s[r.key] = { ...s[r.key], ...r.value };
  return s;
}
export async function loadProgress() {
  const { data } = await db.from("game_progress").select("game, level, best");
  return Object.fromEntries((data || []).map((r) => [r.game, r]));
}
export async function loadStats() {
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data } = await db.from("game_sessions").select("xp, total, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
  const rows = data || [];
  const days = new Set(rows.filter((r) => r.total > 0).map((r) => r.created_at.slice(0, 10))); // les bonus (duel, khatma) ne comptent pas comme un jour joué
  let streak = 0;
  for (let d = new Date(); ; d = new Date(d - 864e5)) {
    const k = d.toISOString().slice(0, 10);
    if (days.has(k)) streak++;
    else if (streak || k !== new Date().toISOString().slice(0, 10)) break;
  }
  return { xp: rows.reduce((a, r) => a + r.xp, 0), streak };
}
export async function finishGame(game, level, answers) {
  const { data, error } = await db.rpc("game_finish", { p_game: game, p_level: level, p_answers: answers });
  if (error) throw error;
  return data;
}

/* ── Outils ── */
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a, n) => shuffle(a).slice(0, n);
const surahLabel = (s) => `${s.name} (${s.n})`;
export const surahFr = (n) => SURAH_FR[n - 1] || "";

/* ── Lettres ── */
const TWINS = [["ba", "ta", "tha"], ["jim", "hha", "kha"], ["dal", "dhal"], ["ra", "zay"], ["sin", "shin"], ["sad", "dad"], ["tta", "dha"], ["ayn", "ghayn"], ["fa", "qaf"]];

function lettersQuestions(lv, count) {
  const pool = LETTERS.filter((l) => L[l.id]);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (lv.mode === "twins") {
      const fam = pick(TWINS.filter((t) => t.every((id) => L[id])), 1)[0];
      const ans = pick(fam, 1)[0];
      const extra = pick(pool.filter((l) => !fam.includes(l.id)), 4).map((l) => l.id);
      const opts = [ans, ...fam.filter((x) => x !== ans), ...extra].slice(0, 4);
      out.push({ kind: "letter-see", letter: ans, options: shuffle(opts), answer: ans });
    } else if (lv.mode === "syl") {
      const l = pick(pool.filter((x) => x.id !== "alif"), 1)[0];
      const h = pick(["fatha", "kasra", "damma"], 1)[0];
      const ans = syllable(l.id, h);
      const other = pick(pool.filter((x) => x.id !== l.id && x.id !== "alif"), 1)[0];
      const opts = [ans, ...["fatha", "kasra", "damma"].filter((x) => x !== h).map((x) => syllable(l.id, x)), syllable(other.id, h)];
      out.push({ kind: "syl", ar: ans.ar, letter: l.id, options: shuffle(opts.map((o) => o.latin)), answer: ans.latin });
    } else {
      const ans = pick(pool, 1)[0];
      const opts = shuffle([ans.id, ...pick(pool.filter((l) => l.id !== ans.id), 3).map((l) => l.id)]);
      out.push({ kind: lv.mode === "hear" ? "letter-hear" : "letter-see", letter: ans.id, options: opts, answer: ans.id });
    }
  }
  return out;
}

/* ── Coran ── */
function surahsIn(quran, lv) { return quran.filter((s) => s.n >= lv.from && s.n <= lv.to); }

function suiteQuestions(quran, lv, count) {
  const ss = surahsIn(quran, lv).filter((s) => s.v.length >= 3);
  const out = [];
  const seen = new Set();
  for (let tries = 0; out.length < count && tries < 200; tries++) {
    const s = pick(ss, 1)[0];
    const i = Math.floor(Math.random() * (s.v.length - 1));
    const key = `${s.n}:${i}`; if (seen.has(key)) continue; seen.add(key);
    const cur = s.v[i], nxt = s.v[i + 1];
    const sameSurah = s.v.filter((_, j) => j !== i + 1 && j !== i);
    const others = [...pick(sameSurah, 2), ...pick(quran.filter((x) => x.n !== s.n).flatMap((x) => x.v), 3)];
    const distract = [];
    for (const v of others) if (distract.length < 3 && v.a !== nxt.a && !distract.some((d) => d.a === v.a)) distract.push(v);
    out.push({ kind: "suite", surah: s.n, surahName: s.name, cur, answer: nxt.g, options: shuffle([nxt, ...distract]), next: nxt });
  }
  return out;
}

function sourateQuestions(quran, lv, count) {
  const ss = surahsIn(quran, lv);
  const out = [];
  for (const s of pick(ss, Math.min(count, ss.length))) {
    const v = lv.n === 5 || lv.mode !== "sens" ? pick(s.v, 1)[0] : s.v[0];
    const near = ss.filter((x) => x.n !== s.n);
    const opts = shuffle([s, ...pick(near, 3)]);
    out.push({ kind: "sourate", mode: lv.mode, verse: v, surah: s.n, answer: s.n, options: opts.map((x) => ({ n: x.n, label: surahLabel(x), fr: surahFr(x.n), ar: x.ar })) });
  }
  while (out.length < count && ss.length) out.push(sourateQuestions(quran, lv, 1)[0]);
  return out;
}

function ordreQuestions(quran, lv, count) {
  const ss = surahsIn(quran, lv).filter((s) => s.v.length >= lv.count);
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = pick(ss, 1)[0];
    const start = Math.floor(Math.random() * (s.v.length - lv.count + 1));
    const seq = s.v.slice(start, start + lv.count);
    let tiles = shuffle(seq);
    if (tiles.every((t, j) => t.k === seq[j].k)) tiles = [...seq].reverse();
    out.push({ kind: "ordre", surah: s.n, surahName: s.name, seq, tiles });
  }
  return out;
}

/** Al-Ilm : questions publiées de la base (catégorie et difficulté choisies). */
async function ilmQuestions(lv, count, category) {
  let q = db.from("game_questions").select("id, category, difficulty, type, question, choices, answer, explanation, source, note").eq("status", "published");
  if (category && category !== "mix") q = q.eq("category", category);
  const { data, error } = await q.lte("difficulty", lv.difficulty).limit(400);
  if (error) throw error;
  const rows = data || [];
  const exact = rows.filter((r) => r.difficulty === lv.difficulty);
  const chosen = [...pick(exact, count), ...pick(rows.filter((r) => r.difficulty !== lv.difficulty), count)].slice(0, count);
  return shuffle(chosen).map((r) => ({ kind: "ilm", ...r }));
}

export async function buildGame(game, levelN, { count = 5, category } = {}) {
  const lv = GAMES[game].levels.find((l) => l.n === levelN) || GAMES[game].levels[0];
  if (game === "lettres") return lettersQuestions(lv, count);
  if (game === "ilm") return ilmQuestions(lv, count, category);
  const quran = await loadQuran();
  if (game === "suite") return suiteQuestions(quran, lv, count);
  if (game === "sourate") return sourateQuestions(quran, lv, count);
  return ordreQuestions(quran, lv, count);
}

/** Le robot répond correctement avec une probabilité 1 - taux d'erreur. */
export const robotAnswers = (rate) => Math.random() >= rate;

export { LETTERS, L };

/* ── Duels 1 contre 1 en différé (lot J2) ── */
const rpc = async (fn, args) => {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message || "Erreur réseau");
  return data;
};
export const duelSearch = (q) => rpc("duel_search", { p_q: q });
export const duelList = () => rpc("duel_list", {});
export const duelGet = (id) => rpc("duel_get", { p_id: id });
export const duelJoin = (code) => rpc("duel_join", { p_code: code });
export const duelDecline = (id) => rpc("duel_decline", { p_id: id });
export const duelSubmit = (id, answers) => rpc("duel_submit", { p_id: id, p_answers: answers });
/** Tire les questions une seule fois : les deux joueurs auront exactement les mêmes. */
export async function duelCreate({ game, level, category, mode, username, count }) {
  const items = await buildGame(game, level, { count, category });
  if (!items?.length) throw new Error("Impossible de préparer les questions.");
  return rpc("duel_create", { p_game: game, p_level: level, p_category: game === "ilm" ? category || "mix" : "", p_mode: mode, p_username: username || "", p_items: items });
}
/** État d'un duel vu par moi : à jouer, en attente de l'autre, terminé, expiré, refusé. */
export function duelState(d) {
  if (d.status === "declined") return "declined";
  if (d.status === "expired") return "expired";
  if (d.status === "done") return "done";
  if (!d.me) return "play";
  return "waiting";
}

/* ── Khatma d'équipe (lot J3) ── */
export const TK_SCOPES = {
  amma: { title: "Juz Amma", unit: "sourate", from: 78, to: 114 },
  tabarak: { title: "Juz Tabarak", unit: "sourate", from: 67, to: 77 },
  ilm: { title: "Al-Ilm", unit: "thème" },
};
export const TK_ILM = ILM_CATEGORIES.filter(([k]) => k !== "mix"); // unité 1 à 9
export const tkList = () => rpc("tk_list", {});
export const tkGet = (id) => rpc("tk_get", { p_id: id });
export const tkCreate = (group, scope, days) => rpc("tk_create", { p_group: group, p_scope: scope, p_days: days });
export const tkValidate = (id, unit, score, total) => rpc("tk_validate", { p_id: id, p_unit: unit, p_score: score, p_total: total });
/** Nom d'une unité : sourate (nom latin) ou thème Al-Ilm. */
export function tkUnitName(scope, unit, quran) {
  if (scope === "ilm") return TK_ILM[unit - 1]?.[1] || `Thème ${unit}`;
  return quran?.find((s) => s.n === unit)?.name || `Sourate ${unit}`;
}
/** Niveau d'aide pour jouer une sourate : phonétique, arabe + phonétique, ou arabe seul. */
export const tkLevel = (arabicLevel) => (arabicLevel === "good" ? 3 : arabicLevel === "some" ? 2 : 1);
/** Partie sur une seule sourate : versets à enchaîner, puis versets à remettre dans l'ordre. */
export async function buildSurahGame(n, levelN, count = 5) {
  const quran = await loadQuran();
  const s = quran.find((x) => x.n === n);
  if (!s) throw new Error("Sourate introuvable.");
  const lv = { ...GAMES.suite.levels.find((l) => l.n === levelN), from: n, to: n };
  const nSuite = Math.min(count - 1, s.v.length - 1);
  const suite = suiteQuestions(quran, lv, nSuite);
  const per = Math.min(s.v.length, levelN >= 3 ? 4 : 3);
  const ordre = ordreQuestions(quran, { ...lv, count: per }, Math.max(1, Math.min(count - suite.length, s.v.length - per + 1)));
  return [...suite, ...ordre].slice(0, count);
}
