// Photos de profil : un seul appel groupé pour tous les joueurs affichés à l'écran, puis cache.
import { useEffect, useState } from "react";
import { db } from "@/api/neonClient";

const byId = new Map(), byUser = new Map(); // valeur : url, null (pas de photo) ; absent = pas encore demandé
const subs = new Set();
let queueIds = new Set(), queueUsers = new Set(), timer = null;
const norm = (u) => String(u || "").replace(/^@/, "").toLowerCase();

function flush() {
  timer = null;
  const ids = [...queueIds], users = [...queueUsers];
  queueIds = new Set(); queueUsers = new Set();
  if (!ids.length && !users.length) return;
  db.rpc("avatar_map", { p_ids: ids, p_usernames: users }).then(({ data }) => {
    for (const r of data || []) { byId.set(r.id, r.img || null); if (r.u) byUser.set(r.u, r.img || null); }
  }).catch(() => {}).finally(() => {
    ids.forEach((i) => { if (!byId.has(i)) byId.set(i, null); });
    users.forEach((u) => { if (!byUser.has(u)) byUser.set(u, null); });
    subs.forEach((f) => f());
  });
}
function want(id, username) {
  const u = norm(username);
  if (id && !byId.has(id)) queueIds.add(id);
  else if (!id && u && !byUser.has(u)) queueUsers.add(u);
  else return;
  timer ||= setTimeout(flush, 30);
}
export function avatarOf({ id, username, image } = {}) {
  if (image) return image;
  if (id && byId.get(id)) return byId.get(id);
  const u = norm(username);
  return (u && byUser.get(u)) || null;
}
/** Photo d'un joueur (l'image fournie, sinon celle du profil ou de Google). */
export function useAvatar(p) {
  const [, tick] = useState(0);
  const id = p?.id || p?.user_id || null, username = p?.username || null, image = p?.image || p?.avatar_url || p?.avatar || null;
  useEffect(() => {
    if (image) return;
    const f = () => tick((x) => x + 1);
    subs.add(f); want(id, username);
    return () => subs.delete(f);
  }, [id, username, image]);
  return avatarOf({ id, username, image });
}
/** Le joueur vient de changer de photo : on oublie l'ancienne. */
export function forgetAvatar(id) { byId.delete(id); for (const [k] of byUser) byUser.delete(k); subs.forEach((f) => f()); }
