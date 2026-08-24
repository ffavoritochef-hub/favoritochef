import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabaseInstance: SupabaseClient | null = null;

if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('❌ Erro ao inicializar Supabase:', err);
  }
} else if (typeof window !== 'undefined') {
  console.error(
    '❌ Variáveis NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.\n' +
    '👉 Configure no Vercel: Project Settings → Environment Variables.\n' +
    '👉 Ou localmente no arquivo .env.local.'
  );
}

export const supabase = supabaseInstance as SupabaseClient;
