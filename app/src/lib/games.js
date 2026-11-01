// Jeux MyHafizz (lot J1) : niveaux progressifs, génération des questions,
// robot adversaire et explications après chaque réponse.
// Les réglages et la banque Al-Ilm viennent de la base (gérés par l'admin).
import { db } from "@/api/neonClient";
import { LETTERS, L, syllable } from "@/lib/qaida";
import { SURAH_FR } from "@/components/surahNamesFr";
import { SURAHS } from "@/components/quranData";

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
  hadith: {
    title: "Hadith ou pas ?", hint: "Vrai hadith ou phrase populaire", icon: "hadith",
    levels: [
      { n: 1, name: "Les célèbres", desc: "Hadiths très connus et phrases populaires.", difficulty: 1 },
      { n: 2, name: "Les pièges", desc: "Paroles de compagnons, versets, proverbes.", difficulty: 2 },
      { n: 3, name: "Les faibles", desc: "Hadiths authentiques face aux hadiths faibles.", difficulty: 3 },
    ],
  },
};
export const GAME_ORDER = ["lettres", "ilm", "hadith", "sourate", "suite", "ordre"];

export const ILM_CATEGORIES = [
  ["sira", "Sira"], ["prophetes", "Prophètes"], ["coran", "Coran"], ["compagnons", "Compagnons"], ["histoire", "Histoire"],
  ["croyance", "Croyance"], ["pratique", "Pratique"], ["hadith", "Hadith"], ["calendrier", "Calendrier"], ["noms", "99 noms"], ["tajwid", "Tajwid"], ["mix", "Mélange"],
];

export const ROBOT = [
  { n: 1, name: "Facile", desc: "Le robot se trompe souvent" },
  { n: 2, name: "Moyen", desc: "Le robot se trompe parfois" },
  { n: 3, name: "Hafiz expert", desc: "Presque imbattable" },
];

