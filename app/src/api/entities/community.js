import { db } from '@/api/neonClient';

async function me() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Non authentifié');
  return user;
}
const ok = ({ data, error }) => { if (error) throw error; return data; };
export const displayName = (u) => u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Moi';

export const ROLE_LABEL = { teacher: 'Maître', student: 'Élève', parent: 'Parent', child: 'Enfant', member: 'Membre' };
export const KIND_LABEL = { class: 'Classe / madrasa', family: 'Famille', circle: 'Cercle' };
export const isStaff = (role) => role === 'teacher' || role === 'parent';

export const Groups = {
  /** Mes groupes avec mon rôle */
  async mine() {
    const u = await me();
    const rows = ok(await db.from('group_members').select('role, group_id').eq('user_id', u.id));
    if (!rows.length) return [];
    const groups = ok(await db.from('study_groups').select('*').in('id', rows.map((r) => r.group_id)));
    const counts = ok(await db.from('group_members').select('group_id').in('group_id', rows.map((r) => r.group_id)));
    return groups.map((g) => ({ ...g, role: rows.find((r) => r.group_id === g.id)?.role, members: counts.filter((c) => c.group_id === g.id).length }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async get(id) {
    const u = await me();
    const g = ok(await db.from('study_groups').select('*').eq('id', id).maybeSingle());
    if (!g) return null;
    const members = ok(await db.from('group_members').select('*').eq('group_id', id).order('joined_at'));
    return { ...g, members, me: u.id, role: members.find((m) => m.user_id === u.id)?.role };
  },
  async create(name, kind) {
    const u = await me();
    return ok(await db.rpc('create_group', { p_name: name, p_kind: kind, p_display: displayName(u) }));
  },
  async preview(code) {
    const r = ok(await db.rpc('group_preview', { p_code: code }));
    return Array.isArray(r) ? r[0] || null : r;
  },
  /** Infos publiques d'une invitation (fonctionne sans compte) */
  async inviteInfo(code) {
    const r = ok(await db.rpc('group_invite_info', { p_code: code }));
    return Array.isArray(r) ? r[0] || null : r;
  },
  async join(code, role, name) {
    const u = await me();
    return ok(await db.rpc('join_group', { p_code: code, p_display: name || displayName(u), p_role: role || 'child' }));
  },
  async leave(groupId, userId) {
    const u = await me();
    ok(await db.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId || u.id));
  },
  async remove(groupId) { ok(await db.from('study_groups').delete().eq('id', groupId)); },
  /** Progression des élèves/enfants (visible par le maître/parent grâce aux politiques RLS) */
  async progress(userIds) {
    if (!userIds.length) return { progress: [], reviews: [] };
    const progress = ok(await db.from('memorization_progress').select('user_id, surah_number, memorized_verses, last_reviewed, updated_at').in('user_id', userIds));
    const reviews = ok(await db.from('verse_reviews').select('user_id, surah_number, verse_number, interval_days, due_date, last_grade, last_reviewed').in('user_id', userIds));
    return { progress, reviews };
  },
};

export const Assignments = {
  async list(groupId) {
    const items = ok(await db.from('group_assignments').select('*').eq('group_id', groupId).order('created_at', { ascending: false }));
    const statuses = items.length ? ok(await db.from('assignment_status').select('*').in('assignment_id', items.map((a) => a.id))) : [];
    return items.map((a) => ({ ...a, statuses: statuses.filter((s) => s.assignment_id === a.id) }));
  },
  async create(a) { return ok(await db.from('group_assignments').insert(a).select().single()); },
  async remove(id) { ok(await db.from('group_assignments').delete().eq('id', id)); },
  async setStatus(assignment_id, status, user_id, teacher_note) {
    const u = await me();
    const row = { assignment_id, user_id: user_id || u.id, status, updated_at: new Date().toISOString() };
    if (teacher_note !== undefined) row.teacher_note = teacher_note;
    ok(await db.from('assignment_status').upsert(row, { onConflict: 'assignment_id,user_id' }));
  },
  async clearStatus(assignment_id) {
    const u = await me();
    ok(await db.from('assignment_status').delete().eq('assignment_id', assignment_id).eq('user_id', u.id));
  },
};

export const Khatmas = {
  async list(groupId) {
    const ks = ok(await db.from('khatmas').select('*').eq('group_id', groupId).order('created_at', { ascending: false }));
    const parts = ks.length ? ok(await db.from('khatma_parts').select('*').in('khatma_id', ks.map((k) => k.id))) : [];
    return ks.map((k) => ({ ...k, parts: parts.filter((p) => p.khatma_id === k.id) }));
  },
  async create(group_id, title, target_date) { return ok(await db.from('khatmas').insert({ group_id, title, target_date: target_date || null }).select().single()); },
  async remove(id) { ok(await db.from('khatmas').delete().eq('id', id)); },
  async reserve(khatma_id, juz) {
    const u = await me();
    ok(await db.from('khatma_parts').insert({ khatma_id, juz, user_name: displayName(u) }));
  },
  async setDone(khatma_id, juz, done) {
    ok(await db.from('khatma_parts').update({ status: done ? 'done' : 'reserved', updated_at: new Date().toISOString() }).eq('khatma_id', khatma_id).eq('juz', juz));
  },
  async release(khatma_id, juz) { ok(await db.from('khatma_parts').delete().eq('khatma_id', khatma_id).eq('juz', juz)); },
};
