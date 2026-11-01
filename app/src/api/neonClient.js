import { trackRpc } from "@/lib/analytics";
import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

// Neon (Managed Better Auth + Data API). Supabase-compatible API, exported as
// `db` so the rest of the app keeps the same call sites.
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
// user.user_metadata.full_name / avatar_url. Avatars live in
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

// Une seule requête à la fois par utilisateur : les appels simultanés (getSession/getUser au démarrage) partagent la même
let avatarLoading = { id: null, promise: null };
function loadAvatar(userId) {
  if (!userId || avatarCache.id === userId) return Promise.resolve();
  if (avatarLoading.id === userId && avatarLoading.promise) return avatarLoading.promise;
  const promise = (async () => {
    try {
      const { data } = await client.from('profiles').select('avatar_url, full_name').eq('id', userId).maybeSingle();
      avatarCache = { id: userId, url: data?.avatar_url || null, name: data?.full_name || null };
    } catch {
      avatarCache = { id: userId, url: null, name: null };
    } finally {
      if (avatarLoading.id === userId) avatarLoading = { id: null, promise: null };
    }
  })();
  avatarLoading = { id: userId, promise };
  return promise;
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
  signInWithOAuth: (...a) => rawAuth.signInWithOAuth(...a),
  signOut: (...a) => { avatarCache = { id: null, url: null, name: null }; avatarLoading = { id: null, promise: null }; return rawAuth.signOut(...a); },
  resetPasswordForEmail: (...a) => rawAuth.resetPasswordForEmail(...a),
  // Codes à 6 chiffres envoyés par e-mail (Neon Auth, plugin Email OTP)
  verifySignupCode: (email, token) => rawAuth.verifyOtp({ email, token, type: 'signup' }),
  async sendCode(email, type) {
    const r = await rawAuth.getBetterAuthInstance().emailOtp.sendVerificationOtp({ email, type });
    return { error: r?.error || null };
  },
  async resetWithCode(email, otp, password) {
    const r = await rawAuth.getBetterAuthInstance().emailOtp.resetPassword({ email, otp, password });
    return { error: r?.error || null };
  },
  onAuthStateChange(cb) {
    return rawAuth.onAuthStateChange((event, session) => cb(event, normalizeSession(session)));
  },
  // Inscription directe (Better Auth) : avec la confirmation par code obligatoire, il n'y a pas
  // encore de session à ce stade, ce que l'adaptateur Supabase considère comme une erreur.
  async signUp(credentials) {
    const name = credentials?.options?.data?.full_name || credentials?.options?.data?.displayName || '';
    const r = await rawAuth.getBetterAuthInstance().signUp.email({ email: credentials.email, password: credentials.password, name });
    if (r?.error) return { data: { user: null, session: null }, error: { message: r.error.message || r.error.code || 'Erreur', code: r.error.code } };
    return { data: { user: r?.data?.user ?? null, session: null }, error: null };
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

export const db = {
  auth,
  storage,
  from: (...a) => client.from(...a),
  rpc: (fn, args, ...rest) => { trackRpc(fn, args); return client.rpc(fn, args, ...rest); },
};
export default db;


/** Traduit les erreurs d'authentification (Better Auth / Neon) en français clair. */
export function frAuthError(err) {
  const m = String(err?.message || err || "").toLowerCase();
  if (!m) return "Une erreur est survenue. Réessaie.";
  if (m.includes("already exists") || m.includes("already registered") || m.includes("user_already")) return "Un compte existe déjà avec cet email. Connecte-toi.";
  if (m.includes("invalid email or password") || m.includes("invalid login") || m.includes("invalid credentials") || m.includes("invalid password")) return "Email ou mot de passe incorrect.";
  if (m.includes("user not found")) return "Aucun compte avec cet email. Crée un compte.";
  if (m.includes("invalid email") || m.includes("email is invalid")) return "Cette adresse email n'est pas valide.";
  if (m.includes("password") && (m.includes("short") || m.includes("too small") || m.includes("at least"))) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("password") && m.includes("long")) return "Le mot de passe est trop long.";
  if (m.includes("not verified") || m.includes("verify your email") || m.includes("email_not_verified")) return "Confirme d'abord ton e-mail avec le code reçu.";
  if (m.includes("too many") || m.includes("rate limit") || m.includes("429")) return "Trop de tentatives. Patiente une minute puis réessaie.";
  if (m.includes("invalid otp") || m.includes("invalid_otp") || m.includes("otp is invalid") || m.includes("invalid code")) return "Code incorrect. Vérifie les 6 chiffres.";
  if (m.includes("otp") && m.includes("expired")) return "Ce code a expiré. Demande un nouveau code.";
  if (m.includes("too many attempts")) return "Trop d'essais. Demande un nouveau code.";
  if (m.includes("expired") || (m.includes("invalid") && m.includes("token"))) return "Ce lien a expiré. Redemande un email.";
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("load failed")) return "Pas de connexion. Vérifie ton internet.";
  if (m.includes("provider") || m.includes("oauth") || m.includes("social")) return "La connexion avec Google n'est pas disponible pour le moment.";
  if (/[éèàçù]/.test(String(err?.message || err))) return String(err?.message || err);
  return "Une erreur est survenue. Réessaie.";
}
