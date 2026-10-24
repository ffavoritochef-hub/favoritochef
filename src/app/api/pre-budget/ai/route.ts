import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server-supabase';
import { computeAccess } from '@/lib/tenant';
import { rateLimited } from '@/lib/rate-limit';
import { GeminiError, geminiJson } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const money = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? `R$ ${v.toFixed(2).replace('.', ',')}` : '?');

/** Comentário curto da IA sobre o pré-orçamento calculado na tela. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Sessão expirada ou inválida. Saia e entre novamente.' }, { status: 401 });

  const { data: tenant } = await auth.db
    .from('tenants')
    .select('id, name, city, state, status, valid_until')
    .eq('owner_id', auth.user.id)
    .maybeSingle();
  if (!tenant || computeAccess(tenant, false) !== 'ativo') {
    return NextResponse.json({ error: 'Buffet sem acesso ativo.' }, { status: 403 });
  }
  if (rateLimited('pre-budget-ai', tenant.id, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitos pedidos à IA na última hora. Tente mais tarde.' }, { status: 429 });
  }

  const b = await req.json().catch(() => ({}));
  const items: string[] = Array.isArray(b.items) ? b.items.slice(0, 30).map((i: unknown) => clip(i, 120)).filter(Boolean) : [];
  const adjustments: string[] = Array.isArray(b.adjustments) ? b.adjustments.slice(0, 10).map((i: unknown) => clip(i, 120)) : [];
  const guests = Math.max(0, Math.min(10000, Math.floor(Number(b.guests) || 0)));
  const pp = b.perPerson ?? {};
  const place = [tenant.city, tenant.state].filter(Boolean).join(' - ');

  const prompt = `Você é consultor de precificação de buffets de eventos no Brasil.
Buffet: ${tenant.name}${place ? ` (${place})` : ''}
Cardápio: ${clip(b.menu, 120)}
Itens: ${items.join('; ') || 'não informado'}
Convidados: ${guests}
Data: ${clip(b.date, 10) || 'não definida'}
Serviço: ${clip(b.service, 40)} · Bebidas: ${clip(b.drinks, 60)}
Ajustes aplicados: ${adjustments.join('; ') || 'nenhum'}
Faixa calculada por pessoa: mínimo ${money(pp.min)}, sugerido ${money(pp.suggested)}, máximo ${money(pp.max)}

Tarefa: em até 6 frases curtas, em português do Brasil, diga se o valor sugerido parece coerente para esse cardápio e porte,
aponte 2 ou 3 custos que o buffet deve conferir (ex.: proteína mais cara do cardápio, equipe, descartáveis, transporte)
e dê uma dica prática para negociar ou valorizar a proposta. Não invente dados de mercado específicos nem cite fontes.
Não use emojis nem markdown.`;

  try {
    const out = await geminiJson<{ text: string }>(prompt, {
      type: 'OBJECT',
      properties: { text: { type: 'STRING' } },
      required: ['text'],
    });
    const text = clip(out.text, 1500);
    if (!text) throw new GeminiError('A IA não conseguiu responder. Tente de novo.', 502);
    return NextResponse.json({ text });
  } catch (e) {
    if (e instanceof GeminiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('pre-budget ai', e);
    return NextResponse.json({ error: 'Erro ao falar com a IA.' }, { status: 500 });
  }
}
