import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '@/lib/server-supabase';
import { DEFAULT_COLOR, computeAccess, safeColor } from '@/lib/tenant';
import { calcGuestPricing, calcDeposit, cleanExtraItems, isProposalExpired, sumExtraItems } from '@/lib/buffet-rules';
import { maskCpf } from '@/lib/cpf';
import { normalizeShowcase } from '@/lib/showcase';

const BUDGET_SELECT =
  '*, event:events(*, client:clients(name, document, phone, whatsapp), installments:event_installments(description, due_date, percent, amount)), menu_templates(name, items:menu_template_items(custom_item_name, custom_quantity, section, position))';

const GALLERY_MAX = 6;

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

export interface ProposalBrand {
  name: string;
  logoUrl: string | null;
  color: string;
  /** Campos abaixo não existem em propostas assinadas antes da 0013. */
  tagline?: string;
  document?: string | null;
  phone?: string | null;
  instagram?: string;
  /** Fotos da galeria da vitrine. */
  gallery?: string[];
}

export const DEFAULT_BRAND: ProposalBrand = { name: 'Buffet', logoUrl: null, color: DEFAULT_COLOR };

/** Carrega a marca do buffet. `active` = buffet aprovado e dentro do prazo. */
export async function loadBrand(tenantId: string | null | undefined, db?: SupabaseClient): Promise<{ brand: ProposalBrand; active: boolean }> {
  if (!tenantId) return { brand: DEFAULT_BRAND, active: false };
  const client = db ?? adminClient();
  const [{ data }, { data: showcase }] = await Promise.all([
    client
      .from('tenants')
      .select('name, logo_url, primary_color, status, valid_until, document, phone')
      .eq('id', tenantId)
      .maybeSingle(),
    client.from('tenant_showcase').select('content').eq('tenant_id', tenantId).maybeSingle(),
  ]);
  if (!data) return { brand: DEFAULT_BRAND, active: false };
  const content = showcase ? normalizeShowcase(showcase.content, data.name) : null;
  return {
    brand: {
      name: data.name || 'Buffet',
      logoUrl: data.logo_url ?? null,
      color: safeColor(data.primary_color),
      tagline: content?.hero.subtitle || '',
      document: data.document ?? null,
      phone: data.phone ?? null,
      instagram: content?.contact.instagram || '',
      gallery: (content?.gallery ?? []).map((g) => g.url).slice(0, GALLERY_MAX),
    },
    active: computeAccess({ status: data.status, valid_until: data.valid_until }, false) === 'ativo',
  };
}

export interface ProposalView {
  brand: ProposalBrand;
  token: string;
  status: 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada';
  validUntil: string | null;
  respondedAt: string | null;
  clientName: string;
  event: { name: string; type?: string; date: string; start: string; end: string; address: string; guests: number };
  menu: { name: string; items: { name: string; quantity: string; section?: string }[] };
  lines: { label: string; value: number }[];
  total: number;
  deposit: { percent: number; amount: number; balance: number };
  paymentConditions: string;
  terms: string[];
  /** Campos abaixo não existem em propostas assinadas antes da 0013. */
  coverMessage?: string;
  included?: string[];
  notes?: string[];
  /** Parcelas combinadas (cronograma do evento). Vazio = vale o sinal. */
  installments?: { description: string; dueDate: string; percent: number | null; amount: number }[];
  /** Presente quando a proposta foi assinada eletronicamente. */
  signature: { name: string; document: string; signedAt: string; code: string } | null;
}

/** Evidências completas da assinatura (só para o PDF; nunca no JSON público). */
export interface SignatureEvidence {
  name: string;
  document: string;
  email: string | null;
  image: string | null;
  signedAt: string;
  ip: string | null;
  userAgent: string | null;
  hash: string;
}

/** Conteúdo congelado no aceite: tudo da proposta, sem status/resposta/assinatura. */
export type ProposalSnapshot = Omit<ProposalView, 'token' | 'status' | 'respondedAt' | 'signature'>;

export function toSnapshot(v: ProposalView): ProposalSnapshot {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token, status, respondedAt, signature, ...rest } = v;
  return rest;
}

/** Código curto de verificação exibido ao cliente (início do hash). */
export const signatureCode = (hash: string) => String(hash || '').slice(0, 12).toUpperCase();

export function signatureEvidence(b: any): SignatureEvidence | null {
  if (!b?.signed_at || !b.signer_name) return null;
  return {
    name: b.signer_name,
    document: b.signer_document ?? '',
    email: b.signer_email ?? null,
    image: b.signature_image ?? null,
    signedAt: b.signed_at,
    ip: b.signer_ip ?? null,
    userAgent: b.signer_user_agent ?? null,
    hash: b.signed_content_hash ?? '',
  };
}

export function proposalTerms(validUntil: string | null): string[] {
  const until = validUntil ? new Date(validUntil + 'T12:00:00').toLocaleDateString('pt-BR') : 'a data informada pelo buffet';
  return [
    'A data só é reservada após o pagamento do sinal.',
    'Em caso de cancelamento, o sinal não é reembolsável.',
    'O número final de convidados deve ser confirmado até 7 dias antes do evento.',
    `Proposta válida até ${until}.`,
  ];
}

