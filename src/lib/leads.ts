// Regras puras dos leads (sem dependências de React/Supabase) — testáveis em Node.

export const EVENT_TYPES = ['Casamento', 'Aniversário', 'Corporativo', 'Formatura', 'Churrasco', 'Batizado', 'Outros'];

export type LeadStatus = 'novo' | 'em_contato' | 'convertido' | 'perdido';

export const LEAD_STATUS: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: 'Novo', className: 'bg-primary/10 text-primary border-primary/20' },
  em_contato: { label: 'Em contato', className: 'bg-warning/10 text-warning border-warning/20' },
  convertido: { label: 'Convertido', className: 'bg-success/10 text-success border-success/20' },
  perdido: { label: 'Perdido', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export type LeadTemperature = 'quente' | 'morno' | 'frio';

export const LEAD_TEMPERATURE: Record<LeadTemperature, { label: string; emoji: string; hint: string; className: string }> = {
  quente: { label: 'Quente', emoji: '🔥', hint: 'Quer muito fechar', className: 'bg-red-50 text-red-600 border-red-200' },
  morno: { label: 'Morno', emoji: '🌤️', hint: 'Interessado, ainda não decidiu', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  frio: { label: 'Frio', emoji: '❄️', hint: 'Só cotando, pouco interesse', className: 'bg-sky-50 text-sky-600 border-sky-200' },
};

export type OfferReaction = 'gostou' | 'indeciso' | 'nao_gostou';

export const OFFER_REACTION: Record<OfferReaction, { label: string; emoji: string; className: string }> = {
  gostou: { label: 'Gostou', emoji: '😍', className: 'bg-success/10 text-success border-success/30' },
  indeciso: { label: 'Indeciso', emoji: '🤔', className: 'bg-warning/10 text-warning border-warning/30' },
  nao_gostou: { label: 'Não gostou', emoji: '👎', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export interface LeadOffer {
  id: string;
  lead_id: string;
  price_per_person: number;
  guests: number | null;
  menu_template_id: string | null;
  description: string | null;
  reaction: OfferReaction | null;
  created_at: string;
}

export type NoteKind = 'nota' | 'whatsapp' | 'ligacao' | 'visita' | 'degustacao';

export const NOTE_KIND: Record<NoteKind, { label: string; emoji: string }> = {
  nota: { label: 'Anotação', emoji: '📝' },
  whatsapp: { label: 'WhatsApp', emoji: '💬' },
  ligacao: { label: 'Ligação', emoji: '📞' },
  visita: { label: 'Visita', emoji: '🏠' },
  degustacao: { label: 'Degustação', emoji: '🍽️' },
};

export interface LeadNote {
  id: string;
  lead_id: string;
  kind: NoteKind;
  body: string;
  created_at: string;
}

export const LOST_REASONS = ['Preço', 'Fechou com outro buffet', 'Data indisponível', 'Desistiu do evento', 'Não respondeu', 'Outro'];

/** Valor total estimado da oferta (preço por pessoa × convidados). */
export const offerTotal = (o: Pick<LeadOffer, 'price_per_person' | 'guests'>) =>
  o.guests ? Math.round(Number(o.price_per_person) * o.guests * 100) / 100 : null;

/** Diferença para a oferta anterior (valor e %). */
export function offerDelta(prev: number | null | undefined, curr: number): { diff: number; pct: number } | null {
  if (!prev || !(prev > 0)) return null;
  const diff = Math.round((curr - prev) * 100) / 100;
  return { diff, pct: Math.round((diff / prev) * 1000) / 10 };
}

/** Situação do próximo contato em relação a hoje (datas yyyy-mm-dd). */
export function followUpState(date: string | null | undefined, todayIso: string): 'atrasado' | 'hoje' | 'futuro' | null {
  if (!date) return null;
  if (date < todayIso) return 'atrasado';
  if (date === todayIso) return 'hoje';
  return 'futuro';
}

export const localTodayIso = (d: Date = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Converte "140,00" / "1.250,50" / "140.5" em número. */
export function parseMoney(v: string): number {
  const s = v.trim().replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  const thousandsOnly = /^\d{1,3}(\.\d{3})+$/.test(s); // "1.250" = mil duzentos e cinquenta
  const normalized = s.includes(',') || thousandsOnly ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(normalized);
}

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  event_date: string | null;
  event_type: string | null;
  guests: number | null;
  notes: string | null;
  source: string;
  status: LeadStatus;
  client_id: string | null;
  temperature: LeadTemperature | null;
  menu_template_id: string | null;
  next_contact_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInput {
  name: string;
  phone: string;
  event_date: string | null;
  event_type: string | null;
  guests: number | null;
  notes: string | null;
}

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** Valida e normaliza o formulário público. Devolve o lead ou a mensagem de erro. */
export function parseLeadInput(body: Record<string, unknown>, today: Date = new Date()): { lead: LeadInput } | { error: string } {
  const name = str(body.name, 120);
  if (name.length < 2) return { error: 'Informe seu nome.' };

  const phone = str(body.phone, 30);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return { error: 'Informe um WhatsApp válido com DDD.' };

  let event_date: string | null = str(body.event_date, 10) || null;
  if (event_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date) || Number.isNaN(Date.parse(event_date + 'T12:00:00'))) {
      return { error: 'Data do evento inválida.' };
    }
    const todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (event_date < todayIso) return { error: 'A data do evento já passou.' };
  } else {
    event_date = null;
  }

  const typeRaw = str(body.event_type, 40);
  const event_type = typeRaw ? (EVENT_TYPES.includes(typeRaw) ? typeRaw : 'Outros') : null;

  let guests: number | null = null;
  const guestsRaw = str(body.guests, 10);
  if (guestsRaw) {
    guests = Number(guestsRaw);
    if (!Number.isInteger(guests) || guests < 1 || guests > 100000) return { error: 'Número de convidados inválido.' };
  }

  const notes = str(body.notes, 1000) || null;

  return { lead: { name, phone, event_date, event_type, guests, notes } };
}

/** Origem do lead vinda da URL (?origem=instagram). */
export function normalizeSource(v: unknown): string {
  const s = String(v ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
  return s || 'link';
}

/** Link wa.me (assume Brasil quando vier só DDD + número). */
export function whatsappUrl(phone: string | null | undefined, text?: string): string | null {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (d.length < 10) return null;
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Mesma regra do banco (public.slugify) para pré-visualizar o link. */
export function slugify(txt: string): string {
  return txt
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export const isValidSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 60;
