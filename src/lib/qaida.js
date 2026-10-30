/**
 * MyHafizz · Apprendre à lire (progression Qaida Nourania)
 * Contenu des unités, génération des exercices et voix.
 */

// ── Les 28 lettres ─────────────────────────────────────────────
// joins: false = ne s'attache pas à la lettre suivante (ا د ذ ر ز و)
export const LETTERS = [
  { id: "alif", ar: "ا", name: "Alif", nameAr: "أَلِف", sound: "a", hint: "Support des voyelles, comme un « a » ouvert.", joins: false },
  { id: "ba", ar: "ب", name: "Bâ", nameAr: "بَاء", sound: "b", hint: "Comme le « b » de bateau. Un point dessous." },
  { id: "ta", ar: "ت", name: "Tâ", nameAr: "تَاء", sound: "t", hint: "Comme le « t » de table. Deux points dessus." },
  { id: "tha", ar: "ث", name: "Thâ", nameAr: "ثَاء", sound: "th", hint: "Comme le « th » anglais de think, langue entre les dents. Trois points." },
  { id: "jim", ar: "ج", name: "Jîm", nameAr: "جِيم", sound: "j", hint: "Comme « dj » dans djellaba. Un point dans le ventre." },
  { id: "hha", ar: "ح", name: "Ḥâ", nameAr: "حَاء", sound: "ḥ", hint: "Un « h » soufflé du milieu de la gorge, sans point." },
  { id: "kha", ar: "خ", name: "Khâ", nameAr: "خَاء", sound: "kh", hint: "Comme la « jota » espagnole, un r raclé. Un point dessus." },
  { id: "dal", ar: "د", name: "Dâl", nameAr: "دَال", sound: "d", hint: "Comme le « d » de date.", joins: false },
  { id: "dhal", ar: "ذ", name: "Dhâl", nameAr: "ذَال", sound: "dh", hint: "Comme le « th » anglais de this. Un point dessus.", joins: false },
  { id: "ra", ar: "ر", name: "Râ", nameAr: "رَاء", sound: "r", hint: "Un « r » roulé du bout de la langue.", joins: false },
  { id: "zay", ar: "ز", name: "Zây", nameAr: "زَاي", sound: "z", hint: "Comme le « z » de zèbre. Un point dessus.", joins: false },
  { id: "sin", ar: "س", name: "Sîn", nameAr: "سِين", sound: "s", hint: "Comme le « s » de sac. Trois dents, sans point." },
  { id: "shin", ar: "ش", name: "Chîn", nameAr: "شِين", sound: "ch", hint: "Comme le « ch » de chat. Trois points dessus." },
  { id: "sad", ar: "ص", name: "Ṣâd", nameAr: "صَاد", sound: "ṣ", hint: "Un « s » lourd, la bouche arrondie." },
  { id: "dad", ar: "ض", name: "Ḍâd", nameAr: "ضَاد", sound: "ḍ", hint: "Un « d » lourd, les côtés de la langue contre les molaires." },
  { id: "tta", ar: "ط", name: "Ṭâ", nameAr: "طَاء", sound: "ṭ", hint: "Un « t » lourd, la langue plaquée." },
  { id: "dha", ar: "ظ", name: "Ẓâ", nameAr: "ظَاء", sound: "ẓ", hint: "Un « dh » lourd, langue entre les dents." },
  { id: "ayn", ar: "ع", name: "ʿAyn", nameAr: "عَيْن", sound: "ʿ", hint: "Son serré du milieu de la gorge, propre à l'arabe." },
  { id: "ghayn", ar: "غ", name: "Ghayn", nameAr: "غَيْن", sound: "gh", hint: "Comme le « r » parisien grasseyé. Un point dessus." },
  { id: "fa", ar: "ف", name: "Fâ", nameAr: "فَاء", sound: "f", hint: "Comme le « f » de fleur. Un point dessus." },
  { id: "qaf", ar: "ق", name: "Qâf", nameAr: "قَاف", sound: "q", hint: "Un « k » profond, du fond de la gorge. Deux points." },
  { id: "kaf", ar: "ك", name: "Kâf", nameAr: "كَاف", sound: "k", hint: "Comme le « k » de kilo." },
  { id: "lam", ar: "ل", name: "Lâm", nameAr: "لَام", sound: "l", hint: "Comme le « l » de lune." },
  { id: "mim", ar: "م", name: "Mîm", nameAr: "مِيم", sound: "m", hint: "Comme le « m » de maman." },
  { id: "nun", ar: "ن", name: "Noûn", nameAr: "نُون", sound: "n", hint: "Comme le « n » de nid. Un point dans la coupe." },
  { id: "ha", ar: "ه", name: "Hâ", nameAr: "هَاء", sound: "h", hint: "Un « h » léger, simple souffle." },
  { id: "waw", ar: "و", name: "Wâw", nameAr: "وَاو", sound: "w", hint: "Comme « ou » dans ouate.", joins: false },
  { id: "ya", ar: "ي", name: "Yâ", nameAr: "يَاء", sound: "y", hint: "Comme le « y » de yaourt. Deux points dessous." },
];
export const L = Object.fromEntries(LETTERS.map((l) => [l.id, l]));

