// Logique des rappels « après la prière » (Web Push), partagée par
// la Neon Function (déclenchée toutes les 5 min) et le script de secours GitHub.
import pg from "pg";
import webpush from "web-push";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";

const WINDOW_MIN = 40; // tolérance si un passage est en retard
const NAMES = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };

const localDate = (tz, d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export async function runReminders({ databaseUrl, vapidPublicKey, vapidPrivateKey, now = Date.now() }) {
  webpush.setVapidDetails("mailto:contact@myhafizz.com", vapidPublicKey, vapidPrivateKey);
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();
  let sent = 0, removed = 0, errors = 0, rows = [];
  try {
    ({ rows } = await db.query("select * from public.prayer_reminders"));
    for (const r of rows) {
      let tz = r.tz;
      try { localDate(tz); } catch { tz = "UTC"; }
      const today = localDate(tz, new Date(now));
      const [y, m, d] = today.split("-").map(Number);
      const times = new PrayerTimes(new Coordinates(r.lat, r.lng), new Date(y, m - 1, d), (CalculationMethod[r.method] || CalculationMethod.MuslimWorldLeague)());
      const last = r.last_sent || {};
      // Vendredi : rappel de la sourate Al-Kahf 2 h après le lever du soleil (heure locale).
      const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(now));
      for (const p of r.prayers || []) {
        if (last[p] === today) continue;
        const isKahf = p === "kahf";
        if (isKahf ? weekday !== "Fri" : !times[p]) continue;
        const target = isKahf ? times.sunrise.getTime() + 120 * 60000 : times[p].getTime() + (r.offset_min ?? 15) * 60000;
        if (now < target || now > target + WINDOW_MIN * 60000) continue;
        // Réserve l'envoi avant de pousser : évite un doublon si deux passages se chevauchent.
        const claim = await db.query(
          "update public.prayer_reminders set last_sent = coalesce(last_sent,'{}'::jsonb) || jsonb_build_object($1::text, $2::text) where endpoint = $3 and coalesce(last_sent->>$1, '') <> $2",
          [p, today, r.endpoint]
        );
        if (!claim.rowCount) continue;
        const payload = JSON.stringify(isKahf ? {
          title: "Vendredi : sourate Al-Kahf",
          body: "C'est Jumu'a. Prends un moment pour lire la sourate Al-Kahf.",
          url: "/Memorize?surah=18",
          tag: "mh-kahf",
        } : {
          title: "C'est l'heure de ta révision",
          body: `${NAMES[p]} est passée. Ta séance du jour t'attend.`,
          url: "/Revision",
          tag: `mh-${p}`,
        });
        try {
          await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth_key } }, payload, { TTL: 1800 });
          sent++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) {
            await db.query("delete from public.prayer_reminders where endpoint = $1", [r.endpoint]); removed++;
            break;
          }
          errors++;
          console.error("push error", e.statusCode || e.message);
        }
      }
    }
  } finally {
    await db.end();
  }
  return { subscriptions: rows.length, sent, removed, errors };
}
