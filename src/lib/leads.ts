// Regras puras dos leads (sem dependências de React/Supabase) — testáveis em Node.

export const EVENT_TYPES = ['Casamento', 'Aniversário', 'Corporativo', 'Formatura', 'Churrasco', 'Batizado', 'Outros'];

export type LeadStatus = 'novo' | 'em_contato' | 'convertido' | 'perdido';

export const LEAD_STATUS: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: 'Novo', className: 'bg-primary/10 text-primary border-primary/20' },
  em_contato: { label: 'Em contato', className: 'bg-warning/10 text-warning border-warning/20' },
  convertido: { label: 'Convertido', className: 'bg-success/10 text-success border-success/20' },
  perdido: { label: 'Perdido', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

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
