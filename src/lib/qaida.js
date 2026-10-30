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
  madd_a: { mark: "\u064Eا", name: "Alif de prolongation", vowel: "â", hint: "Fatḥa suivie d'un alif : on tient le « a » deux temps.", long: true },
  madd_i: { mark: "\u0650ي", name: "Yâ de prolongation", vowel: "î", hint: "Kasra suivie d'un yâ sans voyelle : on tient le « i » deux temps.", long: true },
  madd_u: { mark: "\u064Fو", name: "Wâw de prolongation", vowel: "oû", hint: "Ḍamma suivie d'un wâw sans voyelle : on tient le « ou » deux temps.", long: true },
};
const SHORT = ["fatha", "kasra", "damma"];
const HAMZA = { fatha: "أَ", kasra: "إِ", damma: "أُ" };
const cons = (id) => LATIN[id] ?? L[id].sound;
// Soukoun : voyelle + lettre sans voyelle (أَبْ = ab)
export function sukunSyl(letterId, h) {
  return { ar: HAMZA[h] + L[letterId].ar + "\u0652", latin: HARAKAT[h].vowel + cons(letterId), letter: letterId, h };
}
// Chadda : lettre doublée (أَبَّ = abba)
export function shaddaSyl(letterId, h, h2 = "fatha") {
  return { ar: HAMZA[h] + L[letterId].ar + "\u0651" + HARAKAT[h2].mark, latin: HARAKAT[h].vowel + cons(letterId) + cons(letterId) + HARAKAT[h2].vowel, letter: letterId, h };
}
// Vrais mots du Coran pour s'entraîner
export const WORDS = {
  sukun: [["مِنْ", "min"], ["عَنْ", "ʿan"], ["لَمْ", "lam"], ["قُلْ", "qoul"], ["هُمْ", "houm"], ["كُنْ", "koun"], ["قَدْ", "qad"], ["بَلْ", "bal"], ["هَلْ", "hal"], ["لَنْ", "lan"], ["إِذْ", "idh"], ["كَمْ", "kam"]],
  shadda: [["إِنَّ", "inna"], ["ثُمَّ", "thoumma"], ["رَبِّ", "rabbi"], ["كُلَّ", "koulla"], ["أُمِّ", "oummi"], ["لَعَلَّ", "laʿalla"], ["حَقٌّ", "ḥaqqoun"], ["مِمَّا", "mimmâ"]],
};
export const SIGNS = {
  sukun: { mark: "\u0652", name: "Soukoun", hint: "Petit rond au-dessus : la lettre n'a pas de voyelle, on la colle à la syllabe d'avant." },
  shadda: { mark: "\u0651", name: "Chadda", hint: "Petit « w » au-dessus : la lettre est doublée. On la prononce deux fois, appuyée." },
};
// Translittération simple pour la syllabe (lettre + voyelle)
const LATIN = { alif: "", ayn: "ʿ", hha: "ḥ", sad: "ṣ", dad: "ḍ", tta: "ṭ", dha: "ẓ" };
export function syllable(letterId, h) {
  const l = L[letterId];
  const ar = (letterId === "alif" ? "أ" : l.ar) + HARAKAT[h].mark + (h === "fathatan" && !["alif"].includes(letterId) ? "ا" : "");
  const c = LATIN[letterId] ?? l.sound;
  return { ar, latin: c + HARAKAT[h].vowel, letter: letterId, h };
}
export function genFor(kind) {
  return kind === "sukun" ? sukunSyl : kind === "shadda" ? (id, h) => shaddaSyl(id, h, h) : syllable;
}

// ── Unités et leçons ───────────────────────────────────────────
const G = [["alif", "ba", "ta", "tha"], ["jim", "hha", "kha", "dal"], ["dhal", "ra", "zay", "sin"], ["shin", "sad", "dad", "tta"], ["dha", "ayn", "ghayn", "fa"], ["qaf", "kaf", "lam", "mim"], ["nun", "ha", "waw", "ya"]];
const ALL = LETTERS.map((l) => l.id);
const FIRST14 = ALL.slice(0, 14), LAST14 = ALL.slice(14);
const NOALIF = ALL.filter((x) => x !== "alif");

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
  {
    id: "u4", title: "Voyelles longues, soukoun, chadda", subtitle: "Allonger, s'arrêter, doubler",
    lessons: [
      { id: "u4l1", kind: "harakat", title: "Prolonger avec alif  ـَا", harakat: ["madd_a"], letters: NOALIF, mixWith: ["fatha"] },
      { id: "u4l2", kind: "harakat", title: "Prolonger avec yâ  ـِي", harakat: ["madd_i"], letters: NOALIF, mixWith: ["kasra", "madd_a"] },
      { id: "u4l3", kind: "harakat", title: "Prolonger avec wâw  ـُو", harakat: ["madd_u"], letters: NOALIF, mixWith: ["damma", "madd_a", "madd_i"] },
      { id: "u4l4", kind: "harakat", title: "Courtes ou longues", harakat: ["fatha", "madd_a", "kasra", "madd_i", "damma", "madd_u"], letters: NOALIF, review: true },
      { id: "u4l5", kind: "sukun", title: "Soukoun  ـْ", harakat: SHORT, letters: NOALIF, words: "sukun" },
      { id: "u4l6", kind: "shadda", title: "Chadda  ـّ", harakat: SHORT, letters: NOALIF.filter((x) => !["waw", "ya"].includes(x)), words: "shadda" },
      { id: "u4r", kind: "words", title: "Révision", words: ["sukun", "shadda"], letters: NOALIF, review: true },
    ],
  },
];
export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u.id })));
export const PLACEMENT = { id: "placement", kind: "placement", title: "Test de niveau", letters: [] };
export const PLACEMENT_UNLOCKS = ALL_LESSONS.filter((l) => ["u1", "u2", "u3"].includes(l.unit)).map((l) => l.id);
export const lessonById = (id) => (id === "placement" ? PLACEMENT : ALL_LESSONS.find((l) => l.id === id));

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

