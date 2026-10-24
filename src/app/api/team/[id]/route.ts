import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/server-supabase';
import {
  Caller,
  MemberRow,
  TeamError,
  getCaller,
  parseMemberInput,
  parsePassword,
  setLoginEnabled,
  targetTenant,
  teamErrorResponse,
  tenantOwner,
} from '@/lib/team-server';

export const dynamic = 'force-dynamic';

async function loadMember(c: Caller, id: string) {
  if (!isUuid(id)) throw new TeamError('Usuário inválido.', 404);
  const { data, error } = await c.db
    .from('tenant_members')
    .select('id, tenant_id, user_id, email, name, role, permissions, active, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new TeamError(error.message, 500);
  if (!data) throw new TeamError('Usuário não encontrado.', 404);
  const m = data as MemberRow;
  // garante que o chamador pode mexer nesta empresa
  targetTenant(c, m.tenant_id);
  const ownerId = await tenantOwner(c.db, m.tenant_id);
  return { m, isOwner: m.user_id === ownerId, isMe: m.user_id === c.userId };
}

/** Edita nome, papel, permissões, ativo/inativo e/ou senha. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const c = await getCaller(req);
    const { id } = await ctx.params;
    const { m, isOwner, isMe } = await loadMember(c, id);
    const b = await req.json().catch(() => ({}));
    const input = parseMemberInput({ role: m.role, permissions: m.permissions, name: m.name, ...b });
    const active = typeof b.active === 'boolean' ? b.active : m.active;
    const password = parsePassword(b.password, false);

    if (isOwner && (input.role !== 'admin' || !active)) {
      throw new TeamError('O dono do buffet é sempre administrador e não pode ser inativado.');
    }
    if (isOwner && password && !isMe && !c.isMaster) {
      throw new TeamError('Só o próprio dono (ou o master) pode trocar a senha do dono.', 403);
    }
    if (isMe && !c.isMaster && (input.role !== m.role || !active)) {
      throw new TeamError('Você não pode mudar o seu próprio papel nem se inativar.');
    }
    if (input.role === 'usuario' && input.permissions.length === 0) {
      throw new TeamError('Marque pelo menos uma área que o usuário pode acessar.');
    }

    if (password) {
      const { error } = await c.db.auth.admin.updateUserById(m.user_id, { password });
      if (error) throw new TeamError('Não foi possível trocar a senha: ' + error.message, 400);
    }
    if (active !== m.active) await setLoginEnabled(c.db, m.user_id, active);

    const { error } = await c.db
      .from('tenant_members')
      .update({
        name: input.name || null,
        role: input.role,
        permissions: input.permissions,
        active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', m.id);
    if (error) throw new TeamError(error.message, 500);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { body, status } = teamErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}

/** Remove o usuário da empresa e apaga o login dele. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const c = await getCaller(req);
    const { id } = await ctx.params;
    const { m, isOwner, isMe } = await loadMember(c, id);
    if (isOwner) throw new TeamError('O dono do buffet não pode ser excluído.');
    if (isMe) throw new TeamError('Você não pode excluir a si mesmo.');

    const { error } = await c.db.from('tenant_members').delete().eq('id', m.id);
    if (error) throw new TeamError(error.message, 500);
    const { error: delErr } = await c.db.auth.admin.deleteUser(m.user_id);
    if (delErr) {
      // o login tem registros ligados a ele: ao menos bloqueia o acesso
      await setLoginEnabled(c.db, m.user_id, false).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { body, status } = teamErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
