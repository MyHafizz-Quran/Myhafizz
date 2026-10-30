// Retours tactiles et sonores de l'interface : petit « clic » synthétisé + vibration.
// Android : navigator.vibrate. iPhone (Safari 18+) : astuce de l'interrupteur natif qui déclenche le moteur haptique.
const KEY = "mh_feedback"; // { sound: bool, haptics: bool }
let prefs = null;
export function getFeedback() {
  if (!prefs) { try { prefs = { sound: true, haptics: true, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { prefs = { sound: true, haptics: true }; } }
  return prefs;
}
export function setFeedback(p) { prefs = { ...getFeedback(), ...p }; localStorage.setItem(KEY, JSON.stringify(prefs)); }

let ctx = null;
function ac() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
function tone(freq, dur, type = "sine", vol = 0.06, at = 0, slide) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
export const SOUNDS = {
  tap: () => tone(1500, 0.035, "triangle", 0.035, 0, 900),
  toggle: () => { tone(900, 0.04, "triangle", 0.04); tone(1300, 0.05, "triangle", 0.035, 0.045); },
  success: () => { tone(880, 0.12, "sine", 0.07); tone(1320, 0.18, "sine", 0.07, 0.09); },
  error: () => { tone(300, 0.16, "triangle", 0.06, 0, 220); },
  reward: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, "sine", 0.06, i * 0.08)); },
};
export function sound(name = "tap") { if (!getFeedback().sound) return; try { SOUNDS[name]?.(); } catch { /* ignore */ } }

const IOS = typeof navigator !== "undefined" && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
let sw = null;
function iosTick() {
  try {
    if (!sw) {
      const label = document.createElement("label"), input = document.createElement("input");
      input.type = "checkbox"; input.setAttribute("switch", ""); label.appendChild(input);
      label.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none"; label.setAttribute("aria-hidden", "true");
      document.body.appendChild(label); sw = label;
    }
    sw.click();
  } catch { /* ignore */ }
}
/** pattern : ms ou tableau (Android). Sur iPhone, un ou deux « ticks ». */
export function vibrate(pattern = 8) {
  if (!getFeedback().haptics) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(pattern); return; }
    if (IOS) { iosTick(); if (Array.isArray(pattern) && pattern.length > 2) setTimeout(iosTick, 120); }
  } catch { /* ignore */ }
}

/** Écoute globale : chaque bouton / lien / onglet donne un petit retour. */
export function installGlobalFeedback() {
  if (typeof window === "undefined" || window.__mhFeedback) return;
  window.__mhFeedback = true;
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest?.('button, a[href], [role="button"], [role="tab"], label, summary, input[type="checkbox"], input[type="radio"], select');
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true" || el.closest("[data-no-feedback]")) return;
    sound(el.matches('input[type="checkbox"], [role="switch"], [role="tab"]') ? "toggle" : "tap");
    vibrate(8);
  }, { passive: true, capture: true });
}
