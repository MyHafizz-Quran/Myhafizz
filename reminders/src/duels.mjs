// Notifications des duels (lot J2) : défi reçu et résultat disponible.
// Au maximum 3 notifications de duel par jour et par joueur ; au-delà, le joueur
// retrouve tout dans l'onglet Duels (rien n'est renvoyé plus tard).
import webpush from "web-push";

const DAILY_MAX = 3;
const TITLES = { suite: "La suite du verset", sourate: "Quelle sourate ?", ordre: "Remets dans l'ordre", lettres: "Lettres éclair", ilm: "Al-Ilm" };

export async function runDuelPush(db) {
  let sent = 0, skipped = 0;
  // défis reçus : dès que le lanceur a joué (ou 15 min après la création)
  const inv = await db.query(`
    select d.id, d.opponent as uid, d.game, d.level, p.username as from_name, (d.challenger_result->>'score')::int as score, d.total
    from public.game_duels d left join public.profiles p on p.id = d.challenger
    where d.status = 'pending' and d.opponent is not null and d.notified_invite_at is null and d.opponent_result is null
      and d.expires_at > now() and (d.challenger_result is not null or d.created_at < now() - interval '15 minutes')
    limit 200`);
  // résultats : prévenir celui qui a joué en premier
  const res = await db.query(`
    select d.id, case when (d.challenger_result->>'at') <= (d.opponent_result->>'at') then d.challenger else d.opponent end as uid,
      d.game, d.winner, p1.username as c_name, p2.username as o_name, d.challenger, d.opponent,
      (d.challenger_result->>'score')::int as cs, (d.opponent_result->>'score')::int as os
    from public.game_duels d left join public.profiles p1 on p1.id = d.challenger left join public.profiles p2 on p2.id = d.opponent
    where d.status = 'done' and d.notified_result_at is null and d.finished_at > now() - interval '1 day'
    limit 200`);
  const jobs = [
    ...inv.rows.map((r) => ({ kind: "invite", col: "notified_invite_at", ...r,
      msg: { title: `@${r.from_name || "un joueur"} te défie`, body: `${TITLES[r.game]} · niveau ${r.level}${r.score != null ? ` · score à battre : ${r.score}/${r.total}` : ""}`, url: `/Duel?id=${r.id}`, tag: `mh-duel-${r.id}` } })),
    ...res.rows.map((r) => {
      const meC = r.uid === r.challenger, other = meC ? r.o_name : r.c_name;
      const my = meC ? r.cs : r.os, their = meC ? r.os : r.cs;
      const head = r.winner == null ? "Égalité" : r.winner === r.uid ? "Victoire" : "Duel terminé";
      return { kind: "result", col: "notified_result_at", ...r, msg: { title: `${head} contre @${other || "ton adversaire"}`, body: `${TITLES[r.game]} · ${my} à ${their}. Vois les réponses et lance la revanche.`, url: `/Duel?id=${r.id}`, tag: `mh-duel-${r.id}` } };
    }),
  ];
  for (const j of jobs) {
    // marquer d'abord (un seul envoi même si deux passages se chevauchent)
    const claimed = (await db.query(`update public.game_duels set ${j.col} = now() where id = $1 and ${j.col} is null`, [j.id])).rowCount > 0;
    if (!claimed) continue;
    const n = (await db.query("select count(*)::int n from public.duel_notifications where user_id = $1 and sent_at > now() - interval '1 day'", [j.uid])).rows[0].n;
    if (n >= DAILY_MAX) { skipped++; continue; }
    const subs = (await db.query("select endpoint, p256dh, auth_key from public.prayer_reminders where user_id = $1", [j.uid])).rows;
    if (!subs.length) continue;
    let ok = false;
    for (const s of subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, JSON.stringify(j.msg), { TTL: 3600 }); ok = true; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.query("delete from public.prayer_reminders where endpoint = $1", [s.endpoint]); else console.error("duel push", e.statusCode || e.message); }
    }
    if (ok) { sent++; await db.query("insert into public.duel_notifications (user_id, duel_id, kind) values ($1, $2, $3)", [j.uid, j.id, j.kind]); }
  }
  return { duel_sent: sent, duel_capped: skipped };
}