/** Niveau de départ selon le profil (on ne bloque jamais un bon lecteur au niveau 1). */
export function startLevel(game, arabicLevel) {
  if (game === "ilm" || game === "hadith") return 1;
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
  games: { suite: true, sourate: true, ordre: true, lettres: true, ilm: true, hadith: true },
  robot: { 1: 0.3, 2: 0.15, 3: 0.05 },
  rules: { questions: 5, ilm_questions: 10, unlock_pct: 80, flash_seconds: 3 },
  duel: { enabled: true, questions: 7, win: 30, draw: 5, loss: 10, quit: 20 },
  khatma: { enabled: true, days: [3, 7, 14], bonus: 50, pct: 80 },
  defi: { enabled: true, questions: 5, per_good: 5, streak_step: 2, streak_max: 20 },
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
  const { data } = await db.from("game_sessions").select("xp, total, created_at").order("created_at", { ascending: false }).limit(5000);
  const rows = data || [];
  const days = new Set(rows.filter((r) => r.total > 0).map((r) => r.created_at.slice(0, 10))); // les bonus (duel, khatma) ne comptent pas comme un jour joué
  let streak = 0;
  for (let d = new Date(); ; d = new Date(d - 864e5)) {
    const k = d.toISOString().slice(0, 10);
    if (days.has(k)) streak++;
    else if (streak || k !== new Date().toISOString().slice(0, 10)) break;
  }
  return { xp: Math.max(0, rows.reduce((a, r) => a + r.xp, 0)), streak }; // points globaux (les défaites en duel retirent des points)
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
/* Les jeux du Coran suivent le joueur : son niveau d'arabe (onboarding) fixe l'aide minimale,
   et les questions sont tirées des versets qu'il a mémorisés (en duel : ceux que les DEUX ont mémorisés).
   Pas assez de versets mémorisés : on complète avec les petites sourates les plus connues. */
const AIDS = ["ar", "both", "phon"];
export const aidOf = (level) => (level === "good" ? "ar" : level === "some" ? "both" : level === "none" ? "phon" : null);
/** L'aide la plus généreuse des deux (un débutant garde toujours la phonétique). */
export const helpier = (a, b) => (!b ? a : !a ? b : AIDS[Math.max(AIDS.indexOf(a), AIDS.indexOf(b))]);
const COMMON = [1, 103, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
const extraP = {};
/** Une sourate au format des jeux : Juz Amma / Tabarak en local, les autres depuis l'API (mise en cache). */
export async function loadSurah(n) {
  const quran = await loadQuran();
  const local = quran.find((x) => x.n === n);
  if (local) return local;
  const meta = SURAHS[n - 1];
  if (!meta) return null;
  extraP[n] ||= fetch(`https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,en.transliteration,fr.hamidullah`)
    .then((r) => r.json())
    .then((j) => {
      const [ar, tr, fr] = j.data;
      return { n, name: meta.englishName, ar: `سُورَةُ ${meta.name}`, v: ar.ayahs.map((a, i) => {
        let txt = a.text;
        if (n !== 1 && i === 0 && txt.startsWith("بِسْمِ")) txt = txt.split(" ").slice(4).join(" ");
        return { k: a.numberInSurah, g: a.number, a: txt, t: (tr.ayahs[i]?.text || "").replace(/<[^>]+>/g, ""), f: fr.ayahs[i]?.text || "" };
      }) };
    })
    .catch((e) => { delete extraP[n]; throw e; });
  return extraP[n];
}
const rpcScope = (args) => db.rpc("quran_scope", args).then(({ data, error }) => { if (error) throw error; return data; }).catch(() => ({ level: null, mem: [] }));
let myScopeP = null, myScopeAt = 0;
/** Mon niveau d'arabe et mes versets mémorisés (relu au plus toutes les minutes). */
export function myQuranScope() {
  if (!myScopeP || Date.now() - myScopeAt > 60_000) { myScopeAt = Date.now(); myScopeP = rpcScope({}); }
  return myScopeP;
}
/** Le même chose pour un adversaire (par nom d'utilisateur, id ou duel commun). */
export const quranScopeOf = ({ username, user, duel } = {}) => rpcScope({ p_username: username || null, p_user: user || null, p_duel: duel || null });
/** Sourates de jeu limitées aux versets mémorisés par tous les joueurs donnés. */
export async function quranScope(mems, { min = 8, maxExtra = 6 } = {}) {
  let map = null;
  for (const m of mems) {
    const cur = new Map((m || []).map((x) => [Number(x.s), new Set((x.v || []).map(Number))]));
    if (!map) { map = cur; continue; }
    for (const [n, set] of map) { const o = cur.get(n); if (!o) map.delete(n); else map.set(n, new Set([...set].filter((v) => o.has(v)))); }
  }
  map ||= new Map();
  const verses = [...map.values()].reduce((a, x) => a + x.size, 0);
  const personal = verses >= min;
  if (!personal) for (const n of COMMON) map.set(n, new Set(Array.from({ length: SURAHS[n - 1].numberOfAyahs }, (_, i) => i + 1)));
  let nums = [...map.keys()].filter((n) => map.get(n).size);
  const far = shuffle(nums.filter((n) => n < 67 && !COMMON.includes(n)));
  if (far.length > maxExtra) { const drop = new Set(far.slice(maxExtra)); nums = nums.filter((n) => !drop.has(n)); }
  const surahs = (await Promise.all(nums.map((n) => loadSurah(n).catch(() => null)))).filter(Boolean).map((x) => ({ ...x, ok: map.get(x.n) }));
  return { surahs, personal, verses, surahCount: surahs.length };
}
/** Mon périmètre de jeu : ce que j'ai mémorisé (seul) ou ce que nous avons tous les deux mémorisé (duel). */
export async function playScope(opponent) {
  const me = await myQuranScope();
  const mems = [me.mem];
  if (opponent) mems.push((await quranScopeOf(opponent)).mem);
  return { ...(await quranScope(mems)), level: me.level };
}
const okAt = (s, i) => !s.ok || s.ok.has(s.v[i]?.k);
function surahsIn(quran, lv) { return lv.scope?.length ? lv.scope : quran.filter((s) => s.n >= lv.from && s.n <= lv.to); }

function suiteQuestions(quran, lv, count) {
  const pairs = (s) => s.v.map((_, i) => i).filter((i) => i < s.v.length - 1 && okAt(s, i) && okAt(s, i + 1));
  const ss = surahsIn(quran, lv).filter((s) => s.v.length >= 3 && pairs(s).length);
  const out = [];
  const seen = new Set();
  if (!ss.length) return out;
  for (let tries = 0; out.length < count && tries < 200; tries++) {
    const s = pick(ss, 1)[0];
    const i = pick(pairs(s), 1)[0];
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
  const pool = ss.length >= 4 ? ss : [...ss, ...quran.filter((x) => !ss.some((y) => y.n === x.n))];
  for (const s of pick(ss, Math.min(count, ss.length))) {
    const mine = s.v.filter((_, i) => okAt(s, i));
    const v = lv.n === 5 || lv.mode !== "sens" ? pick(mine, 1)[0] : mine[0];
    const near = (ss.length >= 4 ? ss : pool.filter((x) => Math.abs(x.n - s.n) <= 20 || ss.includes(x))).filter((x) => x.n !== s.n);
    const opts = shuffle([s, ...pick(near, 3)]);
    out.push({ kind: "sourate", mode: lv.mode, verse: v, surah: s.n, answer: s.n, options: opts.map((x) => ({ n: x.n, label: surahLabel(x), fr: surahFr(x.n), ar: x.ar })) });
  }
  while (out.length < count && ss.length) out.push(sourateQuestions(quran, lv, 1)[0]);
  return out;
}

function ordreQuestions(quran, lv, count) {
  const starts = (s, c) => s.v.map((_, i) => i).filter((i) => i + c <= s.v.length && s.v.slice(i, i + c).every((_, j) => okAt(s, i + j)));
  let c = lv.count, ss = [];
  for (; c >= 2; c--) { ss = surahsIn(quran, lv).filter((s) => starts(s, c).length); if (ss.length) break; }
  const out = [];
  if (!ss.length) return out;
  for (let i = 0; i < count; i++) {
    const s = pick(ss, 1)[0];
    const start = pick(starts(s, c), 1)[0];
    const seq = s.v.slice(start, start + c);
    let tiles = shuffle(seq);
    if (tiles.every((t, j) => t.k === seq[j].k)) tiles = [...seq].reverse();
    out.push({ kind: "ordre", surah: s.n, surahName: s.name, seq, tiles });
  }
  return out;
}

/** Al-Ilm : questions publiées de la base (catégorie et difficulté choisies). */
async function ilmQuestions(lv, count, category) {
  let q = db.from("game_questions").select("id, category, difficulty, type, question, choices, answer, explanation, source, note").eq("status", "published");
  if (category && category !== "mix") q = q.eq("category", category); else q = q.not("category", "in", "(hadith_vf,tafsir)");
  const { data, error } = await q.lte("difficulty", lv.difficulty).limit(400);
  if (error) throw error;
  const rows = data || [];
  const exact = rows.filter((r) => r.difficulty === lv.difficulty);
  const chosen = [...pick(exact, count), ...pick(rows.filter((r) => r.difficulty !== lv.difficulty), count)].slice(0, count);
  return shuffle(chosen).map((r) => ({ kind: "ilm", ...r }));
}

/** « Hadith ou pas ? » : phrases publiées par l'admin, au niveau choisi. */
async function hadithQuestions(lv, count) {
  const { data, error } = await db.from("game_questions").select("id, difficulty, question, answer, explanation, source, note").eq("status", "published").eq("category", "hadith_vf").lte("difficulty", lv.difficulty).limit(400);
  if (error) throw error;
  const rows = data || [];
  const exact = shuffle(rows.filter((r) => r.difficulty === lv.difficulty));
  const rest = shuffle(rows.filter((r) => r.difficulty !== lv.difficulty));
  return [...exact, ...rest].slice(0, count).map((r) => ({ kind: "hadith", id: r.id, statement: r.question, answer: r.answer, explanation: r.explanation, source: r.source, note: r.note }));
}

export async function hadithCount() {
  const { count } = await db.from("game_questions").select("id", { count: "exact", head: true }).eq("status", "published").eq("category", "hadith_vf");
  return count || 0;
}

export async function buildGame(game, levelN, { count = 5, category, scope } = {}) {
  const lv = { ...(GAMES[game].levels.find((l) => l.n === levelN) || GAMES[game].levels[0]), scope: scope?.surahs };
  if (game === "hadith") return hadithQuestions(lv, Math.max(count, 10));
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

/* ── Duel en direct ── */
const rpc = async (fn, args) => {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message || "Erreur réseau");
  return data;
};
export const ldSearch = (q) => rpc("ld_search", { p_q: q || "" });
export const ldState = (id) => rpc("ld_state", { p_id: id });
export const ldRespond = (id, accept) => rpc("ld_respond", { p_id: id, p_accept: accept });
export const ldCancel = (id) => rpc("ld_cancel", { p_id: id });
export const ldAnswer = (id, q, choice, ok) => rpc("ld_answer", { p_id: id, p_q: q, p_choice: choice ?? null, p_ok: !!ok });
export const ldQuit = (id) => rpc("ld_quit", { p_id: id });
export const playerProfile = (username) => rpc("player_profile", { p_username: username || null });
export const notifList = () => rpc("notif_list", {});
export const notifReadAll = () => rpc("notif_read_all", {});
export const notifPoll = () => rpc("notif_poll", {});
const NOTIF_URL = import.meta.env.VITE_NOTIF_URL || "https://br-gentle-bird-ba2xrv1u-notif.compute.c-8.eu-central-1.aws.neon.tech/";
/** Demande l'envoi immédiat des notifications push en attente (défi, revanche). */
export const pushNow = () => fetch(NOTIF_URL, { method: "POST" }).catch(() => {});

/** 7 questions tirées au hasard dans tous les jeux, mélangés. Le serveur écarte celles déjà vues. */
export async function buildDuelPool(n = 30, cfg = {}, scope) {
  const quran = await loadQuran();
  const sc = scope?.surahs;
  const { data } = await db.from("game_questions").select("id, category, difficulty, type, question, choices, answer, explanation, source, note").eq("status", "published").not("category", "in", "(hadith_vf,tafsir)").lte("difficulty", 2).limit(600);
  const ilm = shuffle(data || []);
  const r = (a) => a[Math.floor(Math.random() * a.length)];
  const out = [];
  const make = {
    ilm: () => { const q = ilm.pop(); return q && { kind: "ilm", ...q, key: `ilm:${q.id}`, game: "ilm" }; },
    suite: () => { const lv = { ...r(GAMES.suite.levels.slice(0, 4)), scope: sc }; const q = suiteQuestions(quran, lv, 1)[0]; return q && { ...q, key: `suite:${q.surah}:${q.cur.k}`, game: "suite" }; },
    sourate: () => { const lv = { ...r(GAMES.sourate.levels.slice(0, 4)), scope: sc }; const q = sourateQuestions(quran, lv, 1)[0]; return q && { ...q, key: `sourate:${q.surah}:${q.verse.k}:${q.mode}`, game: "sourate" }; },
    ordre: () => { const lv = { ...r(GAMES.ordre.levels.slice(0, 3)), scope: sc }; const q = ordreQuestions(quran, lv, 1)[0]; return q && { ...q, key: `ordre:${q.surah}:${q.seq[0].k}:${q.seq.length}`, game: "ordre" }; },
    lettres: () => { const lv = r(GAMES.lettres.levels.slice(0, 4)); const q = lettersQuestions({ ...lv, timer: 0 }, 1)[0]; return q && { ...q, key: `lettres:${q.kind}:${q.letter}:${Math.random().toString(36).slice(2, 6)}`, game: "lettres" }; },
  };
  const bag = ["ilm", "ilm", "ilm", "suite", "suite", "sourate", "sourate", "ordre", "lettres"];
  for (let t = 0; out.length < n && t < n * 3; t++) {
    const q = make[r(bag)]();
    if (q && !out.some((o) => o.key === q.key)) out.push({ ...q, secs: q.kind === "ordre" ? Number(cfg.secs_ordre) || 25 : Number(cfg.secs) || 15 });
  }
  return shuffle(out);
}
export async function ldInvite(username, rematchOf) {
  const st = await loadSettings().catch(() => ({}));
  const scope = await playScope(rematchOf ? { duel: rematchOf } : { username });
  const pool = await buildDuelPool(Math.max(30, (Number(st.duel?.questions) || 7) * 4), st.duel || {}, scope);
  const id = await rpc("ld_invite", { p_username: username || "", p_candidates: pool, p_rematch_of: rematchOf || null });
  pushNow();
  return id;
}

/* ── Tournois ── */
export const tnList = () => rpc("tn_list", {});
export const tnState = (id, pool) => rpc("tn_state", { p_id: id, p_candidates: pool || null });
export const tnJoin = (id, join) => rpc("tn_join", { p_id: id, p_join: !!join });
export const tnCreate = (group, title, starts, size) => rpc("tn_create", { p_group: group, p_title: title, p_starts: starts, p_size: size });
export const tnCancel = (id) => rpc("tn_cancel", { p_id: id });
/** Nom d'un tour : Finale, Demi-finale, Quart de finale, Huitième de finale. */
export function roundName(r, rounds, plural) {
  const k = (rounds || 1) - r;
  return k <= 0 ? (plural ? "Finale" : "Finale") : k === 1 ? (plural ? "Demi-finales" : "Demi-finale") : k === 2 ? (plural ? "Quarts de finale" : "Quart de finale") : (plural ? "Huitièmes de finale" : "Huitième de finale");
}

/* ── Ligues de la semaine ── */
export const TIERS = ["Bronze", "Argent", "Or", "Émeraude", "Saphir", "Diamant"];
export const lgGet = () => rpc("lg_get", {});
export const lgSeen = () => rpc("lg_seen", {});

/* ── Défi du jour ── */
export const dcGet = (candidates) => rpc("dc_get", { p_candidates: candidates || null });
export const dcStart = () => rpc("dc_start", {});
export const dcAnswer = (k, ok, ms) => rpc("dc_answer", { p_k: k, p_ok: !!ok, p_ms: Math.round(ms || 0) }).catch(() => null);
export const dcSubmit = (answers, ms) => rpc("dc_submit", { p_answers: answers, p_ms: Math.round(ms) });
export const dcBoard = (scope) => rpc("dc_board", { p_scope: scope || "all" });
/** Charge le défi du jour ; s'il n'existe pas encore, propose des questions faciles et mélangées. */
export async function loadDefi() {
  const d = await dcGet();
  if (d.ready || !d.enabled) return d;
  const st = await loadSettings().catch(() => ({}));
  // le défi est le même pour tous : versets des petites sourates que tout le monde connaît
  const pool = (await buildDuelPool(20, {}, await quranScope([[]]))).filter((q) => q.kind !== "ordre" || q.seq.length <= 3);
  return dcGet(pool.slice(0, Math.max(5, Number(st.defi?.questions) || 5)));
}

/** Grades façon Call of Duty : 7 grades à 3 échelons. */
export const GRADES = [
  { name: "Recrue", min: 0 }, { name: "Apprenti", min: 150 }, { name: "Confirmé", min: 450 }, { name: "Expert", min: 900 },
  { name: "Élite", min: 1800 }, { name: "Maître", min: 3000 }, { name: "Légende", min: 5000 },
];
export function gradeOf(points = 0) {
  let g = 0;
  GRADES.forEach((x, k) => { if (points >= x.min) g = k; });
  const lo = GRADES[g].min, hi = GRADES[g + 1]?.min ?? lo + 3000;
  const step = (hi - lo) / 3;
  const ech = Math.min(2, Math.floor((points - lo) / step));
  const nextAt = ech < 2 ? Math.round(lo + step * (ech + 1)) : hi;
  const label = `${GRADES[g].name} ${["I", "II", "III"][ech]}`;
  const nextLabel = ech < 2 ? `${GRADES[g].name} ${["I", "II", "III"][ech + 1]}` : GRADES[g + 1] ? `${GRADES[g + 1].name} I` : null;
  const from = Math.round(lo + step * ech);
  return { index: g, ech, label, name: GRADES[g].name, nextLabel, toNext: Math.max(0, nextAt - points), pct: Math.min(100, ((points - from) / Math.max(1, nextAt - from)) * 100) };
}
export const BADGES = [
  ["duel_1", "Premier duel", "sword"], ["duel_10", "10 duels", "sword"], ["duel_50", "50 duels", "sword"], ["duel_100", "100 duels", "sword"],
  ["win_1", "1re victoire", "trophy"], ["win_10", "10 victoires", "trophy"], ["win_50", "50 victoires", "trophy"], ["win_100", "100 victoires", "crown"],
  ["streak_3", "3 victoires de suite", "fire"], ["streak_5", "Série de 5", "fire"], ["streak_10", "Série de 10", "fire"],
  ["perfect_1", "Sans faute", "target"], ["perfect_10", "10 sans faute", "target"], ["rematch_1", "Revanche gagnée", "arrows"],
  ["fairplay_20", "Fair-play (20 duels sans abandon)", "handshake"], ["khatma_1", "Khatma d'équipe", "users"], ["khatma_5", "5 khatmas d'équipe", "users"],
  ["solo_10", "10 parties solo", "game"], ["solo_100", "100 parties solo", "game"],
  ["tournoi_champion", "Champion de tournoi", "crown"], ["tournoi_finale", "Finaliste de tournoi", "trophy"],
  ["league_podium", "Podium de ligue", "trophy"], ["league_diamant", "Ligue Diamant", "crown"],
  ["grade_confirme", "Grade Confirmé", "medal"], ["grade_expert", "Grade Expert", "medal"], ["grade_elite", "Grade Élite", "medal"], ["grade_maitre", "Grade Maître", "medal"], ["grade_legende", "Grade Légende", "crown"],
];
export const badgeName = (id) => BADGES.find((b) => b[0] === id)?.[1] || id;

/* ── Khatma d'équipe (lot J3) ── */
export const TK_SCOPES = {
  amma: { title: "Juz Amma", unit: "sourate", from: 78, to: 114 },
  tabarak: { title: "Juz Tabarak", unit: "sourate", from: 67, to: 77 },
  ilm: { title: "Al-Ilm", unit: "thème" },
};
export const TK_ILM = ILM_CATEGORIES.filter(([k]) => k !== "mix" && k !== "noms" && k !== "tajwid"); // unité 1 à 9
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