// Lettres qui se ressemblent : on les met ensemble dans les choix pour apprendre à les distinguer
const FAMILIES = [["ba", "ta", "tha", "nun", "ya"], ["jim", "hha", "kha"], ["dal", "dhal"], ["ra", "zay", "waw"], ["sin", "shin"], ["sad", "dad"], ["tta", "dha"], ["ayn", "ghayn"], ["fa", "qaf"], ["kaf", "lam"], ["ha", "mim"]];
const familyOf = (id) => FAMILIES.find((f) => f.includes(id)) || [];

// ── Formes liées ───────────────────────────────────────────────
const TATWEEL = "ـ";
export function formsOf(l) {
  if (l.joins === false) return { iso: l.ar, ini: l.ar, med: TATWEEL + l.ar, fin: TATWEEL + l.ar };
  return { iso: l.ar, ini: l.ar + TATWEEL, med: TATWEEL + l.ar + TATWEEL, fin: TATWEEL + l.ar };
}
export const POSITIONS = { iso: "Seule", ini: "Début", med: "Milieu", fin: "Fin" };

// ── Voyelles courtes et tanwin ─────────────────────────────────
export const HARAKAT = {
  fatha: { mark: "\u064E", name: "Fatḥa", vowel: "a", hint: "Petit trait au-dessus : on ajoute « a »." },
  kasra: { mark: "\u0650", name: "Kasra", vowel: "i", hint: "Petit trait en dessous : on ajoute « i »." },
  damma: { mark: "\u064F", name: "Ḍamma", vowel: "ou", hint: "Petit wâw au-dessus : on ajoute « ou »." },
  fathatan: { mark: "\u064B", name: "Tanwîn fatḥ", vowel: "an", hint: "Deux traits au-dessus : « an ». S'écrit souvent avec un alif." },
  kasratan: { mark: "\u064D", name: "Tanwîn kasr", vowel: "in", hint: "Deux traits en dessous : « in »." },
  dammatan: { mark: "\u064C", name: "Tanwîn ḍamm", vowel: "oun", hint: "Deux ḍamma au-dessus : « oun »." },
};
// Translittération simple pour la syllabe (lettre + voyelle)
const LATIN = { alif: "", ayn: "ʿ", hha: "ḥ", sad: "ṣ", dad: "ḍ", tta: "ṭ", dha: "ẓ" };
export function syllable(letterId, h) {
  const l = L[letterId];
  const ar = (letterId === "alif" ? "أ" : l.ar) + HARAKAT[h].mark + (h === "fathatan" && !["alif"].includes(letterId) ? "ا" : "");
  const c = LATIN[letterId] ?? l.sound;
  return { ar, latin: c + HARAKAT[h].vowel, letter: letterId, h };
}

// ── Unités et leçons ───────────────────────────────────────────
const G = [["alif", "ba", "ta", "tha"], ["jim", "hha", "kha", "dal"], ["dhal", "ra", "zay", "sin"], ["shin", "sad", "dad", "tta"], ["dha", "ayn", "ghayn", "fa"], ["qaf", "kaf", "lam", "mim"], ["nun", "ha", "waw", "ya"]];
const ALL = LETTERS.map((l) => l.id);
const FIRST14 = ALL.slice(0, 14), LAST14 = ALL.slice(14);

