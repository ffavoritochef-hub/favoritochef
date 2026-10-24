import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, requireUser } from '@/lib/server-supabase';
import { MemberRole, MIN_PASSWORD, isValidEmail, sanitizePermissions, type Permission } from '@/lib/permissions';

export interface Caller {
  userId: string;
  isMaster: boolean;
  /** Empresa do usuário (dono ou vínculo ativo). */
  tenantId: string | null;
  isTenantAdmin: boolean;
  db: SupabaseClient; // service role
}

export interface MemberRow {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: MemberRole;
  permissions: string[];
  active: boolean;
  created_at: string;
}

export class TeamError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function getCaller(req: Request): Promise<Caller> {
  const auth = await requireUser(req);
  if (!auth) throw new TeamError('Sessão expirada ou inválida. Saia e entre novamente.', 401);
  const db = adminClient();
  const uid = auth.user.id;
  const [adm, own, mem] = await Promise.all([
    db.from('platform_admins').select('user_id').eq('user_id', uid).maybeSingle(),
    db.from('tenants').select('id').eq('owner_id', uid).maybeSingle(),
    db.from('tenant_members').select('tenant_id, role, active').eq('user_id', uid).maybeSingle(),
  ]);
  if (mem.error && mem.error.code === 'PGRST205') {
    throw new TeamError('Falta rodar a migração 0010_usuarios.sql no Supabase.', 503);
  }
  const m = mem.data as { tenant_id: string; role: MemberRole; active: boolean } | null;
  const tenantId = own.data?.id ?? (m?.active ? m.tenant_id : null);
  return {
    userId: uid,
    isMaster: !!adm.data,
    tenantId,
    isTenantAdmin: !!own.data || (!!m?.active && m.role === 'admin'),
    db,
  };
}

/** Empresa sobre a qual o chamador pode gerenciar usuários. */
export function targetTenant(c: Caller, requested: string | null | undefined): string {
  if (c.isMaster) {
    if (!requested) throw new TeamError('Informe a empresa.');
    return requested;
  }
  if (!c.tenantId || !c.isTenantAdmin) throw new TeamError('Só o administrador da empresa pode gerenciar usuários.', 403);
  if (requested && requested !== c.tenantId) throw new TeamError('Empresa inválida.', 403);
  return c.tenantId;
}

export async function tenantOwner(db: SupabaseClient, tenantId: string): Promise<string | null> {
  const { data, error } = await db.from('tenants').select('owner_id').eq('id', tenantId).maybeSingle();
  if (error) throw new TeamError(error.message, 500);
  if (!data) throw new TeamError('Empresa não encontrada.', 404);
  return data.owner_id ?? null;
}

export interface MemberInput {
  name: string;
  role: MemberRole;
  permissions: Permission[];
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parseMemberInput(b: Record<string, unknown>): MemberInput {
  const role: MemberRole = b.role === 'admin' ? 'admin' : 'usuario';
  return {
    name: clip(b.name, 120),
    role,
    permissions: role === 'admin' ? [] : sanitizePermissions(b.permissions),
  };
}

export function parseEmail(v: unknown): string {
  const email = clip(v, 200).toLowerCase();
  if (!isValidEmail(email)) throw new TeamError('E-mail inválido.');
  return email;
}

export function parsePassword(v: unknown, required: boolean): string | null {
  const p = typeof v === 'string' ? v : '';
  if (!p) {
    if (required) throw new TeamError(`Defina uma senha com pelo menos ${MIN_PASSWORD} caracteres.`);
    return null;
  }
  if (p.length < MIN_PASSWORD) throw new TeamError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  if (p.length > 72) throw new TeamError('Senha longa demais.');
  return p;
}

/** Bloqueia ou libera o login do usuário no Supabase Auth. */
export async function setLoginEnabled(db: SupabaseClient, userId: string, enabled: boolean) {
  const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: enabled ? 'none' : '876000h' });
  if (error) throw new TeamError('Não foi possível ' + (enabled ? 'liberar' : 'bloquear') + ' o login: ' + error.message, 500);
}

export function teamErrorResponse(e: unknown): { body: { error: string }; status: number } {
  if (e instanceof TeamError) return { body: { error: e.message }, status: e.status };
  console.error('team', e);
  return { body: { error: 'Erro inesperado. Tente novamente.' }, status: 500 };
}
