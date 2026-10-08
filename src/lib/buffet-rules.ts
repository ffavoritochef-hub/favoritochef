/**
 * Regras de negócio do buffet (funções puras, sem dependência de UI/banco).
 */

export const EVENT_STATUSES = [
  'Orçamento enviado',
  'Aguardando aprovação',
  'Aprovado',
  'Em andamento',
  'Finalizado',
  'Cancelado',
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const formatBRL = (value: number) =>
  (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ------------------------------------------------------------------ */
/* 1) Preço por convidado                                              */
/* ------------------------------------------------------------------ */

export interface GuestPricingInput {
  adults: number;
  children: number;
  pricePerAdult: number;
  childDiscountPercent: number; // 0..100
  minTotal: number;
  extras: number; // locação, transporte, taxas etc.
}

export interface GuestPricingResult {
  adultsSubtotal: number;
  childrenSubtotal: number;
  pricePerChild: number;
  guestsSubtotal: number;
  minApplied: boolean;
  extras: number;
  total: number;
}

export function calcGuestPricing(i: GuestPricingInput): GuestPricingResult {
  const adults = Math.max(0, Math.floor(i.adults || 0));
  const children = Math.max(0, Math.floor(i.children || 0));
  const price = Math.max(0, i.pricePerAdult || 0);
  const discount = Math.min(100, Math.max(0, i.childDiscountPercent || 0));
  const extras = Math.max(0, i.extras || 0);
  const minTotal = Math.max(0, i.minTotal || 0);

  const pricePerChild = round2(price * (1 - discount / 100));
  const adultsSubtotal = round2(adults * price);
  const childrenSubtotal = round2(children * pricePerChild);
  const guestsSubtotal = round2(adultsSubtotal + childrenSubtotal);
  const minApplied = guestsSubtotal < minTotal;
  const total = round2(Math.max(guestsSubtotal, minTotal) + extras);

  return {
    adultsSubtotal,
    childrenSubtotal,
    pricePerChild,
    guestsSubtotal,
    minApplied,
    extras,
    total,
  };
}

/** Modo legado: soma dos custos + margem. */
export function calcCostMargin(costs: number[], marginPercent: number) {
  const subtotal = round2(costs.reduce((a, b) => a + (b || 0), 0));
  const total = round2(subtotal * (1 + (marginPercent || 0) / 100));
  return { subtotal, total, profit: round2(total - subtotal) };
}

/** Sinal exigido e saldo. */
export function calcDeposit(total: number, depositPercent: number) {
  const pct = Math.min(100, Math.max(0, depositPercent || 0));
  const deposit = round2(total * (pct / 100));
  return { deposit, balance: round2(total - deposit), percent: pct };
}

/* ------------------------------------------------------------------ */
/* 2) Conflito de agenda                                               */
/* ------------------------------------------------------------------ */

export const SETUP_BUFFER_MINUTES = 120; // montagem/desmontagem entre eventos
const INACTIVE_STATUSES = new Set<string>(['Cancelado', 'Finalizado']);

export interface SchedEvent {
  id?: string;
  name?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM[:SS]
  end_time: string;
  status?: string;
}

const toMinutes = (t: string) => {
  const [h, m] = (t || '0:0').split(':');
  return Number(h) * 60 + Number(m || 0);
};

export interface ConflictResult {
  event: SchedEvent;
  kind: 'sobreposicao' | 'intervalo_curto';
  message: string;
}

/**
 * Compara um evento candidato com os existentes no mesmo dia.
 * Eventos que viram a meia-noite (fim <= início) terminam no dia seguinte.
 */
export function findScheduleConflicts(
  candidate: SchedEvent,
  existing: SchedEvent[],
  bufferMinutes = SETUP_BUFFER_MINUTES
): ConflictResult[] {
  const cs = toMinutes(candidate.start_time);
  let ce = toMinutes(candidate.end_time);
  if (ce <= cs) ce += 24 * 60;

  const out: ConflictResult[] = [];
  for (const ev of existing) {
    if (ev.id && ev.id === candidate.id) continue;
    if (ev.status && INACTIVE_STATUSES.has(ev.status)) continue;
    if (String(ev.date).slice(0, 10) !== String(candidate.date).slice(0, 10)) continue;

    const es = toMinutes(ev.start_time);
    let ee = toMinutes(ev.end_time);
    if (ee <= es) ee += 24 * 60;

    const label = `${ev.name ?? 'Evento'} (${ev.start_time.slice(0, 5)}–${ev.end_time.slice(0, 5)})`;
    if (cs < ee && es < ce) {
      out.push({ event: ev, kind: 'sobreposicao', message: `Horário sobreposto com ${label}.` });
    } else {
      const gap = cs >= ee ? cs - ee : es - ce;
      if (gap < bufferMinutes) {
        out.push({
          event: ev,
          kind: 'intervalo_curto',
          message: `Intervalo de ${gap} min até ${label}; o mínimo para montagem é ${bufferMinutes} min.`,
        });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 3) Fluxo de status e pagamento                                      */
/* ------------------------------------------------------------------ */

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  'Orçamento enviado': ['Aguardando aprovação', 'Aprovado', 'Cancelado'],
  'Aguardando aprovação': ['Orçamento enviado', 'Aprovado', 'Cancelado'],
  Aprovado: ['Em andamento', 'Finalizado', 'Cancelado'],
  'Em andamento': ['Finalizado', 'Cancelado'],
  Finalizado: [],
  Cancelado: ['Orçamento enviado'],
};

export interface TransitionContext {
  agreedValue: number;
  receivedTotal: number; // soma de pagamentos com status Recebido
  depositPercent: number;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

/** Sinal mínimo exigido (valor) para iniciar o evento. */
export function requiredDeposit(ctx: Pick<TransitionContext, 'agreedValue' | 'depositPercent'>) {
  return calcDeposit(ctx.agreedValue, ctx.depositPercent).deposit;
}

export function validateStatusTransition(
  from: string,
  to: string,
  ctx: TransitionContext
): TransitionResult {
  if (from === to) return { allowed: true };
  const f = from as EventStatus;
  const t = to as EventStatus;
  if (!EVENT_STATUSES.includes(t)) return { allowed: false, reason: 'Status inválido.' };
  if (EVENT_STATUSES.includes(f) && !TRANSITIONS[f].includes(t)) {
    return { allowed: false, reason: `Não é possível mudar de "${from}" para "${to}".` };
  }

  if (t === 'Aprovado' && !(ctx.agreedValue > 0)) {
    return { allowed: false, reason: 'Informe o Valor Acordado antes de aprovar o evento.' };
  }

  if (t === 'Em andamento' || t === 'Finalizado') {
    const need = requiredDeposit(ctx);
    if (need > 0 && ctx.receivedTotal + 0.005 < need) {
      return {
        allowed: false,
        reason: `Sinal insuficiente: recebido ${formatBRL(ctx.receivedTotal)} de ${formatBRL(need)} (${ctx.depositPercent}%).`,
      };
    }
  }

  if (t === 'Finalizado' && ctx.agreedValue > 0 && ctx.receivedTotal + 0.005 < ctx.agreedValue) {
    return {
      allowed: true,
      warning: `Ainda há ${formatBRL(ctx.agreedValue - ctx.receivedTotal)} a receber deste evento.`,
    };
  }

  if (t === 'Cancelado' && ctx.receivedTotal > 0) {
    return {
      allowed: true,
      warning: `Já foram recebidos ${formatBRL(ctx.receivedTotal)}. Aplique a política de cancelamento (sinal não reembolsável) antes de confirmar.`,
    };
  }
  return { allowed: true };
}

/* ------------------------------------------------------------------ */
/* 4) Equipe por convidados                                            */
/* ------------------------------------------------------------------ */

export interface StaffSuggestion {
  waiters: number;
  kitchen: number;
  total: number;
}

/** 1 garçom a cada 25 convidados; 1 cozinha a cada 50; mínimo 2 + 1. */
export function suggestStaff(guests: number): StaffSuggestion {
  const g = Math.max(0, Math.floor(guests || 0));
  if (g === 0) return { waiters: 0, kitchen: 0, total: 0 };
  const waiters = Math.max(2, Math.ceil(g / 25));
  const kitchen = Math.max(1, Math.ceil(g / 50));
  return { waiters, kitchen, total: waiters + kitchen };
}

export function staffGap(guests: number, allocated: number) {
  const s = suggestStaff(guests);
  const missing = Math.max(0, s.total - allocated);
  return { ...s, allocated, missing, ok: missing === 0 };
}

/* ------------------------------------------------------------------ */
/* 5) Proposta                                                         */
/* ------------------------------------------------------------------ */

export const PROPOSAL_VALIDITY_DAYS = 7;

export function proposalValidUntil(from = new Date(), days = PROPOSAL_VALIDITY_DAYS) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isProposalExpired(validUntil: string | null | undefined, today = new Date()) {
  if (!validUntil) return false;
  return new Date(validUntil + 'T23:59:59') < today;
}