export const UNITS = [
  {
    id: "u1", title: "Les lettres", subtitle: "Reconnaître les 28 lettres et leur son",
    lessons: [
      ...G.map((g, i) => ({ id: `u1l${i + 1}`, kind: "letters", title: g.map((x) => L[x].ar).join(" "), letters: g })),
      { id: "u1r", kind: "letters", review: true, title: "Révision", letters: ALL },
    ],
  },
  {
    id: "u2", title: "Les formes liées", subtitle: "La même lettre au début, au milieu et à la fin",
    lessons: [
      ...G.map((g, i) => ({ id: `u2l${i + 1}`, kind: "forms", title: g.map((x) => L[x].ar).join(" "), letters: g })),
      { id: "u2r", kind: "forms", review: true, title: "Révision", letters: ALL },
    ],
  },
  {
    id: "u3", title: "Les voyelles courtes", subtitle: "Fatḥa, kasra, ḍamma et tanwîn",
    lessons: [
      { id: "u3l1", kind: "harakat", title: "Fatḥa  ـَ", harakat: ["fatha"], letters: FIRST14 },
      { id: "u3l2", kind: "harakat", title: "Fatḥa  ـَ", harakat: ["fatha"], letters: LAST14 },
      { id: "u3l3", kind: "harakat", title: "Kasra  ـِ", harakat: ["kasra"], letters: ALL, mixWith: ["fatha"] },
      { id: "u3l4", kind: "harakat", title: "Ḍamma  ـُ", harakat: ["damma"], letters: ALL, mixWith: ["fatha", "kasra"] },
      { id: "u3l5", kind: "harakat", title: "Les trois", harakat: ["fatha", "kasra", "damma"], letters: ALL, review: true },
      { id: "u3l6", kind: "harakat", title: "Tanwîn  ـً ـٍ ـٌ", harakat: ["fathatan", "kasratan", "dammatan"], letters: ALL.filter((x) => x !== "alif") },
      { id: "u3r", kind: "harakat", title: "Révision", harakat: ["fatha", "kasra", "damma", "fathatan", "kasratan", "dammatan"], letters: ALL.filter((x) => x !== "alif"), review: true },
    ],
  },
];
export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u.id })));
export const lessonById = (id) => ALL_LESSONS.find((l) => l.id === id);

// Lettres déjà vues avant une leçon (pour réviser et pour les choix)
function lettersBefore(lesson) {
  const idx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
  const seen = new Set();
  ALL_LESSONS.slice(0, idx).forEach((l) => (l.letters || []).forEach((x) => seen.add(x)));
  return [...seen];
}

// ── Aléatoire ──────────────────────────────────────────────────
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a, n) => shuffle(a).slice(0, n);
function distractors(target, pool, n = 3) {
  const fam = familyOf(target).filter((x) => x !== target && pool.includes(x));
  const rest = pool.filter((x) => x !== target && !fam.includes(x));
  return [...pick(fam, Math.min(2, fam.length)), ...pick(rest, n)].slice(0, n);
}

