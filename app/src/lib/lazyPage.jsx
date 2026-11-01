// Chargement des écrans à la demande : le premier affichage ne télécharge que l'écran ouvert.
// Après le démarrage, les autres écrans sont préchargés en tâche de fond (sauf mode économie de données),
// donc la navigation reste instantanée.
import React, { lazy } from "react";
import { report } from "@/lib/report";

const loaders = [];

export function lazyPage(load) {
  const safe = () => load().catch((e) => {
    // Nouvelle version déployée : l'ancien fichier n'existe plus → un seul rechargement silencieux
    if (!sessionStorage.getItem("mh_chunk_reload")) { sessionStorage.setItem("mh_chunk_reload", "1"); window.location.reload(); return new Promise(() => {}); }
    report(e, "lazyPage");
    throw e;
  });
  loaders.push(safe);
  return lazy(safe);
}

let started = false;
export function prefetchPages() {
  if (started) return; started = true;
  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ""))) return;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
  let i = 0;
  const next = () => { if (i >= loaders.length) { sessionStorage.removeItem("mh_chunk_reload"); return; } loaders[i++]().catch(() => {}).finally(() => idle(next)); };
  setTimeout(() => idle(next), 2500);
}

/** Cadre gris de la forme d'un écran, affiché le temps de charger l'écran (pas de roue). */
export function PageFallback() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3 animate-pulse" aria-hidden="true">
      <div className="h-7 w-40 rounded-xl bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 gap-3"><div className="h-24 rounded-2xl bg-muted" /><div className="h-24 rounded-2xl bg-muted" /></div>
      <div className="h-20 rounded-2xl bg-muted" />
      <div className="h-20 rounded-2xl bg-muted" />
    </div>
  );
}
