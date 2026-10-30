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
