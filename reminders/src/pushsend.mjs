// Envoi d'une notification : par Firebase Cloud Messaging si l'abonné a un jeton FCM
// (statistiques dans la console Firebase), sinon en Web Push direct. Si FCM échoue
// (hors jeton périmé), on retombe sur le Web Push direct, qui utilise la même clé VAPID.
import crypto from "node:crypto";
import webpush from "web-push";
import pg from "pg";

// Type de notification à partir de son tag (mh-fajr → priere, mh-duel-12 → duel…), pour les statistiques
const PRAYERS = new Set(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
export function notifKind(msg) {
  const t = String(msg?.tag || "").replace(/^mh-/, "");
  const h = t.split("-")[0];
  if (PRAYERS.has(h)) return "priere";
  if (h === "ld" || h === "duel") return "duel";
  if (h === "tk") return "khatma";
  if (h === "tn") return "tournoi";
  if (["doux", "retour", "serie"].includes(h)) return "relance";
  return h || "autre";
}
let pool = null;
async function countSent(kind) {
  try {
    if (!process.env.DATABASE_URL) return;
    pool ||= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    await pool.query("insert into public.notif_stats(day, kind, sent) values (current_date, $1, 1) on conflict (day, kind) do update set sent = notif_stats.sent + 1", [kind]);
  } catch (e) { console.error("notif_stats", e.message); }
}

const PROJECT = "myhafizz-b2a88";
let tok = null, tokExp = 0;

const b64u = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
async function accessToken() {
  if (tok && Date.now() < tokExp - 60000) return tok;
  const email = process.env.FCM_CLIENT_EMAIL, kid = process.env.FCM_KEY_ID, pem = process.env.FCM_PRIVATE_KEY_B64 && Buffer.from(process.env.FCM_PRIVATE_KEY_B64, "base64").toString();
  if (!email || !pem) return null;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const body = b64u(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64u(crypto.sign("RSA-SHA256", Buffer.from(`${head}.${body}`), pem));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${body}.${sig}` }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("fcm auth " + (j.error || r.status));
  tok = j.access_token; tokExp = Date.now() + (j.expires_in || 3600) * 1000;
  return tok;
}

/** sub = ligne prayer_reminders (endpoint, p256dh, auth_key, fcm_token). Lève une erreur statusCode 410 si l'abonnement est mort. */
export async function sendPush(sub, msg, opts = {}) {
  if (sub.fcm_token) {
    try {
      const t = await accessToken();
      if (t) {
        const headers = { TTL: String(opts.TTL ?? 1800) };
        if (opts.urgency) headers.Urgency = opts.urgency;
        const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
          method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
          body: JSON.stringify({ message: { token: sub.fcm_token, data: { mh: JSON.stringify(msg) }, webpush: { headers } } }),
        });
        if (r.ok) { await countSent(notifKind(msg)); return "fcm"; }
        const e = await r.json().catch(() => ({}));
        const code = e?.error?.details?.find?.((d) => d.errorCode)?.errorCode || e?.error?.status;
        if (code === "UNREGISTERED" || r.status === 404) { const err = new Error("fcm unregistered"); err.statusCode = 410; throw err; }
        console.error("fcm", r.status, code);
      }
    } catch (e) { if (e.statusCode === 410) throw e; console.error("fcm", e.message); }
  }
  await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, JSON.stringify(msg), opts);
  await countSent(notifKind(msg));
  return "webpush";
}
