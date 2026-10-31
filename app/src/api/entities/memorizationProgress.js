import { db } from '@/api/neonClient';

export const MemorizationProgress = {
  async list() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await db
      .from('memorization_progress')
      .select('*')
      .eq('user_id', user.id);
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await db
      .from('memorization_progress')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await db
      .from('memorization_progress')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
