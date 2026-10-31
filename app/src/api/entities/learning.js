import { supabase } from '@/api/neonClient';

async function uid() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');
  return user.id;
}

export const VerseReview = {
  async list() {
    const id = await uid();
    const { data, error } = await supabase.from('verse_reviews').select('*').eq('user_id', id);
    if (error) throw error;
    return data || [];
  },
  /** rows: [{surah_number, verse_number, ...champs}] */
  async upsert(rows) {
    if (!rows.length) return [];
    const id = await uid();
    const { data, error } = await supabase
      .from('verse_reviews')
      .upsert(rows.map((r) => ({ ...r, user_id: id })), { onConflict: 'user_id,surah_number,verse_number' })
      .select();
    if (error) throw error;
    return data;
  },
  async remove(surah_number, verse_numbers) {
    if (!verse_numbers.length) return;
    const id = await uid();
    const { error } = await supabase.from('verse_reviews').delete()
      .eq('user_id', id).eq('surah_number', surah_number).in('verse_number', verse_numbers);
    if (error) throw error;
  },
};

export const HifzPlan = {
  async get() {
    const id = await uid();
    const { data, error } = await supabase.from('hifz_plans').select('*').eq('user_id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async save(plan) {
    const id = await uid();
    const { data, error } = await supabase.from('hifz_plans')
      .upsert({ ...plan, user_id: id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select().single();
    if (error) throw error;
    return data;
  },
};

/** Jours d'activité (rempli côté base par déclencheur sur verse_reviews / memorization_progress) */
export const ActivityDays = {
  async list(limit = 400) {
    const id = await uid();
    const { data, error } = await supabase.from('activity_days').select('day').eq('user_id', id).order('day', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((r) => r.day);
  },
};

/** Apprendre à lire : progression des leçons (Qaida) */
export const ReadingLessons = {
  async list() {
    const id = await uid();
    const { data, error } = await supabase.from('reading_lessons').select('*').eq('user_id', id);
    if (error) throw error;
    return data || [];
  },
  async completeMany(ids) {
    if (!ids.length) return [];
    const id = await uid();
    const now = new Date().toISOString();
    const { error } = await supabase.from('reading_lessons').upsert(ids.map((lesson_id) => ({ user_id: id, lesson_id, best_score: 100, xp: 0, attempts: 0, completed_at: now, updated_at: now })), { onConflict: 'user_id,lesson_id' });
    if (error) throw error;
    return ids;
  },
  async complete(lesson_id, score, xp, prev) {
    const id = await uid();
    const row = { user_id: id, lesson_id, best_score: Math.max(score, prev?.best_score || 0), xp: (prev?.xp || 0) + xp, attempts: (prev?.attempts || 0) + 1, updated_at: new Date().toISOString() };
    if (!prev) row.completed_at = new Date().toISOString();
    const { data, error } = await supabase.from('reading_lessons').upsert(row, { onConflict: 'user_id,lesson_id' }).select().single();
    if (error) throw error;
    // journal (objectif du jour, défis, classement) : ne bloque pas la sauvegarde
    await supabase.from('reading_sessions').insert({ user_id: id, lesson_id, score, xp }).then(() => {}, () => {});
    return data;
  },
};

export const ReadingSessions = {
  /** sessions depuis une date (ISO) */
  async since(iso) {
    const id = await uid();
    const { data, error } = await supabase.from('reading_sessions').select('lesson_id, score, xp, created_at').eq('user_id', id).gte('created_at', iso).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async leaderboard(iso) {
    const { data, error } = await supabase.rpc('get_reading_leaderboard', { since: iso });
    if (error) throw error;
    return data || [];
  },
};
