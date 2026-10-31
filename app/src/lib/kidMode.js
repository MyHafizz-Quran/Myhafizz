import { useEffect, useState } from "react";

/**
 * Mode enfant : réglage propre à l'appareil (le téléphone ou la tablette de l'enfant).
 * Le code parent (4 chiffres) n'est jamais stocké en clair : seulement son empreinte SHA-256.
 * Une fois le code saisi, les écrans verrouillés restent ouverts 10 minutes.
 */
const KEY = "mh_kid_mode";
const UNLOCK = "mh_kid_unlock_until";
const FAILS = "mh_kid_fails";
const EVT = "mh-kid-mode";
const UNLOCK_MS = 10 * 60 * 1000;

/** Écrans qui demandent le code parent en mode enfant */
export const KID_LOCKED = ["/Profile", "/Settings", "/Leaderboard", "/Help"];

async function hash(pin) {
  const data = new TextEncoder().encode(`myhafizz:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const emit = () => window.dispatchEvent(new Event(EVT));

export const kidState = () => {
  const s = read();
  const until = Number(sessionStorage.getItem(UNLOCK) || 0);
  return { on: !!s?.on, unlocked: !s?.on || until > Date.now() };
};

export async function enableKidMode(pin) {
  localStorage.setItem(KEY, JSON.stringify({ on: true, pin: await hash(pin) }));
  sessionStorage.removeItem(UNLOCK);
  emit();
}
export function disableKidMode() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(UNLOCK);
  localStorage.removeItem(FAILS);
  emit();
}
export function relockKidMode() { sessionStorage.removeItem(UNLOCK); emit(); }

/** Retourne { ok, wait } ; wait = secondes à attendre après 5 essais ratés */
export async function checkPin(pin) {
  const f = JSON.parse(localStorage.getItem(FAILS) || '{"n":0,"until":0}');
  if (f.until > Date.now()) return { ok: false, wait: Math.ceil((f.until - Date.now()) / 1000) };
  const s = read();
  if (s?.pin && s.pin === (await hash(pin))) {
    localStorage.removeItem(FAILS);
    sessionStorage.setItem(UNLOCK, String(Date.now() + UNLOCK_MS));
    emit();
    return { ok: true };
  }
  const n = f.n + 1;
  localStorage.setItem(FAILS, JSON.stringify(n >= 5 ? { n: 0, until: Date.now() + 30000 } : { n, until: 0 }));
  return { ok: false, wait: n >= 5 ? 30 : 0 };
}

export function useKidMode() {
  const [st, setSt] = useState(kidState);
  useEffect(() => {
    const up = () => setSt(kidState());
    window.addEventListener(EVT, up);
    window.addEventListener("storage", up);
    const t = setInterval(up, 30000);
    return () => { window.removeEventListener(EVT, up); window.removeEventListener("storage", up); clearInterval(t); };
  }, []);
  return st;
}
