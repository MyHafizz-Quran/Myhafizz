// Logique des rappels « après la prière » (Web Push), partagée par
// la Neon Function (déclenchée toutes les 5 min) et le script de secours GitHub.
import pg from "pg";
import webpush from "web-push";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { runDuelPush } from "./duels.mjs";
import { sendPending } from "./notif.mjs";

const WINDOW_MIN = 40; // tolérance si un passage est en retard
const NAMES = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };

const localDate = (tz, d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;

/**
 * Profil de régularité (validé le 01/11/2026), jamais culpabilisant, max 1 notification par prière choisie :
 * - séance déjà faite aujourd'hui : plus de rappel ;
 * - régulier : rappel avec le travail précis du jour ;
 * - série en danger (série ≥ 2 jours, rien aujourd'hui) : message de série à la dernière prière choisie ;
 * - absent 3 à 13 jours : une relance douce par jour (séance de 5 min) ;
 * - absent 14 jours et plus : un seul message, puis silence jusqu'au retour.
 */
export function regularity(ctx, today) {
  if (!ctx) return { kind: "regular" };
  const days = ctx.days || [];
  const gap = days.length ? dayDiff(today, days[0]) : null;
  if (gap === 0) return { kind: "done" };
  let streak = 0;
  if (gap === 1) { streak = 1; for (let i = 1; i < days.length && dayDiff(days[i - 1], days[i]) === 1; i++) streak++; }
  if (gap !== null && gap >= 14) return { kind: "away", since: days[0] };
  if (gap !== null && gap >= 3) return { kind: "gentle" };
  return { kind: "regular", streak, due: ctx.due_count || 0, daily: ctx.has_plan ? ctx.daily_new || 0 : 0 };
}

export function buildMessage(state, p, isLastPrayer) {
  if (state.kind === "away") return { title: "MyHafizz t'attend", body: "Quand tu veux, reprends là où tu t'étais arrêté. Une séance de 5 minutes suffit pour recommencer.", url: "/Revision", tag: "mh-retour" };
  if (state.kind === "gentle") return { title: "5 minutes aujourd'hui ?", body: "Une petite séance suffit pour garder le lien avec ce que tu as appris.", url: "/Revision", tag: "mh-doux" };
  if (state.streak >= 2 && isLastPrayer) return { title: `Ta série de ${state.streak} jours`, body: "Une courte séance ce soir et elle continue demain.", url: "/Revision", tag: "mh-serie" };
  const work = [state.daily ? (state.daily > 1 ? `${state.daily} nouveaux versets` : "1 nouveau verset") : null, state.due ? `${plural(state.due, "verset")} à réviser` : null].filter(Boolean);
  return { title: "C'est l'heure de ta révision", body: work.length ? `${NAMES[p]} est passée. Aujourd'hui : ${work.join(" · ")}.` : `${NAMES[p]} est passée. Ta séance du jour t'attend.`, url: "/Revision", tag: `mh-${p}` };
}

export async function runReminders({ databaseUrl, vapidPublicKey, vapidPrivateKey, now = Date.now() }) {
  webpush.setVapidDetails("mailto:contact@myhafizz.com", vapidPublicKey, vapidPrivateKey);
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();
  let sent = 0, removed = 0, errors = 0, rows = [], duels = {};
  try {
    ({ rows } = await db.query("select * from public.prayer_reminders"));
    const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const ctxBy = {};
    if (uids.length) {
      const c = await db.query("select * from public.reminder_context($1::uuid[])", [uids]);
      for (const x of c.rows) ctxBy[x.user_id] = x;
    }
    const claim = async (key, val, endpoint) => (await db.query(
      "update public.prayer_reminders set last_sent = coalesce(last_sent,'{}'::jsonb) || jsonb_build_object($1::text, $2::text) where endpoint = $3 and coalesce(last_sent->>$1, '') <> $2",
      [key, val, endpoint])).rowCount > 0;
    for (const r of rows) {
      let tz = r.tz;
      try { localDate(tz); } catch { tz = "UTC"; }
      const today = localDate(tz, new Date(now));
      const [y, m, d] = today.split("-").map(Number);
      const times = new PrayerTimes(new Coordinates(r.lat, r.lng), new Date(y, m - 1, d), (CalculationMethod[r.method] || CalculationMethod.MuslimWorldLeague)());
      const last = r.last_sent || {};
      // Vendredi : rappel de la sourate Al-Kahf 2 h après le lever du soleil (heure locale).
      const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(now));
      const state = r.user_id ? regularity(ctxBy[r.user_id], today) : { kind: "regular" };
      const daily = (r.prayers || []).filter((x) => x !== "kahf" && times[x]).sort((a, b) => times[a] - times[b]);
      for (const p of r.prayers || []) {
        if (last[p] === today) continue;
        const isKahf = p === "kahf";
        if (isKahf ? weekday !== "Fri" : !times[p]) continue;
        const target = isKahf ? times.sunrise.getTime() + 120 * 60000 : times[p].getTime() + (r.offset_min ?? 15) * 60000;
        if (now < target || now > target + WINDOW_MIN * 60000) continue;
        // Réserve l'envoi avant de pousser : évite un doublon si deux passages se chevauchent.
        if (!(await claim(p, today, r.endpoint))) continue;
        let msg;
        if (isKahf) {
          if (state.kind === "away") continue; // absent depuis 14 jours : silence complet
          msg = { title: "Vendredi : sourate Al-Kahf", body: "C'est Jumu'a. Prends un moment pour lire la sourate Al-Kahf.", url: "/Memorize?surah=18", tag: "mh-kahf" };
        } else {
          if (state.kind === "done") continue;
          if (state.kind === "gentle" && !(await claim("doux", today, r.endpoint))) continue;
          if (state.kind === "away" && !(await claim("absence", state.since, r.endpoint))) continue;
          msg = buildMessage(state, p, p === daily[daily.length - 1]);
        }
        const payload = JSON.stringify(msg);
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
    try { duels = await runDuelPush(db); } catch (e) { console.error("duels", e.message); }
    try { duels = { ...duels, ...(await sendPending(db)) }; } catch (e) { console.error("notif", e.message); }
  } finally {
    await db.end();
  }
  return { subscriptions: rows.length, sent, removed, errors, ...duels };
}
