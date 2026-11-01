import { db } from "@/api/neonClient";
import { playClip, stopAudio } from "@/lib/qaida";

const rpc = (fn, args) => db.rpc(fn, args).then(({ data, error }) => { if (error) throw error; return data; });

/** Les 3 récitants du poème (enregistrements d'archive.org). */
const IA = "https://archive.org/download/";
export const RECITERS = [
  { id: "suwayd", name: "Ayman Suwayd", short: "A. Suwayd", info: "Lent, idéal pour apprendre", url: () => `${IA}20240227_20240227_1628/001%20%20%D8%AA%D8%AD%D9%81%D8%A9%20%D8%A7%D9%84%D8%A3%D8%B7%D9%81%D8%A7%D9%84%20%D8%A8%D8%B5%D9%88%D8%AA%20%D8%A7%D9%84%D8%B4%D9%8A%D8%AE%20%D8%A3%D9%8A%D9%85%D9%86%20%D8%B3%D9%88%D9%8A%D8%AF.mp3` },
  { id: "ghamdi", name: "Saad al-Ghamdi", short: "S. al-Ghamdi", info: "Rythme normal", url: () => `${IA}20240514_20240514_1448/001%20%20%20%D9%85%D8%AA%D9%86%20%D8%AA%D8%AD%D9%81%D8%A9%20%D8%A7%D9%84%D8%A3%D8%B7%D9%81%D8%A7%D9%84%20%D8%A8%D8%B5%D9%88%D8%AA%20%D8%A7%D9%84%D8%B4%D9%8A%D8%AE%20%D8%B3%D8%B9%D8%AF%20%D8%A7%D9%84%D8%BA%D8%A7%D9%85%D8%AF%D9%8A.mp3` },
  { id: "soufi", name: "Abdul Hakim Soufi", short: "A. Soufi", info: "Voix claire, en 11 parties", url: (part) => `${IA}3.Matn_Tohfat_Atfal/${String(part).padStart(2, "0")}_KAdim_Kitab_Alah.mp3` },
];
const KEY = "mh-tajwid-reciter";
export const getReciter = (audio) => {
  const saved = localStorage.getItem(KEY);
  const ok = (id) => id && (!audio || Object.keys(audio[id] || {}).length > 0);
  return ok(saved) ? saved : ["suwayd", "ghamdi", "soufi"].find(ok) || "ghamdi";
};
export const setReciter = (id) => localStorage.setItem(KEY, id);
export const reciterOf = (id) => RECITERS.find((r) => r.id === id) || RECITERS[0];

/** Un petit fichier par vers, servi par myhafizz.com : démarre tout de suite, sans chercher dans un long enregistrement. */
const LOCAL = new Set(["ghamdi", "soufi"]);
export const verseUrl = (reciter, n) => `/audio/tajwid/${reciter}/${n}.mp3`;
const warm = new Map();
/** Précharge les vers à venir pour qu'ils partent sans attente. */
export function prefetchVerses(reciter, list) {
  if (!LOCAL.has(reciter)) return;
  for (const n of list) {
    const u = verseUrl(reciter, n);
    if (warm.has(u)) continue;
    const a = new Audio(); a.preload = "auto"; a.src = u; warm.set(u, a);
  }
}

/** Joue le vers n avec le récitant choisi. Renvoie false si ce récitant n'a pas ce vers. */
export function playVerse(audio, reciter, n, times = 1, onEnd) {
  const t = audio?.[reciter]?.[n];
  if (!t) return false;
  const [part, t0, t1] = t;
  if (LOCAL.has(reciter)) {
    playClip(verseUrl(reciter, n), 0, 1e9, times, onEnd, true);
    prefetchVerses(reciter, [n + 1, n + 2]);
  } else playClip(reciterOf(reciter).url(part), t0, t1, times, onEnd);
  return true;
}
export { stopAudio };

