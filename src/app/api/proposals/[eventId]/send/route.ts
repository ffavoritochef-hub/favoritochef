import { NextResponse } from 'next/server';
import { isUuid, publicBaseUrl, requireUser } from '@/lib/server-supabase';
import { buildProposalView, loadLatestBudgetByEvent } from '@/lib/proposal';
import { formatBRL, proposalValidUntil } from '@/lib/buffet-rules';

export const dynamic = 'force-dynamic';

function whatsappLink(client: any, message: string): string | null {
  const phone = client?.whatsapp || client?.phone;
  let clean = String(phone ?? '').replace(/\D/g, '');
  if (!clean) return null;
  if (clean.length <= 11 && !clean.startsWith('55')) clean = '55' + clean;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function buildMessage(view: ReturnType<typeof buildProposalView>, url: string) {
  const d = view.event.date ? new Date(view.event.date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
  return (
    `Olá ${view.clientName}! Segue a proposta do buffet para o evento *${view.event.name}*` +
    `${d ? ` (${d})` : ''}.\n\nValor total: *${formatBRL(view.total)}*\n` +
    `Sinal de ${view.deposit.percent}%: ${formatBRL(view.deposit.amount)}\n\n` +
    `Veja os detalhes e aceite online: ${url}\n` +
    `${view.validUntil ? `Válida até ${new Date(view.validUntil + 'T12:00:00').toLocaleDateString('pt-BR')}.` : ''}`
  );
}

/** Marca a proposta como enviada e devolve o link público + link do WhatsApp. */
export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Sessão expirada ou inválida. Saia e entre novamente.' }, { status: 401 });

  const { eventId } = await params;
  if (!isUuid(eventId)) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });

  try {
    const budget = await loadLatestBudgetByEvent(eventId, auth.db);
    if (!budget) return NextResponse.json({ error: 'Crie um orçamento para este evento primeiro.' }, { status: 404 });
    if (budget.proposal_status === 'aceita') {
      return NextResponse.json({ error: 'Esta proposta já foi aceita pelo cliente.' }, { status: 409 });
    }
    const before = buildProposalView(budget);
    if (!(before.total > 0)) {
      return NextResponse.json({ error: 'O valor da proposta está zerado.' }, { status: 400 });
    }

    const db = auth.db;
    const validUntil = proposalValidUntil();
    const { error } = await db
      .from('budgets')
      .update({
        proposal_status: 'enviada',
        proposal_sent_at: new Date().toISOString(),
        proposal_valid_until: validUntil,
        proposal_responded_at: null,
        client_response_note: null,
      })
      .eq('id', budget.id);
    if (error) throw error;

    if (budget.event?.status === 'Orçamento enviado') {
      await db.from('events').update({ status: 'Aguardando aprovação' }).eq('id', eventId);
    }

    const url = `${publicBaseUrl(req)}/proposta/${budget.proposal_token}`;
    const view = buildProposalView({ ...budget, proposal_status: 'enviada', proposal_valid_until: validUntil });
    const link = whatsappLink(budget.event?.client, buildMessage(view, url));
    return NextResponse.json({ publicUrl: url, whatsappLink: link, validUntil, hasPhone: !!link });
  } catch (e) {
    console.error('send proposal', e);
    return NextResponse.json({ error: 'Erro ao enviar proposta.' }, { status: 500 });
  }
}
