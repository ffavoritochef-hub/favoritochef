import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

let admin: SupabaseClient | null = null;

/** Cliente com service role. Usar SOMENTE em rotas de servidor. */
export function adminClient(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase não configurado no servidor.');
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

/**
 * Valida o Bearer token do usuário logado usando a chave pública (anon) e devolve
 * um cliente que age COMO o usuário (respeita RLS). Não depende da service role.
 */
export async function requireUser(request: Request): Promise<{ user: User; db: SupabaseClient } | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  const db = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, db };
}

export const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** URL pública base (respeita proxy da Vercel). */
export function publicBaseUrl(request: Request): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export interface UserTenant {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: 'pendente' | 'ativo' | 'suspenso' | 'recusado';
  valid_until: string | null;
}

/**
 * Buffet do usuário logado (dono ou usuário vinculado), usando o cliente que age como ele.
 * Com `perm`, devolve 'forbidden' se o usuário não tiver acesso àquela área.
 */
export async function userTenant(db: SupabaseClient, perm?: string): Promise<UserTenant | 'forbidden' | null> {
  const { data: tid } = await db.rpc('current_tenant_id');
  if (!tid) return null;
  const { data } = await db.from('tenants').select('id, name, city, state, status, valid_until').eq('id', tid).maybeSingle();
  if (!data) return null;
  if (perm) {
    const { data: ok, error } = await db.rpc('has_permission', { perm });
    // sem a migração 0010 a função não existe: só o dono acessa, então libera
    if (!error && !ok) return 'forbidden';
  }
  return data as UserTenant;
}