/** Visão pública: NUNCA inclui custos internos nem margem. */
export function buildProposalView(b: any, brand: ProposalBrand = DEFAULT_BRAND): ProposalView {
  const sig = signatureEvidence(b);
  // assinada: devolve exatamente o que o cliente aceitou, mesmo que o orçamento mude depois
  if (sig && b.signed_snapshot) {
    return {
      ...(b.signed_snapshot as ProposalSnapshot),
      token: b.proposal_token,
      status: 'aceita',
      respondedAt: b.proposal_responded_at ?? sig.signedAt,
      signature: { name: sig.name, document: maskCpf(sig.document), signedAt: sig.signedAt, code: signatureCode(sig.hash) },
    };
  }

  const ev = b.event ?? {};
  let lines: { label: string; value: number }[] = [];
  let total = Number(b.total_value) || 0;
  const extraItems = cleanExtraItems(b.extra_items);
  const extraSum = sumExtraItems(extraItems);

  if (b.pricing_mode === 'custo_margem') {
    const parts: [string, number][] = [
      ['Alimentos e insumos', Number(b.food_value) || 0],
      ['Bebidas', Number(b.drinks_value) || 0],
      ['Equipe e garçons', Number(b.staff_value) || 0],
      ['Locação e estrutura', Number(b.location_value) || 0],
      ['Transporte e logística', Number(b.transport_value) || 0],
    ];
    const sub = parts.reduce((a, [, v]) => a + v, 0);
    const base = Math.max(0, total - extraSum);
    // distribui o total proporcionalmente para não expor a margem
    lines = parts
      .filter(([, v]) => v > 0)
      .map(([label, v]) => ({ label, value: Math.round(((sub > 0 ? v / sub : 0) * base) * 100) / 100 }));
  } else {
    const p = calcGuestPricing({
      adults: b.adult_count,
      children: b.child_count,
      pricePerAdult: Number(b.price_per_adult),
      childDiscountPercent: Number(b.child_discount_percent),
      minTotal: Number(b.min_total),
      extras: (Number(b.extras_value) || 0) + extraSum,
      discountPerPerson: Number(b.discount_per_person) || 0,
    });
    if (b.adult_count > 0)
      lines.push({ label: `Adultos (${b.adult_count} × ${fmt(Number(b.price_per_adult))})`, value: p.adultsSubtotal });
    if (b.child_count > 0)
      lines.push({ label: `Crianças (${b.child_count} × ${fmt(p.pricePerChild)})`, value: p.childrenSubtotal });
    if (p.discount > 0) {
      const people = (Number(b.adult_count) || 0) + (Number(b.child_count) || 0);
      const reason = String(b.discount_label || '').trim();
      lines.push({
        label: `Desconto${reason ? ` (${reason})` : ''}: ${fmt(Number(b.discount_per_person))} × ${people} pessoas`,
        value: -p.discount,
      });
    }
    if (p.minApplied)
      lines.push({
        label: 'Complemento ao valor mínimo de contratação',
        value: Math.round((Number(b.min_total) - (p.guestsSubtotal - p.discount)) * 100) / 100,
      });
    if (Number(b.extras_value) > 0) lines.push({ label: 'Locação, estrutura e logística', value: Number(b.extras_value) });
    total = p.total || total;
  }
  lines.push(...extraItems);

  const dep = calcDeposit(total, Number(b.deposit_percent) || 0);
  let status = (b.proposal_status || 'rascunho') as ProposalView['status'];
  if (status === 'enviada' && isProposalExpired(b.proposal_valid_until)) status = 'expirada';

  return {
    brand,
    token: b.proposal_token,
    status,
    validUntil: b.proposal_valid_until ?? null,
    respondedAt: b.proposal_responded_at ?? null,
    clientName: ev.client?.name ?? '',
    event: {
      name: ev.name ?? '',
      type: ev.type ?? '',
      date: ev.date ?? '',
      start: String(ev.start_time ?? '').slice(0, 5),
      end: String(ev.end_time ?? '').slice(0, 5),
      address: ev.address ?? '',
      guests: Number(ev.guest_count) || 0,
    },
    menu: {
      name: b.menu_templates?.name ?? 'Cardápio personalizado',
      items: [...(b.menu_templates?.items ?? [])]
        .sort((x: any, y: any) => (Number(x.position) || 0) - (Number(y.position) || 0))
        .map((i: any) => ({
          name: i.custom_item_name,
          quantity: i.custom_quantity ?? '',
          section: i.section ?? '',
        })),
    },
    lines,
    total,
    deposit: { percent: dep.percent, amount: dep.deposit, balance: dep.balance },
    paymentConditions: b.payment_conditions || 'A combinar com a gerência do buffet.',
    terms: proposalTerms(b.proposal_valid_until ?? null),
    coverMessage: renderCoverMessage(b.cover_message, ev.client?.name ?? ''),
    included: splitLines(b.included_items),
    notes: splitLines(b.proposal_notes),
    installments: [...(ev.installments ?? [])]
      .sort((x: any, y: any) => String(x.due_date).localeCompare(String(y.due_date)))
      .map((i: any) => ({
        description: i.description || 'Parcela',
        dueDate: i.due_date,
        percent: i.percent == null ? null : Number(i.percent),
        amount: Number(i.amount) || 0,
      })),
    signature: null,
  };
}

const splitLines = (v: unknown) =>
  String(v ?? '')
    .split('\n')
    .map((l) => l.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean);

/** {cliente} vira o nome do cliente. */
export function renderCoverMessage(template: unknown, clientName: string) {
  return String(template ?? '').replaceAll('{cliente}', clientName || 'cliente').trim();
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