export const tajwidAll = () => rpc("tajwid_all", {});
export const tajwidDone = (unit, ok, total, answers) => rpc("tajwid_done", { p_unit: unit, p_ok: ok, p_total: total, p_answers: answers });
export const tajwidMemo = (n, on) => rpc("tajwid_memo_set", { p_n: n, p_on: on });

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** Mauvaises réponses : les autres règles de l'unité, puis des règles choisies qui ne peuvent pas aussi s'appliquer au mot montré. */
const EXTRA = { 1: [], 2: ["izhar", "ikhfa", "idgham_ng"], 3: ["izhar", "iqlab"], 4: ["ikhfa_sh", "idgham_sh"], 5: ["izhar_sh"], 6: ["wajib", "lazim"], 7: [], 8: ["wajib", "munfasil"] };
const EXCL = { ikhfa_sh: ["iqlab"], iqlab: ["ikhfa_sh"], idgham_sh: ["mithlayn"], mithlayn: ["idgham_sh"] };
function distractors(rules, rule, n = 3) {
  const by = new Map(rules.map((r) => [r.id, r]));
  const same = shuffle(rules.filter((r) => r.unit === rule.unit && r.id !== rule.id));
  const extra = shuffle((EXTRA[rule.unit] || []).map((id) => by.get(id)).filter(Boolean));
  const no = new Set(EXCL[rule.id] || []);
  return [...same, ...extra].filter((r) => !no.has(r.id)).slice(0, n);
}

/**
 * Exercices d'une unité (8 à 10) : « Quelle règle ? » sur des mots du Coran, « Complète le vers », et questions du poème.
 * Chaque exercice : { kind, prompt, choices[], answer, explain, ex? (exemple coranique), verse? }
 */
export function buildExercises(data, unit) {
  const rules = (data?.rules || []);
  const mine = rules.filter((r) => r.unit === unit && r.ex?.length);
  const verses = (data?.verses || []).filter((v) => v.unit === unit);
  const all = data?.verses || [];
  const out = [];
  // 1. Quelle règle ? (2 par règle, 5 au plus)
  const pool = shuffle(mine.flatMap((r) => shuffle(r.ex).slice(0, 2).map((e) => ({ r, e })))).slice(0, unit === 2 ? 3 : 5);
  for (const { r, e } of pool) {
    const wrong = distractors(rules, r);
    const choices = shuffle([r, ...wrong.slice(0, 3)]);
    out.push({ kind: "rule", prompt: "Quelle règle s'applique ici ?", ex: e, choices: choices.map((x) => x.label), answer: choices.indexOf(r),
      explain: `${r.name} : ${r.body}${r.verses ? ` (vers ${r.verses})` : ""}` });
  }
  // 2. Complète le vers (2)
  for (const v of shuffle(verses).slice(0, Math.min(2, verses.length))) {
    const others = shuffle(all.filter((x) => x.n !== v.n && Math.abs(x.n - v.n) <= 8)).slice(0, 2).map((x) => x.b);
    const choices = shuffle([v.b, ...others]);
    out.push({ kind: "verse", prompt: "Complète le vers", verse: v, choices, answer: choices.indexOf(v.b), arabic: true,
      explain: `Vers ${v.n} : ${v.a} · ${v.b}. ${v.f}` });
  }
  // 3. Questions sur le poème (3)
  for (const q of shuffle((data?.qcm || []).filter((q) => q.unit === unit)).slice(0, 3)) {
    const idx = shuffle(q.c.map((_, i) => i));
    out.push({ kind: "qcm", id: q.id, prompt: q.q, choices: idx.map((i) => q.c[i]), answer: idx.indexOf(q.ans), explain: q.exp });
  }
  return shuffle(out);
}

/** Exemple coranique à montrer pour une règle dans la leçon (le plus court). */
export const lessonExample = (r) => (r.ex || [])[0];

/** Unité conseillée = première non réussie. */
export function progressOf(data) {
  const units = data?.units || [];
  const me = new Map((data?.me?.units || []).map((u) => [u.unit, u]));
  const passed = units.filter((u) => me.get(u.n)?.passed).length;
  const current = units.find((u) => !me.get(u.n)?.passed) || null;
  return { me, passed, total: units.length, current, pct: units.length ? Math.round((passed / units.length) * 100) : 0 };
}
export { pick };
