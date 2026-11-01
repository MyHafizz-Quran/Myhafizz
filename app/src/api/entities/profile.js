import { db } from '../neonClient';

/** Vérifie la disponibilité d'un nom d'utilisateur (Neon Function « pseudo », appelable avant la création du compte). */
const PSEUDO_URL = import.meta.env.VITE_PSEUDO_URL || 'https://br-gentle-bird-ba2xrv1u-pseudo.compute.c-8.eu-central-1.aws.neon.tech/';
export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
export const cleanUsername = (u) => String(u || '').trim().toLowerCase().replace(/^@/, '');

export async function usernameAvailable(u) {
  const name = cleanUsername(u);
  if (!USERNAME_RE.test(name)) return false;
  try {
    const r = await fetch(`${PSEUDO_URL}?u=${encodeURIComponent(name)}`);
    if (!r.ok) return null; // inconnu : on revérifie à l'enregistrement
    return (await r.json()).available === true;
  } catch { return null; }
}

/** Profil de personnalisation : nom d'utilisateur, niveau d'arabe, objectif, onboarding. */
export const Profile = {
  async get() {
    const { data: s } = await db.auth.getSession();
    const id = s?.session?.user?.id;
    if (!id) return null;
    const { data } = await db.from('profiles').select('id, full_name, username, arabic_level, goal, onboarded_at').eq('id', id).maybeSingle();
    return data || { id };
  },
  /** Met à jour les champs donnés. Erreur « taken » si le nom d'utilisateur est déjà pris. */
  async update(fields) {
    const { data: s } = await db.auth.getSession();
    const id = s?.session?.user?.id;
    if (!id) throw new Error('not authenticated');
    const row = { id, ...fields, updated_at: new Date().toISOString() };
    if ('username' in row) row.username = cleanUsername(row.username) || null;
    const { error } = await db.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) {
      if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) throw new Error('taken');
      throw error;
    }
  },
};

/** Infos saisies à l'inscription, appliquées au profil dès que le compte est confirmé. */
const PENDING = 'mh_pending_profile';
export const pendingProfile = {
  set: (p) => localStorage.setItem(PENDING, JSON.stringify(p)),
  take(email) {
    try {
      const p = JSON.parse(localStorage.getItem(PENDING) || 'null');
      if (p && (!email || p.email === email)) { localStorage.removeItem(PENDING); return p; }
    } catch { /* ignore */ }
    return null;
  },
};
