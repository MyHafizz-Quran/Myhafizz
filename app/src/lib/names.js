import { db } from "@/api/neonClient";
import { SURAHS } from "@/components/quranData";

let namesP = null;
/** Les 99 noms publiés (relus dans l'admin), dans l'ordre. */
export function loadNames() {
  if (!namesP) namesP = db.from("allah_names").select("*").order("n").then(({ data, error }) => { if (error) throw error; return data || []; })
    .catch((e) => { namesP = null; throw e; });
  return namesP;
}
export async function myNames() {
  const { data } = await db.from("allah_names_progress").select("n, learned, again");
  return Object.fromEntries((data || []).map((r) => [r.n, r]));
}
export const markName = (n, learned = null, again = null) =>
  db.rpc("names_mark", { p_n: n, p_learned: learned, p_again: again }).then(({ error }) => { if (error) throw error; });

/** Nom du jour : un par jour, dans l'ordre (jour UTC). */
export function nameOfDayIndex(count) {
  const day = Math.floor(Date.now() / 86400000);
  return count ? day % count : 0;
}

/** URL audio du verset « s:a » (récitation Mishary al-Afasy). */
export function verseAudio(ref) {
  if (!ref) return null;
  const [s, a] = ref.split(":").map(Number);
  let abs = 0;
  for (const x of SURAHS) { if (x.number === s) { abs += a; break; } abs += x.numberOfAyahs; }
  return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${abs}.mp3`;
}
let player = null;
export function playVerse(ref, onEnd) {
  const url = verseAudio(ref); if (!url) return null;
  player?.pause();
  player = new Audio(url);
  player.onended = () => onEnd?.();
  player.play().catch(() => onEnd?.());
  return player;
}
export const stopVerse = () => { player?.pause(); player = null; };

/** Paquet de 5 questions « Que signifie ce nom ? ». */
export function buildQuiz(names, prog) {
  const again = names.filter((x) => prog[x.n]?.again);
  const learned = names.filter((x) => prog[x.n]?.learned && !prog[x.n]?.again);
  let pool = [...again, ...learned.sort(() => Math.random() - 0.5)];
  if (pool.length < 5) pool = [...pool, ...names.filter((x) => !pool.includes(x)).slice(0, 5 - pool.length)];
  return pool.slice(0, 5).sort(() => Math.random() - 0.5).map((q) => {
    const others = names.filter((x) => x.n !== q.n && x.meaning !== q.meaning).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [q, ...others].sort(() => Math.random() - 0.5);
    return { name: q, choices: choices.map((c) => c.meaning), answer: choices.indexOf(q), others };
  });
}
