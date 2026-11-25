import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server-supabase';
import { TeamError, getCaller, parseEmail, parsePassword, teamErrorResponse } from '@/lib/team-server';

export const dynamic = 'force-dynamic';

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Master cria uma empresa (buffet) já aprovada, com o login do dono.
 * Se o e-mail já existe no Auth mas não está ligado a nenhuma empresa
 * (cadastro que falhou pela metade), reaproveita esse login.
 */
export async function POST(req: Request) {
  let createdUserId: string | null = null;
  try {
    const c = await getCaller(req);
    if (!c.isMaster) throw new TeamError('Apenas o master pode criar empresas.', 403);
    const b = await req.json().catch(() => ({}));

    const name = clip(b.buffet_name, 120);
    const responsible = clip(b.responsible_name, 120);
    if (name.length < 2) throw new TeamError('Informe o nome da empresa.');
    if (responsible.length < 2) throw new TeamError('Informe o nome do responsável.');
    const email = parseEmail(b.email);
    const password = parsePassword(b.password, true)!;
    const days = b.days === null ? null : Number(b.days) > 0 ? Math.min(Number(b.days), 3650) : 30;
    const validUntil = days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString();

    const { data: existing, error: findErr } = await c.db.rpc('find_auth_user', { p_email: email });
    if (findErr) throw new TeamError('Falta rodar a migração 0010_usuarios.sql no Supabase.', 503);
    let userId = (existing as string | null) ?? null;
    let reused = false;

    if (userId) {
      const [adm, own, mem] = await Promise.all([
        c.db.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
        c.db.from('tenants').select('id, name').eq('owner_id', userId).maybeSingle(),
        c.db.from('tenant_members').select('tenant_id').eq('user_id', userId).maybeSingle(),
      ]);
      if (adm.data) throw new TeamError('Este e-mail é do master. Use outro e-mail.');
      if (own.data) throw new TeamError(`Este e-mail já é dono da empresa "${own.data.name}".`);
      if (mem.data) throw new TeamError('Este e-mail já é usuário de outra empresa. Remova-o de lá ou use outro e-mail.');
      const { error } = await c.db.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        ban_duration: 'none',
        user_metadata: { name: responsible },
      });
      if (error) throw new TeamError('Não foi possível atualizar o login existente: ' + error.message, 400);
      reused = true;
    } else {
      // Sem buffet_name no metadata: o trigger não cria empresa pendente; criamos abaixo, já ativa.
      const { data, error } = await c.db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: responsible },
      });
      if (error || !data.user) throw new TeamError('Não foi possível criar o login: ' + (error?.message || 'erro desconhecido'), 400);
      userId = data.user.id;
      createdUserId = userId;
    }

    const { data: tenant, error: tErr } = await c.db
      .from('tenants')
      .insert({
        owner_id: userId,
        name,
        responsible_name: responsible,
        document: clip(b.document, 30) || null,
        email,
        phone: clip(b.phone, 30) || null,
        city: clip(b.city, 80) || null,
        state: clip(b.state, 2).toUpperCase() || null,
        status: 'ativo',
        approved_at: new Date().toISOString(),
        approved_by: c.userId,
        valid_until: validUntil,
      })
      .select('id')
      .single();
    if (tErr) throw new TeamError('Não foi possível criar a empresa: ' + tErr.message, 500);

    await c.db
      .from('tenant_members')
      .upsert(
        { tenant_id: tenant.id, user_id: userId, email, name: responsible, role: 'admin', active: true, created_by: c.userId },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );

    createdUserId = null;
    return NextResponse.json({ id: tenant.id, reused });
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
