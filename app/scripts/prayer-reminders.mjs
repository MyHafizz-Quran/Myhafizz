// Envoie les rappels « après la prière » (Web Push).
// Lancé toutes les 5 minutes par .github/workflows/prayer-reminders.yml.
// Variables : REMINDER_DATABASE_URL (rôle reminder_worker, accès limité à prayer_reminders),
//             VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
import pg from "pg";
import webpush from "web-push";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";

const WINDOW_MIN = 40; // tolérance : le cron GitHub peut avoir du retard
const NAMES = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };

webpush.setVapidDetails("mailto:contact@myhafizz.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
const db = new pg.Client({ connectionString: process.env.REMINDER_DATABASE_URL });
await db.connect();

const localDate = (tz, d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const { rows } = await db.query("select * from public.prayer_reminders");
const now = Date.now();
let sent = 0, removed = 0;

for (const r of rows) {
  let tz = r.tz;
  try { localDate(tz); } catch { tz = "UTC"; }
  const today = localDate(tz);
  const [y, m, d] = today.split("-").map(Number);
  const times = new PrayerTimes(new Coordinates(r.lat, r.lng), new Date(y, m - 1, d), CalculationMethod.MuslimWorldLeague());
  const last = r.last_sent || {};
  for (const p of r.prayers || []) {
    if (!times[p] || last[p] === today) continue;
    const target = times[p].getTime() + (r.offset_min ?? 15) * 60000;
    if (now < target || now > target + WINDOW_MIN * 60000) continue;
    const payload = JSON.stringify({
      title: "C'est l'heure de ta révision",
      body: `${NAMES[p]} est passée. Ta séance du jour t'attend.`,
      url: "/Revision",
      tag: `mh-${p}`,
    });
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth_key } }, payload, { TTL: 1800 });
      last[p] = today; sent++;
      await db.query("update public.prayer_reminders set last_sent = $1 where endpoint = $2", [last, r.endpoint]);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.query("delete from public.prayer_reminders where endpoint = $1", [r.endpoint]); removed++;
        break;
      }
      console.error("push error", e.statusCode || e.message);
    }
  }
}
console.log(`subscriptions=${rows.length} sent=${sent} removed=${removed}`);
await db.end();
