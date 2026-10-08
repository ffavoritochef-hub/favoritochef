import { NextResponse } from 'next/server';
import { adminClient, isUuid } from '@/lib/server-supabase';
import { buildProposalView, loadBudgetByToken } from '@/lib/proposal';

export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isUuid(token)) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
  try {
    const budget = await loadBudgetByToken(token);
    // rascunho nunca é público
    if (!budget || budget.proposal_status === 'rascunho') {
      return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
    }
    return NextResponse.json(buildProposalView(budget), noStore);
  } catch (e) {
    console.error('proposal GET', e);
    return NextResponse.json({ error: 'Erro ao carregar proposta.' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isUuid(token)) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });

  let body: { action?: string; note?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
  if (body.action !== 'accept' && body.action !== 'decline') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }
  const note = String(body.note ?? '').slice(0, 500) || null;

  try {
    const budget = await loadBudgetByToken(token);
    if (!budget || budget.proposal_status === 'rascunho') {
      return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
    }
    const view = buildProposalView(budget);
    if (view.status !== 'enviada') {
      const msg =
        view.status === 'expirada'
          ? 'Esta proposta expirou. Solicite uma nova ao buffet.'
          : 'Esta proposta já foi respondida.';
      return NextResponse.json({ error: msg, status: view.status }, { status: 409 });
    }

    const db = adminClient();
    const accepted = body.action === 'accept';
    // update condicional: evita resposta dupla em cliques simultâneos
    const { data: upd, error } = await db
      .from('budgets')
      .update({
        proposal_status: accepted ? 'aceita' : 'recusada',
        proposal_responded_at: new Date().toISOString(),
        client_response_note: note,
      })
      .eq('id', budget.id)
      .eq('proposal_status', 'enviada')
      .select('id');
    if (error) throw error;
    if (!upd || upd.length === 0) {
      return NextResponse.json({ error: 'Esta proposta já foi respondida.' }, { status: 409 });
    }

    if (accepted && budget.event) {
      const approvable = ['Orçamento enviado', 'Aguardando aprovação'];
      const patch: Record<string, unknown> = { agreed_value: view.total };
      if (approvable.includes(budget.event.status)) patch.status = 'Aprovado';
      const { error: evErr } = await db.from('events').update(patch).eq('id', budget.event.id);
      if (evErr) throw evErr;
    }

    const fresh = await loadBudgetByToken(token);
    return NextResponse.json(buildProposalView(fresh), noStore);
  } catch (e) {
    console.error('proposal POST', e);
    return NextResponse.json({ error: 'Erro ao registrar resposta.' }, { status: 500 });
  }
}
