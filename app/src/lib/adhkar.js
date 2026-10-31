// Adhkar du matin et du soir : données statiques + progression du jour (sur l'appareil).
import { todayStr } from "@/lib/srs";
let cache = null;
export async function loadAdhkar() {
  if (!cache) cache = fetch("/data/adhkar.json").then((r) => { if (!r.ok) throw new Error("adhkar"); return r.json(); }).catch((e) => { cache = null; throw e; });
  return cache;
}
/** Matin jusqu'à 15 h, soir ensuite. */
export const defaultPeriod = (now = new Date()) => (now.getHours() < 15 && now.getHours() >= 3 ? "matin" : "soir");
const key = (period, date = new Date()) => `mh_adhkar_${period}_${todayStr(date)}`;
export function getCounts(period) { try { return JSON.parse(localStorage.getItem(key(period))) || {}; } catch { return {}; } }
export function setCounts(period, counts) { localStorage.setItem(key(period), JSON.stringify(counts)); window.dispatchEvent(new Event("mh-adhkar")); }
export const itemsFor = (items, period) => items.filter((x) => x.when === "both" || x.when === period);
/** { done, total } pour la période. */
export function progressFor(items, period) {
  const list = itemsFor(items, period), c = getCounts(period);
  return { done: list.filter((x) => (c[x.id] || 0) >= x.repeat).length, total: list.length };
}
