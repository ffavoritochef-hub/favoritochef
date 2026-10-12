import { NextResponse } from 'next/server';
import { isUuid, publicBaseUrl } from '@/lib/server-supabase';
import { buildProposalView, loadBrand, loadBudgetByToken } from '@/lib/proposal';
import { buildProposalPdf } from '@/lib/proposal-pdf';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isUuid(token)) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
  try {
    const budget = await loadBudgetByToken(token);
    if (!budget || budget.proposal_status === 'rascunho') {
      return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
    }
    const download = new URL(req.url).searchParams.get('download') === 'true';
    const { brand, active } = await loadBrand(budget.tenant_id);
    if (!active) return NextResponse.json({ error: 'Proposta indisponível no momento.' }, { status: 404 });
    const view = buildProposalView(budget, brand);
    const pdf = await buildProposalPdf(view, `${publicBaseUrl(req)}/proposta/${token}`);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="proposta.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('public pdf', e);
    return NextResponse.json({ error: 'Erro ao gerar PDF.' }, { status: 500 });
  }
}
