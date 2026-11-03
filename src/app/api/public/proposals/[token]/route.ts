import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminClient, isUuid } from '@/lib/server-supabase';
import { buildProposalView, loadBrand, loadBudgetByToken, toSnapshot } from '@/lib/proposal';
import { isValidCpf, onlyDigits } from '@/lib/cpf';

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
    const { brand, active } = await loadBrand(budget.tenant_id);
    if (!active) return NextResponse.json({ error: 'Proposta indisponível no momento.' }, { status: 404 });
    return NextResponse.json(buildProposalView(budget, brand), noStore);
  } catch (e) {
    console.error('proposal GET', e);
    return NextResponse.json({ error: 'Erro ao carregar proposta.' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isUuid(token)) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });

  let body: {
    action?: string;
    note?: string;
    signer?: { name?: string; document?: string; email?: string; signature?: string; agree?: boolean };
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
  if (body.action !== 'accept' && body.action !== 'decline') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }
  const note = String(body.note ?? '').slice(0, 500) || null;

  let signer: { name: string; document: string; email: string | null; image: string } | null = null;
  if (body.action === 'accept') {
    const sg = body.signer ?? {};
    const name = String(sg.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const document = onlyDigits(String(sg.document ?? ''));
    const email = String(sg.email ?? '').trim().toLowerCase().slice(0, 160) || null;
    const image = String(sg.signature ?? '');
    if (name.split(' ').length < 2) return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 });
    if (!isValidCpf(document)) return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    if (!isPngDataUrl(image)) return NextResponse.json({ error: 'Desenhe sua assinatura.' }, { status: 400 });
    if (sg.agree !== true) return NextResponse.json({ error: 'É preciso concordar com os termos.' }, { status: 400 });
    signer = { name, document, email, image };
  }

  try {
    const budget = await loadBudgetByToken(token);
    if (!budget || budget.proposal_status === 'rascunho') {
      return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
    }
    const { brand, active } = await loadBrand(budget.tenant_id);
    if (!active) return NextResponse.json({ error: 'Proposta indisponível no momento.' }, { status: 404 });
    const view = buildProposalView(budget, brand);
    if (view.status !== 'enviada') {
      const msg =
        view.status === 'expirada'
          ? 'Esta proposta expirou. Solicite uma nova ao buffet.'
          : 'Esta proposta já foi respondida.';
      return NextResponse.json({ error: msg, status: view.status }, { status: 409 });
    }

    const db = adminClient();
    const accepted = body.action === 'accept';
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      proposal_status: accepted ? 'aceita' : 'recusada',
      proposal_responded_at: now,
      client_response_note: note,
    };
    if (signer) {
      const snapshot = toSnapshot(view);
      // o hash amarra o conteúdo aceito, quem assinou, a assinatura e o momento
      const hash = createHash('sha256')
        .update(
          JSON.stringify({
            proposta: snapshot,
            assinante: { nome: signer.name, cpf: signer.document, email: signer.email },
            assinatura: signer.image,
            dataHora: now,
          })
        )
        .digest('hex');
      Object.assign(patch, {
        signer_name: signer.name,
        signer_document: signer.document,
        signer_email: signer.email,
        signature_image: signer.image,
        signed_at: now,
        signer_ip: clientIp(req),
        signer_user_agent: (req.headers.get('user-agent') || '').slice(0, 400) || null,
        signed_content_hash: hash,
        signed_snapshot: snapshot,
      });
    }
    // update condicional: evita resposta dupla em cliques simultâneos
    const { data: upd, error } = await db
      .from('budgets')
      .update(patch)
      .eq('id', budget.id)
      .eq('proposal_status', 'enviada')
      .select('id');
    if (error) throw error;
    if (!upd || upd.length === 0) {
      return NextResponse.json({ error: 'Esta proposta já foi respondida.' }, { status: 409 });
    }

    if (accepted && budget.event) {
      const approvable = ['Orçamento enviado', 'Aguardando aprovação'];
      const evPatch: Record<string, unknown> = { agreed_value: view.total };
      if (approvable.includes(budget.event.status)) evPatch.status = 'Aprovado';
      const { error: evErr } = await db.from('events').update(evPatch).eq('id', budget.event.id);
      if (evErr) throw evErr;
    }

    const fresh = await loadBudgetByToken(token);
    return NextResponse.json(buildProposalView(fresh, brand), noStore);
  } catch (e) {
    console.error('proposal POST', e);
    return NextResponse.json({ error: 'Erro ao registrar resposta.' }, { status: 500 });
  }
}

/** Assinatura desenhada: PNG em data URL, até ~300 KB. */
function isPngDataUrl(v: string): boolean {
  const prefix = 'data:image/png;base64,';
  if (!v.startsWith(prefix) || v.length > 400_000) return false;
  const b64 = v.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) return false;
  const buf = Buffer.from(b64, 'base64');
  return buf.length > 100 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (fwd || req.headers.get('x-real-ip') || '').slice(0, 64) || null;
}
