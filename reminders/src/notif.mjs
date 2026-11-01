// Neon Function « notif » : envoie tout de suite les notifications push en attente (défi, revanche).
// Appelée par l'app juste après un défi (sans données : elle ne fait qu'écouler la file), et par les rappels toutes les 5 min.
import pg from "pg";
import webpush from "web-push";

const ORIGINS = ["https://myhafizz.com", "https://www.myhafizz.com", "https://myhafizz.vercel.app", "http://localhost:5173"];
const pool = new pg.Pool({ connectionString: process.env.REMINDER_DATABASE_URL, max: 2 });
let vapid = false;

export async function sendPending(db) {
  if (!vapid) { webpush.setVapidDetails("mailto:contact@myhafizz.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY); vapid = true; }
  const { rows } = await db.query(`
    update public.notifications n set pushed_at = now()
    where n.id in (select id from public.notifications where push and pushed_at is null and created_at > now() - interval '10 minutes' order by id limit 50 for update skip locked)
    returning n.id, n.user_id, n.kind, n.ref, (select username from public.profiles p where p.id = n.actor) as actor`);
  let sent = 0;
  for (const n of rows) {
    const who = n.actor ? `@${n.actor}` : "Un joueur";
    const msg = n.kind === "duel_rematch"
      ? { title: `${who} veut sa revanche`, body: "Duel en direct · touche pour accepter (60 s)", url: "/Notifications", tag: `mh-ld-${n.ref}` }
      : n.kind === "duel_invite"
        ? { title: `${who} te défie`, body: "Duel en direct · 7 questions mélangées · touche pour accepter (60 s)", url: "/Notifications", tag: `mh-ld-${n.ref}` }
        : null;
    if (!msg) continue;
    const subs = (await db.query("select endpoint, p256dh, auth_key from public.prayer_reminders where user_id = $1", [n.user_id])).rows;
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, JSON.stringify(msg), { TTL: 60, urgency: "high" }); sent++; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.query("delete from public.prayer_reminders where endpoint = $1", [s.endpoint]); else console.error("notif push", e.statusCode || e.message); }
    }
  }
  return { notif_pending: rows.length, notif_sent: sent };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("origin") || "";
    const h = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    try { return Response.json(await sendPending(pool), { headers: h }); }
    catch (e) { console.error("notif", e.message); return Response.json({ error: "indisponible" }, { status: 503, headers: h }); }
  },
};
