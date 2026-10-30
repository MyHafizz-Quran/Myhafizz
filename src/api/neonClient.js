import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

// Neon (Managed Better Auth + Data API). Supabase-compatible API, exported as
// `supabase` so the rest of the app keeps the same call sites.
const neonUrl = import.meta.env.VITE_NEON_URL;

if (!neonUrl) {
  throw new Error(
    "❌ Variable d'environnement manquante : VITE_NEON_URL\n\n" +
    'Crée un fichier .env.local à la racine du projet avec :\n' +
    '  VITE_NEON_URL=https://ep-xxx.<region>.aws.neon.tech/neondb\n\n' +
    'Valeur : Neon Console → Connect (host + nom de la base, en https).'
  );
}

const client = createClient(neonUrl, {
  auth: { adapter: SupabaseAuthAdapter() },
});

const rawAuth = client.auth;

// ---- Compatibility layer: Better Auth stores name/image, the app reads
// user.user_metadata.full_name / avatar_url (Supabase style). Avatars live in
// public.profiles.avatar_url (kept out of the auth token).
let avatarCache = { id: null, url: null, name: null };

function normalizeUser(user) {
  if (!user) return user;
  const meta = { ...(user.user_metadata || {}) };
  const cachedName = avatarCache.id === user.id ? avatarCache.name : null;
  if (!meta.full_name) meta.full_name = meta.displayName || user.name || meta.name || cachedName || undefined;
  const avatar = avatarCache.id === user.id ? avatarCache.url : null;
  if (avatar) meta.avatar_url = avatar;
  else if (!meta.avatar_url && meta.profileImageUrl) meta.avatar_url = meta.profileImageUrl;
  return { ...user, user_metadata: meta };
}
const normalizeSession = (s) => (s ? { ...s, user: normalizeUser(s.user) } : s);

async function loadAvatar(userId) {
  if (!userId || avatarCache.id === userId) return;
  try {
    const { data } = await client.from('profiles').select('avatar_url, full_name').eq('id', userId).maybeSingle();
    avatarCache = { id: userId, url: data?.avatar_url || null, name: data?.full_name || null };
  } catch {
    avatarCache = { id: userId, url: null, name: null };
  }
}

const auth = {
  ...rawAuth,
  async getSession(...args) {
    const res = await rawAuth.getSession(...args);
    if (res?.data?.session?.user) await loadAvatar(res.data.session.user.id);
    return { ...res, data: { ...res.data, session: normalizeSession(res?.data?.session) } };
  },
  async getUser(...args) {
    const res = await rawAuth.getUser(...args);
    if (res?.data?.user) await loadAvatar(res.data.user.id);
    return { ...res, data: { ...res.data, user: normalizeUser(res?.data?.user) } };
  },
  async refreshSession(...args) {
    const res = await rawAuth.refreshSession(...args);
    return { ...res, data: { ...res?.data, session: normalizeSession(res?.data?.session), user: normalizeUser(res?.data?.user) } };
  },
  signInWithPassword: (...a) => rawAuth.signInWithPassword(...a),
  signOut: (...a) => { avatarCache = { id: null, url: null, name: null }; return rawAuth.signOut(...a); },
  resetPasswordForEmail: (...a) => rawAuth.resetPasswordForEmail(...a),
  onAuthStateChange(cb) {
    return rawAuth.onAuthStateChange((event, session) => cb(event, normalizeSession(session)));
  },
  async signUp(credentials) {
    const data = { ...(credentials?.options?.data || {}) };
    const displayName = data.full_name || data.displayName || '';
    delete data.full_name; delete data.avatar_url;
    return rawAuth.signUp({ ...credentials, options: { ...credentials.options, data: { ...data, displayName } } });
  },
  async updateUser(attributes = {}) {
    const { data = {}, ...rest } = attributes;
    if (rest.password) {
      // Password reset from the emailed link (?token=...)
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) return { data: { user: null }, error: { message: 'Lien de réinitialisation invalide ou expiré. Redemande un email.' } };
      const ba = rawAuth.getBetterAuthInstance();
      const r = await ba.resetPassword({ newPassword: rest.password, token });
      return r?.error ? { data: { user: null }, error: { message: r.error.message || 'Erreur' } } : { data: { user: null }, error: null };
    }
    if ('avatar_url' in data) {
      const { data: s } = await rawAuth.getSession();
      const uid = s?.session?.user?.id;
      if (uid) {
        const { error } = await client.from('profiles').upsert({ id: uid, avatar_url: data.avatar_url, updated_at: new Date().toISOString() });
        if (error) return { data: { user: null }, error };
        avatarCache = { ...avatarCache, id: uid, url: data.avatar_url };
      }
    }
    const baData = {};
    if ('full_name' in data) baData.name = data.full_name;
    if (Object.keys(baData).length) {
      const res = await rawAuth.updateUser({ data: baData });
      if (res?.error) return res;
      const { data: s } = await rawAuth.getSession();
      const uid = s?.session?.user?.id;
      if (uid && 'full_name' in data) {
        await client.from('profiles').upsert({ id: uid, full_name: data.full_name, updated_at: new Date().toISOString() });
        if (avatarCache.id === uid) avatarCache.name = data.full_name;
      }
    }
    const u = await auth.getUser();
    return { data: { user: u?.data?.user ?? null }, error: null };
  },
};

// Avatar "storage": images are resized client-side and stored as data URLs.
async function fileToDataUrl(file, max = 256) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
const uploads = new Map();
const storage = {
  from() {
    return {
      async upload(path, file) {
        try { uploads.set(path, await fileToDataUrl(file)); return { data: { path }, error: null }; }
        catch (e) { return { data: null, error: e }; }
      },
      getPublicUrl(path) { return { data: { publicUrl: uploads.get(path) || null } }; },
    };
  },
};

export const supabase = {
  auth,
  storage,
  from: (...a) => client.from(...a),
  rpc: (...a) => client.rpc(...a),
};
export default supabase;
