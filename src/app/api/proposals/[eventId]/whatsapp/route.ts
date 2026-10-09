import { NextResponse } from 'next/server';
import { isUuid, publicBaseUrl, requireUser } from '@/lib/server-supabase';
import { loadLatestBudgetByEvent } from '@/lib/proposal';

export const dynamic = 'force-dynamic';

/** Mantida por compatibilidade: agora exige login. Use POST /send para enviar a proposta. */
export async function GET(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Sessão expirada ou inválida. Saia e entre novamente.' }, { status: 401 });
  const { eventId } = await params;
  if (!isUuid(eventId)) return NextResponse.json({ link: null }, { status: 400 });
  try {
    const b = await loadLatestBudgetByEvent(eventId, auth.db);
    const client = b?.event?.client;
    const phone = String(client?.whatsapp || client?.phone || '').replace(/\D/g, '');
    if (!b || !phone) return NextResponse.json({ link: null });
    const to = phone.length <= 11 && !phone.startsWith('55') ? '55' + phone : phone;
    const url = `${publicBaseUrl(req)}/proposta/${b.proposal_token}`;
    const text = `Olá ${client.name}, segue a proposta do evento ${b.event.name}: ${url}`;
    return NextResponse.json({ link: `https://wa.me/${to}?text=${encodeURIComponent(text)}` });
  } catch (e) {
    console.error('whatsapp', e);
    return NextResponse.json({ link: null, error: 'Erro ao gerar link.' }, { status: 500 });
  }
}
