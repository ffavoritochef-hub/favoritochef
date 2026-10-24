// Pré-orçamento: estimativa de quanto cobrar por pessoa (funções puras).
// Base = faixa de mercado do cardápio (menu-library) ou o preço que o buffet cadastrou no cardápio.

import { suggestStaff } from '@/lib/buffet-rules';

export type ServiceLevel = 'simples' | 'padrao' | 'completo';
export type DrinksOption = 'nenhuma' | 'nao_alcoolicas' | 'open_bar';

export const SERVICE_LEVELS: Record<ServiceLevel, { label: string; hint: string; factor: number }> = {
  simples: { label: 'Simples', hint: 'Self-service, descartáveis, equipe mínima', factor: 0.85 },
  padrao: { label: 'Padrão', hint: 'Buffet com louça e garçons', factor: 1 },
  completo: { label: 'Completo', hint: 'Mesa posta, serviço volante, mais equipe', factor: 1.2 },
};

export const DRINKS: Record<DrinksOption, { label: string; min: number; max: number }> = {
  nenhuma: { label: 'Sem bebidas', min: 0, max: 0 },
  nao_alcoolicas: { label: 'Refrigerante, suco e água', min: 12, max: 20 },
  open_bar: { label: 'Open bar (cerveja e drinks)', min: 50, max: 100 },
};

/** Faixa genérica quando o cardápio não tem referência. */
export const GENERIC_RANGE = { min: 50, max: 100 };

/** Fontes que embasam as faixas (mostradas na tela). */
export const PRICE_SOURCES = [
  { label: 'GetNinjas — preço de buffet completo', url: 'https://www.getninjas.com.br/eventos/buffet-completo/preco/contratar-buffet' },
  { label: 'Cronoshare — buffet de churrasco (R$ 50 a R$ 85 por pessoa)', url: 'https://www.cronoshare.com.br/servicos/buffet-de-churrasco/mato-grosso/cuiaba' },
  { label: 'meutudo — quanto custa um buffet de casamento (R$ 80 a R$ 300)', url: 'https://meutudo.com.br/blog/quanto-custa-um-buffet-de-casamento/' },
  { label: 'Revista Oeste — festas infantis R$ 50 a R$ 150 por pessoa', url: 'https://revistaoeste.com/oestegeral/?p=84317' },
  { label: 'Plusdin — open bar pode somar R$ 50 a R$ 100 por pessoa', url: 'https://plusdin.com.br/quanto-custa-um-casamento-para-150-pessoas/' },
];

export interface PreBudgetInput {
  guests: number;
  date: string; // YYYY-MM-DD
  base: { min: number; max: number };
  /** Preço que o buffet já pratica para este cardápio (ancora a sugestão). */
  ownPrice?: number | null;
  service: ServiceLevel;
  drinks: DrinksOption;
  today?: Date;
}

export interface Adjustment {
  label: string;
  percent: number;
}

export interface PreBudgetResult {
  perPerson: { min: number; suggested: number; max: number };
  total: { min: number; suggested: number; max: number };
  drinksPerPerson: { min: number; max: number };
  adjustments: Adjustment[];
  staff: { waiters: number; kitchen: number; total: number };
  daysUntil: number | null;
}

const round = (n: number) => Math.round(n * 100) / 100;
/** Arredonda para cima em múltiplos de R$ 0,50 (preço "de tabela"). */
const nice = (n: number) => Math.ceil(Math.round(n * 200) / 100) / 2;

export function guestAdjustment(guests: number): Adjustment | null {
  if (guests <= 0) return null;
  if (guests < 30) return { label: 'Evento pequeno (menos de 30 pessoas)', percent: 20 };
  if (guests < 60) return { label: 'Até 60 pessoas', percent: 10 };
  if (guests >= 300) return { label: 'Grande volume (300+ pessoas)', percent: -10 };
  if (guests >= 150) return { label: 'Volume alto (150+ pessoas)', percent: -5 };
  return null;
}

export function dateAdjustments(date: string, today = new Date()): { list: Adjustment[]; daysUntil: number | null } {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00') : null;
  if (!d || Number.isNaN(d.getTime())) return { list: [], daysUntil: null };
  const list: Adjustment[] = [];
  const dow = d.getDay();
  if (dow === 6) list.push({ label: 'Sábado (dia mais procurado)', percent: 10 });
  else if (dow === 5 || dow === 0) list.push({ label: dow === 5 ? 'Sexta-feira' : 'Domingo', percent: 5 });
  else list.push({ label: 'Dia de semana', percent: -5 });
  if (d.getMonth() === 11) list.push({ label: 'Dezembro (alta temporada de festas)', percent: 10 });
  const t = new Date(today);
  t.setHours(12, 0, 0, 0);
  const daysUntil = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (daysUntil >= 0 && daysUntil < 15) list.push({ label: 'Em cima da hora (menos de 15 dias)', percent: 10 });
  return { list, daysUntil };
}

export function calcPreBudget(i: PreBudgetInput): PreBudgetResult {
  const guests = Math.max(0, Math.floor(i.guests || 0));
  const svc = SERVICE_LEVELS[i.service] ?? SERVICE_LEVELS.padrao;
  const drinks = DRINKS[i.drinks] ?? DRINKS.nenhuma;

  const adjustments: Adjustment[] = [];
  if (svc.factor !== 1) adjustments.push({ label: `Serviço ${svc.label.toLowerCase()}`, percent: Math.round((svc.factor - 1) * 100) });
  const g = guestAdjustment(guests);
  if (g) adjustments.push(g);
  const { list, daysUntil } = dateAdjustments(i.date, i.today);
  adjustments.push(...list);

  const factor = adjustments.reduce((f, a) => f * (1 + a.percent / 100), 1);
  const baseMin = Math.max(0, i.base.min);
  const baseMax = Math.max(baseMin, i.base.max);
  const own = i.ownPrice && i.ownPrice > 0 ? i.ownPrice : null;
  // com preço próprio, a sugestão parte dele; senão, do meio da faixa de mercado
  const anchor = own ?? (baseMin + baseMax) / 2;

  const min = nice(baseMin * factor + drinks.min);
  const max = nice(baseMax * factor + drinks.max);
  const suggested = nice(anchor * factor + (drinks.min + drinks.max) / 2);

  return {
    perPerson: { min, suggested, max: Math.max(max, suggested) },
    total: {
      min: round(min * guests),
      suggested: round(suggested * guests),
      max: round(Math.max(max, suggested) * guests),
    },
    drinksPerPerson: { min: drinks.min, max: drinks.max },
    adjustments,
    staff: suggestStaff(guests),
    daysUntil,
  };
}
