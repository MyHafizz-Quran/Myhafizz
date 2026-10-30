// Vérification de récitation : alignement tolérant entre le texte attendu (uthmani)
// et la transcription de la reconnaissance vocale (arabe standard, sans voyelles).
import { normWord } from "@/lib/similar";

// Clé de comparaison : sans voyelles, sans alif (l'orthographe uthmani omet souvent l'alif long)
export const cmpKey = (w) => normWord(w).replace(/[^\u0621-\u064A]/g, "").replace(/ا/g, "");

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

export function same(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const d = lev(a, b), L = Math.max(a.length, b.length);
  return L <= 3 ? d === 0 : L <= 5 ? d <= 1 : d <= 2;
}

/**
 * expected : [{ text, key }] ; heard : chaîne transcrite
 * Renvoie { status: ("ok"|"missed"|"pending")[], cursor }
 * - un mot entendu est cherché dans une fenêtre de 4 mots après le curseur
 * - les mots sautés pour l'atteindre sont marqués « oubliés »
 */
export function align(expected, heard) {
  const status = expected.map(() => "pending");
  let cursor = 0;
  const words = heard.split(/\s+/).map(cmpKey).filter(Boolean);
  for (const h of words) {
    if (cursor >= expected.length) break;
    // mot collé (« بسمالله ») ou séparé : on tente aussi la concaténation de 2 mots attendus
    let found = -1;
    for (let k = cursor; k < Math.min(expected.length, cursor + 4); k++) {
      if (same(expected[k].key, h) || (k + 1 < expected.length && same(expected[k].key + expected[k + 1].key, h))) { found = k; break; }
    }
    if (found === -1) continue; // mot supplémentaire ou mal reconnu : ignoré
    for (let k = cursor; k < found; k++) status[k] = "missed";
    status[found] = "ok";
    if (found + 1 < expected.length && !same(expected[found].key, h)) { status[found + 1] = "ok"; cursor = found + 2; }
    else cursor = found + 1;
  }
  return { status, cursor };
}

export const SpeechRec = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

// ── Enregistrements (IndexedDB, restent sur l'appareil) ─────────────────────
const DB = "mh_recordings", STORE = "recs";
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error);
  });
}
export const Recordings = {
  list: () => tx("readonly", (s) => s.getAll()).then((a) => (a || []).sort((x, y) => y.created - x.created)),
  add: (rec) => tx("readwrite", (s) => s.put(rec)),
  remove: (id) => tx("readwrite", (s) => s.delete(id)),
};

export function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return "";
}
