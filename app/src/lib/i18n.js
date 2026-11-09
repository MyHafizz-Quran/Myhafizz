// Langue de l'app : français si l'appareil est en français, anglais sinon (réglable : localStorage mh_lang).
// Les textes sont entourés automatiquement par __t / __tf au build (i18n/babel-plugin-fr.cjs).
import EN from "../../i18n/en.json";

function detect() {
  try { const s = localStorage.getItem("mh_lang"); if (s === "fr" || s === "en") return s; } catch { /* rien */ }
  const langs = (typeof navigator !== "undefined" && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
  return /^fr\b/i.test(langs[0] || "fr") ? "fr" : "en";
}
export const LANG = detect();
export const isEn = LANG === "en";
export const __loc = isEn ? "en-GB" : "fr-FR";
/** Traduction du Coran : Hamidullah en français, Saheeh International en anglais. */
export const QTR = isEn ? "en.sahih" : "fr.hamidullah";
if (typeof document !== "undefined") document.documentElement.lang = LANG;

export function __t(s) {
  if (!isEn || typeof s !== "string") return s;
  const k = s.replace(/\s+/g, " ");
  const v = EN[s] ?? EN[k] ?? EN[k.trim()];
  if (v == null) return s;
  // garde les espaces de début/fin d'origine (texte collé à une variable)
  if (EN[s] == null && k.trim() !== k) return (k.match(/^\s*/)[0]) + v.trim() + (k.match(/\s*$/)[0]);
  return v;
}
export function __tf(tpl, vals) {
  const out = __t(tpl);
  return out.replace(/\{(\d+)\}/g, (_, i) => { const v = vals[+i]; return v == null || v === false ? "" : String(v); });
}
export function setLang(l) { try { localStorage.setItem("mh_lang", l); } catch { /* rien */ } window.location.reload(); }
