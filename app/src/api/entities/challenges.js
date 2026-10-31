import { supabase } from '@/api/neonClient';

export const Challenge = {
  async filter(filters = {}, orderBy = '-created_at') {
    let query = supabase.from('challenges').select('*');

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const isDesc = orderBy.startsWith('-');
    const column = isDesc ? orderBy.slice(1) : orderBy;
    query = query.order(column === 'created_date' ? 'created_at' : column, { ascending: !isDesc });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};

export const ChallengeParticipant = {
  async list() {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select('*');
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await supabase
      .from('challenge_participants')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('challenge_participants')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
