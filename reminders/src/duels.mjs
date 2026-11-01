// Notifications des duels (lot J2) : défi reçu et résultat disponible.
// Au maximum 3 notifications de duel par jour et par joueur ; au-delà, le joueur
// retrouve tout dans l'onglet Duels (rien n'est renvoyé plus tard).
import webpush from "web-push";
import { sendPush } from "./pushsend.mjs";

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
    const subs = (await db.query("select endpoint, p256dh, auth_key, fcm_token from public.prayer_reminders where user_id = $1", [j.uid])).rows;
    if (!subs.length) continue;
    let ok = false;
    for (const s of subs) {
      try { await sendPush(s, j.msg, { TTL: 3600 }); ok = true; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.query("delete from public.prayer_reminders where endpoint = $1", [s.endpoint]); else console.error("duel push", e.statusCode || e.message); }
    }
    if (ok) { sent++; await db.query("insert into public.duel_notifications (user_id, duel_id, kind) values ($1, $2, $3)", [j.uid, j.id, j.kind]); }
  }
  const k = await runKhatmaPush(db);
  return { duel_sent: sent, duel_capped: skipped, ...k };
}

const SCOPE = { amma: "Juz Amma", tabarak: "Juz Tabarak", ilm: "Al-Ilm" };
const groupLabel = (r) => (r.kind === "duo" ? "ton binôme" : r.name);

async function pushTo(db, uid, msg) {
  const n = (await db.query("select count(*)::int n from public.duel_notifications where user_id = $1 and sent_at > now() - interval '1 day'", [uid])).rows[0].n;
  if (n >= DAILY_MAX) return "capped";
  const subs = (await db.query("select endpoint, p256dh, auth_key, fcm_token from public.prayer_reminders where user_id = $1", [uid])).rows;
  let ok = false;
  for (const s of subs) {
    try { await sendPush(s, msg, { TTL: 3600 }); ok = true; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.query("delete from public.prayer_reminders where endpoint = $1", [s.endpoint]); else console.error("khatma push", e.statusCode || e.message); }
  }
  if (ok) await db.query("insert into public.duel_notifications (user_id, kind) values ($1, 'khatma')", [uid]);
  return ok ? "sent" : "none";
}

// Khatma d'équipe : un message au lancement (aux autres membres), un message à la fin (à tous).
export async function runKhatmaPush(db) {
  let sent = 0;
  const start = (await db.query(`
    select k.id, k.scope, k.created_by, g.id as gid, g.name, g.kind, p.username as by_name
    from public.team_khatmas k join public.study_groups g on g.id = k.group_id left join public.profiles p on p.id = k.created_by
    where k.status = 'active' and k.notified_start_at is null and k.created_at > now() - interval '1 day' limit 50`)).rows;
  const fin = (await db.query(`
    select k.id, k.scope, g.id as gid, g.name, g.kind
    from public.team_khatmas k join public.study_groups g on g.id = k.group_id
    where k.status = 'done' and k.notified_done_at is null and k.finished_at > now() - interval '1 day' limit 50`)).rows;
  for (const [rows, col, msgOf, skipCreator] of [
    [start, "notified_start_at", (r) => ({ title: `Khatma d'équipe : ${SCOPE[r.scope]}`, body: `@${r.by_name || "un membre"} lance une khatma avec ${groupLabel(r)}. Valide ta première sourate.`, url: `/Equipe?id=${r.id}`, tag: `mh-tk-${r.id}` }), true],
    [fin, "notified_done_at", (r) => ({ title: `${SCOPE[r.scope]} terminé`, body: `${r.kind === "duo" ? "Ton binôme et toi avez" : `${r.name} a`} tout validé. +points pour chacun, qu'Allah l'accepte.`, url: `/Equipe?id=${r.id}`, tag: `mh-tk-${r.id}` }), false],
  ]) {
    for (const r of rows) {
      const claimed = (await db.query(`update public.team_khatmas set ${col} = now() where id = $1 and ${col} is null`, [r.id])).rowCount > 0;
      if (!claimed) continue;
      const members = (await db.query("select user_id from public.group_members where group_id = $1", [r.gid])).rows;
      for (const m of members) {
        if (skipCreator && m.user_id === r.created_by) continue;
        if ((await pushTo(db, m.user_id, msgOf(r))) === "sent") sent++;
      }
    }
  }
  return { khatma_sent: sent };
}