function wordItems(list, n) {
  return pick(list, n).map(([ar, lat]) => ({ type: "read-syl", prompt: ar, answer: lat, word: true, options: shuffle([lat, ...pick(list.filter((w) => w[1] !== lat), 3).map((w) => w[1])]) }));
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

  if (["harakat", "sukun", "shadda"].includes(lesson.kind)) {
    const gen = genFor(lesson.kind);
    const hs = lesson.harakat;
    const ex3 = (h) => pick(lesson.letters.filter((x) => x !== "alif"), 3).map((id) => gen(id, h));
    if (!lesson.review) {
      if (lesson.kind === "harakat") hs.forEach((h) => items.push({ type: "intro-haraka", mark: HARAKAT[h].mark + (HARAKAT[h].long ? "" : ""), name: HARAKAT[h].name, hint: HARAKAT[h].hint, label: HARAKAT[h].long ? "Voyelle longue" : "Nouvelle voyelle", examples: ex3(h) }));
      else { const sg = SIGNS[lesson.kind]; items.push({ type: "intro-haraka", mark: sg.mark, name: sg.name, hint: sg.hint, label: "Nouveau signe", examples: SHORT.map((h) => gen(pick(lesson.letters, 1)[0], h)) }); }
    }
    const letters = pick(lesson.letters, lesson.review ? 6 : 5);
    const allH = [...hs, ...(lesson.mixWith || [])];
    const uniq = (arr, not) => arr.filter((x, k, a) => x !== not && a.indexOf(x) === k);
    letters.forEach((id, i) => {
      const h = hs[i % hs.length];
      const s = gen(id, h);
      const near = [...allH.filter((x) => x !== h).map((x) => gen(id, x)), ...distractors(id, lesson.letters, 3).map((x) => gen(x, h))];
      if (near.length < 3) near.push(...SHORT.filter((x) => x !== h).map((x) => syllable(id, x)));
      items.push({ type: "read-syl", prompt: s.ar, answer: s.latin, options: shuffle([s.latin, ...uniq(shuffle(near.map((x) => x.latin)), s.latin).slice(0, 3)]) });
      items.push({ type: "listen-syl", say: s.ar, answer: s.ar, options: shuffle([s.ar, ...uniq(shuffle(near.map((x) => x.ar)), s.ar).slice(0, 3)]) });
    });
    if (lesson.kind === "harakat") {
      pick(letters, 2).forEach((id, i) => {
        const h = hs[i % hs.length];
        const s = gen(id, h);
        const pool = uniq([...allH, ...(allH.length < 3 ? SHORT : [])], h);
        items.push({ type: "build", target: s, letters: shuffle([id, ...distractors(id, lesson.letters, 2)]), harakat: shuffle([h, ...shuffle(pool).slice(0, 2)]) });
      });
    }
    if (lesson.words) wordItems(WORDS[lesson.words], 3).forEach((x) => items.push(x));
    items.push({ type: "pairs", pairs: pick(letters, 4).map((id, i) => { const s = gen(id, hs[i % hs.length]); return [s.ar, s.ar, s.latin]; }) });
  }

  if (lesson.kind === "words") {
    const all = lesson.words.flatMap((w) => WORDS[w]);
    wordItems(all, 8).forEach((x) => items.push(x));
    items.push({ type: "pairs", pairs: pick(all, 4).map(([ar, lat]) => [ar, ar, lat]) });
  }

  if (lesson.kind === "placement") {
    pick(ALL, 4).forEach((id) => items.push({ type: "read", prompt: L[id].ar, answer: id, options: shuffle([id, ...distractors(id, ALL)]), show: "name" }));
    pick(NOALIF, 4).forEach((id) => { const p = pick(["ini", "med", "fin"], 1)[0]; items.push({ type: "form", prompt: formsOf(L[id])[p], answer: id, options: shuffle([id, ...distractors(id, ALL)]), show: "letter" }); });
    pick(NOALIF, 4).forEach((id, i) => { const h = SHORT[i % 3]; const s = syllable(id, h); items.push({ type: "read-syl", prompt: s.ar, answer: s.latin, options: shuffle([s.latin, ...SHORT.filter((x) => x !== h).map((x) => syllable(id, x).latin), syllable(distractors(id, NOALIF, 1)[0], h).latin]) }); });
    return shuffle(items).map((x, i) => ({ ...x, key: `placement-${i}` }));
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
