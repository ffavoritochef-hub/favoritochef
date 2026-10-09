import { NextResponse } from 'next/server';
import { isUuid, publicBaseUrl, requireUser } from '@/lib/server-supabase';
import { buildProposalView, loadLatestBudgetByEvent } from '@/lib/proposal';
import { buildProposalPdf } from '@/lib/proposal-pdf';

export const dynamic = 'force-dynamic';

/** PDF interno (exige login). Aceita rascunho para pré-visualização. */
export async function GET(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Sessão expirada ou inválida. Saia e entre novamente.' }, { status: 401 });

  const { eventId } = await params;
  if (!isUuid(eventId)) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
  try {
    const budget = await loadLatestBudgetByEvent(eventId, auth.db);
    if (!budget) return NextResponse.json({ error: 'Este evento ainda não tem orçamento.' }, { status: 404 });
    const download = new URL(req.url).searchParams.get('download') === 'true';
    const view = buildProposalView(budget);
    const pdf = await buildProposalPdf(view, `${publicBaseUrl(req)}/proposta/${budget.proposal_token}`);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="proposta_${eventId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('pdf', e);
    return NextResponse.json({ error: 'Erro ao gerar PDF.' }, { status: 500 });
  }
}
