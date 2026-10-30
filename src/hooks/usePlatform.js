/**
 * Détecte la plateforme pour adapter la navigation :
 * - "ios"     → barres Liquid Glass (iOS 26)
 * - "android" → Material 3 Expressive
 * Sur ordinateur, on choisit iOS par défaut (aperçu au format téléphone).
 * On peut forcer avec ?platform=android ou ?platform=ios (mémorisé).
 */
const KEY = "mh_platform_override";

export function detectPlatform() {
  if (typeof window === "undefined") return "ios";
  try {
    const q = new URLSearchParams(window.location.search).get("platform");
    if (q === "ios" || q === "android") localStorage.setItem(KEY, q);
    if (q === "auto") localStorage.removeItem(KEY);
    const forced = localStorage.getItem(KEY);
    if (forced === "ios" || forced === "android") return forced;
  } catch { /* ignore */ }
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return "ios";
}

export const PLATFORM = detectPlatform();

export function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function haptic(ms = 8) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* ignore */ }
}

export default function usePlatform() {
  return PLATFORM;
}
