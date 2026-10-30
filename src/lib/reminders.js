import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { supabase } from "@/api/neonClient";

/**
 * Rappels après la prière : abonnement Web Push + ligne dans public.prayer_reminders.
 * L'envoi est fait toutes les 5 minutes par .github/workflows/prayer-reminders.yml.
 * La position est arrondie à 2 décimales (environ 1 km) : elle sert uniquement au calcul des horaires.
 */
export const VAPID_PUBLIC_KEY = "BLXbavajA87sH8AwdYzis_eYfF5k0KQsmQLx_7oQiM1D_6_CXqrq7g269T_aKpKkhrbvXVM6dvLx7h7stTX4qF8";
export const PRAYERS = [
  { key: "fajr", label: "Fajr" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

/** "ok" | "install" (iPhone : il faut d'abord installer l'app) | "unsupported" */
export function pushSupport() {
  if (typeof window === "undefined") return "unsupported";
  if (isIOS() && !standalone()) return "install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}

function keyToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("geo"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Math.round(p.coords.latitude * 100) / 100, lng: Math.round(p.coords.longitude * 100) / 100 }),
      () => reject(new Error("geo")),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 86400000 },
    );
  });
}

export function prayerTimes(lat, lng, date = new Date()) {
  const t = new PrayerTimes(new Coordinates(lat, lng), date, CalculationMethod.MuslimWorldLeague());
  return Object.fromEntries(PRAYERS.map((p) => [p.key, t[p.key]]));
}

async function currentSub() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Réglage enregistré pour cet appareil, ou null */
export async function getReminder() {
  if (pushSupport() !== "ok" || Notification.permission !== "granted") return null;
  const sub = await currentSub();
  if (!sub) return null;
  const { data } = await supabase.from("prayer_reminders").select("prayers, offset_min, lat, lng, tz").eq("endpoint", sub.endpoint).maybeSingle();
  return data || null;
}

export async function saveReminder({ prayers, offset_min = 15, position }) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("permission");
  const pos = position || (await getPosition());
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }));
  const row = {
    endpoint: sub.endpoint,
    p256dh: toB64(sub.getKey("p256dh")),
    auth_key: toB64(sub.getKey("auth")),
    lat: pos.lat, lng: pos.lng,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    prayers, offset_min,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("prayer_reminders").upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
  return row;
}

export async function removeReminder() {
  const sub = await currentSub();
  if (!sub) return;
  await supabase.from("prayer_reminders").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}
