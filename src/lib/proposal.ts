import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '@/lib/server-supabase';
import { calcGuestPricing, calcDeposit, isProposalExpired } from '@/lib/buffet-rules';

const BUDGET_SELECT =
  '*, event:events(*, client:clients(name, document, phone, whatsapp)), menu_templates(name, items:menu_template_items(custom_item_name, custom_quantity))';

export async function loadBudgetByToken(token: string) {
  const { data, error } = await adminClient()
    .from('budgets')
    .select(BUDGET_SELECT)
    .eq('proposal_token', token)
    .maybeSingle();
  if (error) throw error;
  return data as any | null;
}

/** Orçamento mais recente do evento. */
export async function loadLatestBudgetByEvent(eventId: string, db?: SupabaseClient) {
  const { data, error } = await (db ?? adminClient())
    .from('budgets')
    .select(BUDGET_SELECT)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as any | null;
}

export interface ProposalView {
  token: string;
  status: 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada';
  validUntil: string | null;
  respondedAt: string | null;
  clientName: string;
  event: { name: string; date: string; start: string; end: string; address: string; guests: number };
  menu: { name: string; items: { name: string; quantity: string }[] };
  lines: { label: string; value: number }[];
  total: number;
  deposit: { percent: number; amount: number; balance: number };
  paymentConditions: string;
}

/** Visão pública: NUNCA inclui custos internos nem margem. */
export function buildProposalView(b: any): ProposalView {
  const ev = b.event ?? {};
  let lines: { label: string; value: number }[] = [];
  let total = Number(b.total_value) || 0;

  if (b.pricing_mode === 'custo_margem') {
    const parts: [string, number][] = [
      ['Alimentos e insumos', Number(b.food_value) || 0],
      ['Bebidas', Number(b.drinks_value) || 0],
      ['Equipe e garçons', Number(b.staff_value) || 0],
      ['Locação e estrutura', Number(b.location_value) || 0],
      ['Transporte e logística', Number(b.transport_value) || 0],
    ];
    const sub = parts.reduce((a, [, v]) => a + v, 0);
    // distribui o total proporcionalmente para não expor a margem
    lines = parts
      .filter(([, v]) => v > 0)
      .map(([label, v]) => ({ label, value: Math.round(((sub > 0 ? v / sub : 0) * total) * 100) / 100 }));
  } else {
    const p = calcGuestPricing({
      adults: b.adult_count,
      children: b.child_count,
      pricePerAdult: Number(b.price_per_adult),
      childDiscountPercent: Number(b.child_discount_percent),
      minTotal: Number(b.min_total),
      extras: Number(b.extras_value),
    });
    if (b.adult_count > 0)
      lines.push({ label: `Adultos (${b.adult_count} × ${fmt(Number(b.price_per_adult))})`, value: p.adultsSubtotal });
    if (b.child_count > 0)
      lines.push({ label: `Crianças (${b.child_count} × ${fmt(p.pricePerChild)})`, value: p.childrenSubtotal });
    if (p.minApplied)
      lines.push({
        label: 'Complemento ao valor mínimo de contratação',
        value: Math.round((Number(b.min_total) - p.guestsSubtotal) * 100) / 100,
      });
    if (p.extras > 0) lines.push({ label: 'Locação, estrutura e logística', value: p.extras });
    total = p.total || total;
  }

  const dep = calcDeposit(total, Number(b.deposit_percent) || 0);
  let status = (b.proposal_status || 'rascunho') as ProposalView['status'];
  if (status === 'enviada' && isProposalExpired(b.proposal_valid_until)) status = 'expirada';

  return {
    token: b.proposal_token,
    status,
    validUntil: b.proposal_valid_until ?? null,
    respondedAt: b.proposal_responded_at ?? null,
    clientName: ev.client?.name ?? '',
    event: {
      name: ev.name ?? '',
      date: ev.date ?? '',
      start: String(ev.start_time ?? '').slice(0, 5),
      end: String(ev.end_time ?? '').slice(0, 5),
      address: ev.address ?? '',
      guests: Number(ev.guest_count) || 0,
    },
    menu: {
      name: b.menu_templates?.name ?? 'Cardápio personalizado',
      items: (b.menu_templates?.items ?? []).map((i: any) => ({
        name: i.custom_item_name,
        quantity: i.custom_quantity,
      })),
    },
    lines,
    total,
    deposit: { percent: dep.percent, amount: dep.deposit, balance: dep.balance },
    paymentConditions: b.payment_conditions || 'A combinar com a gerência do buffet.',
  };
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
