import { NextResponse } from 'next/server';
import { requireUser, userTenant } from '@/lib/server-supabase';
import { computeAccess } from '@/lib/tenant';
import { rateLimited } from '@/lib/rate-limit';
import { GeminiError, geminiJson } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, max: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    ingredients: {
      type: 'ARRAY',
      description: 'Lista de compras para o evento inteiro',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Ingrediente/insumo, nome simples (ex.: Picanha, Arroz tipo 1, Feijão preto)' },
          unit: { type: 'STRING', description: 'kg, L, un, dz ou pct' },
          quantity: { type: 'NUMBER', description: 'Quantidade total para o evento, já com margem de segurança' },
          unitPrice: { type: 'NUMBER', description: 'Preço estimado em reais por unidade, no atacado/atacarejo' },
        },
        required: ['name', 'unit', 'quantity', 'unitPrice'],
      },
    },
    disposablesPerPerson: { type: 'NUMBER', description: 'Custo por pessoa com descartáveis, guardanapos, gás e material de limpeza' },
    notes: { type: 'STRING', description: 'Até 2 frases com observações importantes sobre a estimativa' },
  },
  required: ['ingredients', 'disposablesPerPerson', 'notes'],
};

/** Lista de compras e custo dos ingredientes de um cardápio, estimados pela IA. */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Sessão expirada ou inválida. Saia e entre novamente.' }, { status: 401 });

  const tenant = await userTenant(auth.db, 'pre_orcamento');
  if (tenant === 'forbidden') return NextResponse.json({ error: 'Você não tem acesso a esta área.' }, { status: 403 });
  if (!tenant || computeAccess(tenant, false) !== 'ativo') {
    return NextResponse.json({ error: 'Buffet sem acesso ativo.' }, { status: 403 });
  }
  if (rateLimited('pre-budget-cost', tenant.id, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitos pedidos à IA na última hora. Tente mais tarde.' }, { status: 429 });
  }

  const b = await req.json().catch(() => ({}));
  const guests = Math.floor(num(b.guests, 5000));
  if (guests < 1) return NextResponse.json({ error: 'Informe o número de pessoas.' }, { status: 400 });
  const items: { name: string; quantity: string }[] = (Array.isArray(b.items) ? b.items : [])
    .slice(0, 40)
    .map((i: { name?: unknown; quantity?: unknown }) => ({ name: clip(i?.name, 160), quantity: clip(i?.quantity, 60) }))
    .filter((i: { name: string }) => i.name);
  if (!items.length) return NextResponse.json({ error: 'O cardápio não tem itens.' }, { status: 400 });
  const place = [tenant.city, tenant.state].filter(Boolean).join(' - ') || 'Brasil';
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const prompt = `Você é comprador experiente de um buffet de eventos no Brasil.
Cidade do buffet: ${place}. Mês de referência: ${month}.
Cardápio: ${clip(b.menu, 120)}
Convidados: ${guests}
Itens do cardápio (com quantidade por pessoa quando informada):
${items.map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n')}

Tarefa: monte a lista de compras de ingredientes para o evento inteiro.
- Quebre os pratos em ingredientes principais (carnes, grãos, laticínios, hortifrúti) e agrupe temperos em "Temperos e condimentos".
- Use as quantidades por pessoa informadas; quando faltarem, use porções padrão de buffet.
- Inclua de 5% a 10% de margem de segurança nas quantidades.
- unitPrice = preço médio atual estimado no atacado/atacarejo da região, em reais.
- Só inclua bebidas se estiverem no cardápio.
- Seja realista: não exagere nem subestime.
Responda em português do Brasil.`;

  try {
    const out = await geminiJson<{
      ingredients: { name: string; unit: string; quantity: number; unitPrice: number }[];
      disposablesPerPerson: number;
      notes: string;
    }>(prompt, SCHEMA);
    const ingredients = (Array.isArray(out.ingredients) ? out.ingredients : [])
      .map((i) => ({
        name: clip(i.name, 80),
        unit: clip(i.unit, 8) || 'un',
        quantity: Math.round(num(i.quantity, 100000) * 100) / 100,
        unitPrice: Math.round(num(i.unitPrice, 10000) * 100) / 100,
      }))
      .filter((i) => i.name && i.quantity > 0)
      .slice(0, 60);
    if (!ingredients.length) throw new GeminiError('A IA não conseguiu montar a lista. Tente de novo.', 502);
    return NextResponse.json({
      ingredients,
      disposablesPerPerson: Math.round(num(out.disposablesPerPerson, 100) * 100) / 100,
      notes: clip(out.notes, 400),
    });
  } catch (e) {
    if (e instanceof GeminiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('pre-budget cost', e);
    return NextResponse.json({ error: 'Erro ao falar com a IA.' }, { status: 500 });
  }
}
