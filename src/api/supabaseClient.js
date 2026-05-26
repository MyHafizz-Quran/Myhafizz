import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && '  - VITE_SUPABASE_URL',
    !supabaseAnonKey && '  - VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join('\n');
  throw new Error(
    '❌ Variables d\'environnement manquantes :\n' +
    missing + '\n\n' +
    'Crée un fichier .env.local à la racine du projet avec ces valeurs.\n' +
    'Exemple :\n' +
    '  VITE_SUPABASE_URL=https://ton-projet.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=ton-anon-key\n\n' +
    'Ces valeurs se trouvent dans : Supabase Dashboard → Project Settings → API'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'myhafizz-auth',
  },
});
