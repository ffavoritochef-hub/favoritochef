/**
 * Validação e montagem dos dados do formulário de evento (novo e editar).
 * Funções puras: sem React e sem banco, para dar para testar em Node.
 */
import { EVENT_STATUSES } from './buffet-rules';

export interface EventFormData {
  name: string;
  client_id: string;
  type: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM[:SS]
  end_time: string;
  address: string;
  guest_count: number;
  observations: string;
  status: string;
  agreed_value: number;
}

export type EventField = keyof EventFormData;
export type EventFormErrors = Partial<Record<EventField, string>>;

export const EVENT_LIMITS = {
  name: 120,
  type: 40,
  address: 300,
  observations: 4000,
  guests: 100_000,
  value: 100_000_000,
  minYear: 2000,
  maxYear: 2100,
} as const;

/** Ordem em que os campos aparecem na tela (o primeiro com erro recebe o foco). */
export const EVENT_FIELD_ORDER: EventField[] = [
  'client_id', 'name', 'type', 'status', 'agreed_value', 'date', 'start_time', 'end_time',
  'address', 'guest_count', 'observations',
];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?$/;

export function isValidDate(v: string): boolean {
  const m = DATE_RE.exec(v || '');
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < EVENT_LIMITS.minYear || y > EVENT_LIMITS.maxYear) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export const isValidTime = (v: string) => TIME_RE.test(v || '');

/** "HH:MM:SS" do banco vira "HH:MM" (o que o campo de hora mostra e grava). */
export function normalizeTime(v: string | null | undefined): string {
  const m = TIME_RE.exec(String(v ?? '').trim());
  return m ? `${m[1]}:${m[2]}` : '';
}

/** Valor para mostrar no campo: 1500.5 -> "1500,50"; zero -> "". */
export const formatDecimalInput = (n: number) =>
  Number.isFinite(n) && n > 0 ? n.toFixed(2).replace('.', ',') : '';

/**
 * Número digitado (aceita "1.234,56", "1500,50", "1234.56" e "1.500" = mil e quinhentos);
 * vazio/inválido vira NaN.
 */
