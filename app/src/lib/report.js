import * as Sentry from "@sentry/react";

/**
 * Règle MyHafizz : aucune erreur technique n'est montrée à l'utilisateur, tout part sur Sentry.
 * Seuls restent visibles les messages « métier » qui disent quoi faire (ex. « Joueur introuvable. »).
 */
const seen = new Map();
export function report(err, where, extra) {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err ?? "erreur"));
    // Pas de doublon toutes les 30 s pour la même erreur au même endroit
    const k = `${where}|${e.message}`;
    const now = Date.now();
    if (now - (seen.get(k) || 0) < 30_000) return;
    seen.set(k, now);
    Sentry.captureException(e, { tags: { where: where || "app" }, extra });
  } catch { /* ignore */ }
}

const TECH = /fetch|network|timeout|abort|json|undefined|null|status|pgrst|permission|relation|function|column|syntax|violates|duplicate|jwt|token|cors|load failed|^[a-z]/i;
/** Message lisible à afficher (message métier du serveur), sinon null : l'erreur part sur Sentry. */
export function userMsg(err, where) {
  const m = (err && (err.message || err.error_description || err.msg)) || "";
  if (m && /^[A-ZÀ-Ý].*[.!?]$/.test(m) && !TECH.test(m)) return m;
  report(err, where);
  return null;
}
