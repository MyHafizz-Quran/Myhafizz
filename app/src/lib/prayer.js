import { Coordinates, CalculationMethod, PrayerTimes, Qibla } from "adhan";

/**
 * Heures de prière et qibla, calculées sur l'appareil (fonctionne hors ligne).
 * La position est arrondie à 2 décimales (environ 1 km) et reste sur l'appareil,
 * sauf si l'utilisateur active les rappels (elle sert alors au calcul côté serveur).
 */
export const PRAYER_LIST = [
  { key: "fajr", label: "Fajr" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

export const METHODS = [
  { value: "MuslimWorldLeague", label: "Ligue islamique mondiale" },
  { value: "Egyptian", label: "Égypte" },
  { value: "UmmAlQura", label: "Umm al-Qura (La Mecque)" },
  { value: "Karachi", label: "Karachi" },
  { value: "MoonsightingCommittee", label: "Moonsighting Committee" },
  { value: "NorthAmerica", label: "Amérique du Nord (ISNA)" },
  { value: "Dubai", label: "Dubaï" },
  { value: "Qatar", label: "Qatar" },
  { value: "Kuwait", label: "Koweït" },
  { value: "Turkey", label: "Turquie" },
  { value: "Singapore", label: "Singapour" },
  { value: "Tehran", label: "Téhéran" },
];

const LS_METHOD = "mh_prayer_method";
const LS_LOC = "mh_location";
const EVT = "mh-prayer-change";

export const getMethod = () => {
  const m = localStorage.getItem(LS_METHOD);
  return METHODS.some((x) => x.value === m) ? m : "MuslimWorldLeague";
};
export const setMethod = (m) => { localStorage.setItem(LS_METHOD, m); window.dispatchEvent(new Event(EVT)); };
export const methodLabel = (m) => METHODS.find((x) => x.value === m)?.label || METHODS[0].label;

export const getLocation = () => {
  try { const l = JSON.parse(localStorage.getItem(LS_LOC)); return l && Number.isFinite(l.lat) && Number.isFinite(l.lng) ? l : null; } catch { return null; }
};
export const setLocation = (l) => { localStorage.setItem(LS_LOC, JSON.stringify({ lat: l.lat, lng: l.lng })); window.dispatchEvent(new Event(EVT)); };
export const onPrayerChange = (fn) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); };

export function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("geo"));
    navigator.geolocation.getCurrentPosition(
      (p) => { const l = { lat: Math.round(p.coords.latitude * 100) / 100, lng: Math.round(p.coords.longitude * 100) / 100 }; setLocation(l); resolve(l); },
      () => reject(new Error("geo")),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 86400000 },
    );
  });
}

const params = (method) => (CalculationMethod[method] || CalculationMethod.MuslimWorldLeague)();

export function timesFor(loc, date = new Date(), method = getMethod()) {
  const t = new PrayerTimes(new Coordinates(loc.lat, loc.lng), date, params(method));
  return PRAYER_LIST.map((p) => ({ ...p, time: t[p.key] }));
}

/** Horaires du jour + prochaine prière (Fajr du lendemain après Isha). */
export function prayerDay(loc, now = new Date(), method = getMethod()) {
  const today = timesFor(loc, now, method);
  let next = today.find((p) => p.time > now);
  if (!next) {
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    next = { ...timesFor(loc, tomorrow, method)[0], tomorrow: true };
  }
  const current = [...today].reverse().find((p) => p.time <= now) || null;
  return { today, next, current };
}

export const qiblaBearing = (loc) => Qibla(new Coordinates(loc.lat, loc.lng));

/** Distance à la Kaaba en km (formule de haversine). */
export function distanceToKaaba(loc) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const [lat1, lng1, lat2, lng2] = [loc.lat, loc.lng, 21.4225, 39.8262].map(toRad);
  const a = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export const hhmm = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
export function countdown(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} h ${String(r).padStart(2, "0")}` : `${r} min`;
}