export function parseDecimal(v: unknown): number {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim().replace(/\s|R\$/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

export interface EventValidation {
  errors: EventFormErrors;
  /** Avisos que não impedem salvar. */
  warnings: string[];
  ok: boolean;
  firstField?: EventField;
  firstMessage?: string;
}

export function validateEventForm(f: EventFormData): EventValidation {
  const e: EventFormErrors = {};
  const warnings: string[] = [];

  if (!f.client_id) e.client_id = 'Selecione o cliente do evento.';

  const name = (f.name || '').trim();
  if (!name) e.name = 'Informe o nome do evento.';
  else if (name.length < 3) e.name = 'O nome do evento precisa ter pelo menos 3 letras.';
  else if (name.length > EVENT_LIMITS.name) e.name = `Nome muito longo (máximo ${EVENT_LIMITS.name} caracteres).`;

  // tipo antigo (fora da lista atual) continua aceito
  if ((f.type || '').length > EVENT_LIMITS.type) e.type = 'Tipo de evento inválido.';

  if (!EVENT_STATUSES.includes(f.status as (typeof EVENT_STATUSES)[number])) e.status = 'Selecione um status válido.';

  if (!f.date) e.date = 'Informe a data do evento.';
  else if (!isValidDate(f.date)) e.date = `Data inválida. Confira dia, mês e ano (entre ${EVENT_LIMITS.minYear} e ${EVENT_LIMITS.maxYear}).`;

  if (!f.start_time) e.start_time = 'Informe o horário de início.';
  else if (!isValidTime(f.start_time)) e.start_time = 'Horário de início inválido.';
  if (!f.end_time) e.end_time = 'Informe o horário de término.';
  else if (!isValidTime(f.end_time)) e.end_time = 'Horário de término inválido.';

  if (!e.start_time && !e.end_time) {
    const s = normalizeTime(f.start_time);
    const t = normalizeTime(f.end_time);
    if (s === t) e.end_time = 'O término precisa ser diferente do início.';
    else if (t < s) warnings.push(`O evento termina no dia seguinte (${s} até ${t}).`);
  }

  const guests = Number(f.guest_count);
  if (!Number.isFinite(guests) || guests < 0) e.guest_count = 'Quantidade de convidados inválida.';
  else if (!Number.isInteger(guests)) e.guest_count = 'Use um número inteiro de convidados.';
  else if (guests > EVENT_LIMITS.guests) e.guest_count = `Quantidade muito alta (máximo ${EVENT_LIMITS.guests.toLocaleString('pt-BR')}).`;

  const value = Number(f.agreed_value);
  if (!Number.isFinite(value) || value < 0) e.agreed_value = 'Valor fechado inválido.';
  else if (value > EVENT_LIMITS.value) e.agreed_value = 'Valor fechado muito alto. Confira os zeros.';
  else if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) e.agreed_value = 'Use no máximo 2 casas decimais.';

  if ((f.address || '').trim().length > EVENT_LIMITS.address) e.address = `Endereço muito longo (máximo ${EVENT_LIMITS.address} caracteres).`;
  if ((f.observations || '').trim().length > EVENT_LIMITS.observations) {
    e.observations = `Observações muito longas (máximo ${EVENT_LIMITS.observations} caracteres).`;
  }

  const firstField = EVENT_FIELD_ORDER.find((k) => e[k]);
  return { errors: e, warnings, ok: !firstField, firstField, firstMessage: firstField ? e[firstField] : undefined };
}

/** Dados prontos para gravar em `events` (só as colunas do formulário). */
export function buildEventPayload(f: EventFormData) {
  return {
    name: f.name.trim(),
    client_id: f.client_id,
    type: f.type || null,
    date: f.date,
    start_time: normalizeTime(f.start_time),
    end_time: normalizeTime(f.end_time),
    address: f.address.trim() || null,
    guest_count: Math.max(0, Math.floor(Number(f.guest_count) || 0)),
    observations: f.observations.trim() || null,
    status: f.status,
    agreed_value: Math.round(Math.max(0, Number(f.agreed_value) || 0) * 100) / 100,
  };
}

/** Mensagem para o usuário: erro do banco é traduzido; erro nosso (new Error) passa como está. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && !(err as { code?: string }).code) {
    return /failed to fetch|load failed|network/i.test(err.message) ? friendlyDbError(err) : err.message;
  }
  return friendlyDbError(err);
}

/** Traduz erros do banco/rede para mensagens que o usuário entende. */
export function friendlyDbError(err: unknown): string {
  const er = (err ?? {}) as { code?: string; message?: string; details?: string };
  const msg = String(er.message || err || '');
  switch (er.code) {
    case '23503':
      return 'O cliente ou um funcionário escolhido não existe mais. Recarregue a página e escolha de novo.';
    case '23505':
      return 'Já existe um registro igual a este. Recarregue a página e confira.';
    case '23502':
      return 'Falta preencher um campo obrigatório.';
    case '22007':
    case '22008':
      return 'Data ou horário inválido.';
    case '22003':
      return 'Um dos números informados é grande demais.';
    case '22001':
      return 'Um dos textos está longo demais.';
    case '42501':
    case 'PGRST301':
      return 'Sem permissão para salvar. Verifique se o acesso do buffet está ativo ou entre de novo.';
    case 'PGRST116':
      return 'Evento não encontrado. Ele pode ter sido excluído.';
  }
  if (/failed to fetch|network|load failed|fetch failed/i.test(msg)) {
    return 'Sem conexão com a internet. Verifique a rede e tente de novo.';
  }
  if (/jwt|token.*expired|not authenticated/i.test(msg)) return 'Sua sessão expirou. Entre de novo no sistema.';
  return msg || 'Erro inesperado. Tente de novo.';
}
