import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/server-supabase';
import { TeamError, getCaller, teamErrorResponse } from '@/lib/team-server';

export const dynamic = 'force-dynamic';

/** Master confirma o e-mail do dono de um buffet (dispensa o link de confirmação). */
export async function POST(req: Request) {
  try {
    const c = await getCaller(req);
    if (!c.isMaster) throw new TeamError('Apenas o master pode fazer isso.', 403);
    const b = await req.json().catch(() => ({}));
    const tenantId = typeof b.tenantId === 'string' ? b.tenantId : '';
    if (!isUuid(tenantId)) throw new TeamError('Empresa inválida.');
    const { data: t, error } = await c.db.from('tenants').select('owner_id').eq('id', tenantId).maybeSingle();
    if (error) throw new TeamError(error.message, 500);
    if (!t?.owner_id) throw new TeamError('Empresa sem dono vinculado.', 404);
    const { error: uErr } = await c.db.auth.admin.updateUserById(t.owner_id, { email_confirm: true });
    if (uErr) throw new TeamError('Não foi possível confirmar o e-mail: ' + uErr.message, 500);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { body, status } = teamErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
