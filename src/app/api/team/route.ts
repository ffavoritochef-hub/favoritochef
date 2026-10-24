import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server-supabase';
import {
  MemberRow,
  TeamError,
  getCaller,
  parseEmail,
  parseMemberInput,
  parsePassword,
  targetTenant,
  teamErrorResponse,
  tenantOwner,
} from '@/lib/team-server';

export const dynamic = 'force-dynamic';

const MEMBER_COLS = 'id, tenant_id, user_id, email, name, role, permissions, active, created_at';

/** Lista os usuários da empresa (admin da empresa ou master com ?tenantId=). */
export async function GET(req: Request) {
  try {
    const c = await getCaller(req);
    const tenantId = targetTenant(c, new URL(req.url).searchParams.get('tenantId'));
    const ownerId = await tenantOwner(c.db, tenantId);
    if (ownerId) {
      // buffets criados depois da migração: o dono entra na lista como admin
      const { data: u } = await c.db.auth.admin.getUserById(ownerId);
      if (u.user?.email) {
        await c.db
          .from('tenant_members')
          .upsert({ tenant_id: tenantId, user_id: ownerId, email: u.user.email, role: 'admin', active: true }, { onConflict: 'user_id', ignoreDuplicates: true });
      }
    }
    const { data, error } = await c.db
      .from('tenant_members')
      .select(MEMBER_COLS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });
    if (error) throw new TeamError(error.message, 500);
    const rows = (data as MemberRow[]).map((m) => ({ ...m, is_owner: m.user_id === ownerId, is_me: m.user_id === c.userId }));
    return NextResponse.json({ members: rows });
  } catch (e) {
    const { body, status } = teamErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}

/** Cria um usuário (ou vincula um e-mail já existente e livre) na empresa. */
export async function POST(req: Request) {
  let createdUserId: string | null = null;
  try {
    const c = await getCaller(req);
    const b = await req.json().catch(() => ({}));
    const tenantId = targetTenant(c, b.tenantId);
    await tenantOwner(c.db, tenantId);
    const email = parseEmail(b.email);
    const input = parseMemberInput(b);
    if (input.role === 'usuario' && input.permissions.length === 0) {
      throw new TeamError('Marque pelo menos uma área que o usuário pode acessar.');
    }

    const { data: existing, error: findErr } = await c.db.rpc('find_auth_user', { p_email: email });
    if (findErr) throw new TeamError('Falta rodar a migração 0010_usuarios.sql no Supabase.', 503);
    let userId = (existing as string | null) ?? null;
    let linked = false;

    if (userId) {
      const [adm, own, mem] = await Promise.all([
        c.db.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
        c.db.from('tenants').select('id').eq('owner_id', userId).maybeSingle(),
        c.db.from('tenant_members').select('tenant_id').eq('user_id', userId).maybeSingle(),
      ]);
      if (mem.data?.tenant_id === tenantId) throw new TeamError('Este e-mail já é usuário desta empresa.');
      if (adm.data || own.data || mem.data) throw new TeamError('Este e-mail já está em uso em outra conta. Use outro e-mail.');
      linked = true;
    } else {
      const password = parsePassword(b.password, true)!;
      const { data, error } = await c.db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: input.name || null },
      });
      if (error || !data.user) throw new TeamError('Não foi possível criar o login: ' + (error?.message || 'erro desconhecido'), 400);
      userId = data.user.id;
      createdUserId = userId;
    }

    const { data: row, error } = await c.db
      .from('tenant_members')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        email,
        name: input.name || null,
        role: input.role,
        permissions: input.permissions,
        active: true,
        created_by: c.userId,
      })
      .select('id')
      .single();
    if (error) throw new TeamError('Não foi possível vincular o usuário: ' + error.message, 500);
    createdUserId = null;
    return NextResponse.json({ id: row.id, linked });
  } catch (e) {
    if (createdUserId) {
      try {
        await adminClient().auth.admin.deleteUser(createdUserId);
      } catch {}
    }
    const { body, status } = teamErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