// ── Génération d'une leçon ─────────────────────────────────────
export function buildLesson(lesson) {
  const before = lettersBefore(lesson);
  const pool = [...new Set([...lesson.letters, ...before])];
  const choicePool = pool.length >= 4 ? pool : ALL;
  const items = [];
  const target = lesson.review ? pick(lesson.letters, 6) : lesson.letters;

  if (lesson.kind === "letters") {
    if (!lesson.review) target.forEach((id) => items.push({ type: "intro", letter: id }));
    target.forEach((id) => {
      items.push({ type: "read", prompt: L[id].ar, answer: id, options: shuffle([id, ...distractors(id, choicePool)]), show: "name" });
      items.push({ type: "listen", say: L[id].nameAr, answer: id, options: shuffle([id, ...distractors(id, choicePool)]) });
    });
    items.push({ type: "pairs", pairs: pick(target, 4).map((id) => [id, L[id].ar, L[id].name]) });
    pick(target, lesson.review ? 2 : 2).forEach((id) => items.push({ type: "trace", letter: id }));
    if (before.length && !lesson.review) pick(before, 2).forEach((id) => items.push({ type: "read", prompt: L[id].ar, answer: id, options: shuffle([id, ...distractors(id, ALL)]), show: "name", reviewItem: true }));
  }

  if (lesson.kind === "forms") {
    if (!lesson.review) target.forEach((id) => items.push({ type: "intro-forms", letter: id }));
    target.forEach((id) => {
      const f = formsOf(L[id]);
      const pos = pick(["ini", "med", "fin"], 2);
      pos.forEach((p) => items.push({ type: "form", prompt: f[p], answer: id, options: shuffle([id, ...distractors(id, choicePool)]), show: "letter" }));
      const p = L[id].joins === false ? "fin" : pick(["ini", "med", "fin"], 1)[0];
      items.push({ type: "position", prompt: f[p], answer: p, options: L[id].joins === false ? ["iso", "fin"] : ["ini", "med", "fin"], letter: id });
    });
    items.push({ type: "pairs", pairs: pick(target, 4).map((id) => [id, formsOf(L[id]).med, L[id].ar]), arBoth: true });
  }

  if (lesson.kind === "harakat") {
    const hs = lesson.harakat;
    if (!lesson.review) hs.forEach((h) => items.push({ type: "intro-haraka", h, example: pick(lesson.letters.filter((x) => x !== "alif"), 3) }));
    const letters = pick(lesson.letters, lesson.review ? 6 : 5);
    const allH = [...hs, ...(lesson.mixWith || [])];
    letters.forEach((id, i) => {
      const h = hs[i % hs.length];
      const s = syllable(id, h);
      // Lire la syllabe : choix en latin parmi d'autres voyelles et lettres proches
      const others = shuffle([
        ...allH.filter((x) => x !== h).map((x) => syllable(id, x).latin),
        ...distractors(id, lesson.letters, 3).map((x) => syllable(x, h).latin),
      ]).filter((x, k, a) => x !== s.latin && a.indexOf(x) === k).slice(0, 3);
      items.push({ type: "read-syl", prompt: s.ar, answer: s.latin, options: shuffle([s.latin, ...others]) });
      // Écouter la syllabe : choix en arabe
      const arOthers = shuffle([
        ...allH.filter((x) => x !== h).map((x) => syllable(id, x).ar),
        ...distractors(id, lesson.letters, 3).map((x) => syllable(x, h).ar),
      ]).filter((x, k, a) => x !== s.ar && a.indexOf(x) === k).slice(0, 3);
      items.push({ type: "listen-syl", say: s.ar, answer: s.ar, options: shuffle([s.ar, ...arOthers]) });
    });
    // Assembler : lettre + voyelle
    pick(letters, 2).forEach((id, i) => {
      const h = hs[i % hs.length];
      const s = syllable(id, h);
      items.push({ type: "build", target: s, letters: shuffle([id, ...distractors(id, lesson.letters, 2)]), harakat: shuffle([...new Set([h, ...allH, ...(allH.length < 3 ? ["fatha", "kasra", "damma"] : [])])]).slice(0, 3) });
    });
    items.push({ type: "pairs", pairs: pick(letters, 4).map((id, i) => { const s = syllable(id, hs[i % hs.length]); return [s.ar, s.ar, s.latin]; }) });
  }

  // Les intros d'abord, puis un mélange d'exercices
  const intros = items.filter((x) => x.type.startsWith("intro"));
  const ex = items.filter((x) => !x.type.startsWith("intro"));
  // on garde les intros groupées avec leurs premiers exercices pour ne pas surcharger
  return [...intros, ...shuffle(ex)].map((x, i) => ({ ...x, key: `${lesson.id}-${i}` }));
}

// ── Voix ───────────────────────────────────────────────────────
// Enregistrements à venir : /audio/qaida/<clé>.mp3. En attendant, voix arabe de l'appareil.
let arVoice = null;
function loadVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const vs = window.speechSynthesis.getVoices();
  arVoice = vs.find((v) => /^ar(-|_)SA/i.test(v.lang)) || vs.find((v) => /^ar/i.test(v.lang)) || null;
  return arVoice;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoice();
  window.speechSynthesis.onvoiceschanged = loadVoice;
}
export const hasArabicVoice = () => !!(arVoice || loadVoice());
export function speak(text, rate = 0.75) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  if (arVoice || loadVoice()) u.voice = arVoice;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}
