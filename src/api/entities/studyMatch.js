import { supabase } from '@/api/supabaseClient';

export const StudyProfile = {
  async filter(filters = {}) {
    let query = supabase.from('study_profiles').select('*');
    if (filters.is_visible !== undefined) {
      query = query.eq('is_visible', filters.is_visible);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async listAll() {
    const { data, error } = await supabase.from('study_profiles').select('*');
    if (error) throw error;
    return data;
  },

  async upsert(payload) {
    const { data, error } = await supabase
      .from('study_profiles')
      .upsert(payload, { onConflict: 'user_email' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('study_profiles')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('study_profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const StudyMatchEntity = {
  async list() {
    const { data, error } = await supabase
      .from('study_matches')
      .select('*');
    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('study_matches')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('study_matches')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
