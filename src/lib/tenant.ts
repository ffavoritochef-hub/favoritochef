// Regras puras do multi-empresa (sem dependências de React/Supabase) — testáveis em Node.

export type TenantStatus = 'pendente' | 'ativo' | 'suspenso' | 'recusado';

export interface Tenant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  responsible_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  primary_color: string;
  status: TenantStatus;
  approved_at: string | null;
  approved_by: string | null;
  valid_until: string | null;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type AccessState =
  | 'loading'
  | 'master'
  | 'sem_buffet'
  | 'pendente'
  | 'recusado'
  | 'suspenso'
  | 'expirado'
  | 'ativo';

export const DEFAULT_COLOR = '#2563EB';

export function isExpired(validUntil: string | null | undefined, now: Date = new Date()): boolean {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() <= now.getTime();
}

export function computeAccess(
  tenant: Pick<Tenant, 'status' | 'valid_until'> | null,
  isMaster: boolean,
  now: Date = new Date()
): Exclude<AccessState, 'loading'> {
  if (isMaster) return 'master';
  if (!tenant) return 'sem_buffet';
  if (tenant.status === 'pendente') return 'pendente';
  if (tenant.status === 'recusado') return 'recusado';
  if (tenant.status === 'suspenso') return 'suspenso';
  if (isExpired(tenant.valid_until, now)) return 'expirado';
  return 'ativo';
}

/** Dias restantes (arredondado p/ cima). null = sem prazo. Negativo/0 = vencido. */
export function daysLeft(validUntil: string | null | undefined, now: Date = new Date()): number | null {
  if (!validUntil) return null;
  return Math.ceil((new Date(validUntil).getTime() - now.getTime()) / 86400000);
}

/** Nova validade: soma `days` a partir do maior entre agora e a validade atual. */
export function addDaysFrom(current: string | null | undefined, days: number, now: Date = new Date()): string {
  const base = current && new Date(current).getTime() > now.getTime() ? new Date(current) : new Date(now);
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

/** Fim do dia (local) de uma data yyyy-mm-dd, em ISO. */
export function endOfDayISO(ymd: string): string {
  return new Date(ymd + 'T23:59:59').toISOString();
}

export const DURATION_PRESETS: { label: string; days: number | null }[] = [
  { label: '30 dias', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
  { label: 'Sem prazo', days: null },
];

// ---------- Cores ----------
export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Vermelho', hex: '#DC2626' },
  { name: 'Laranja', hex: '#EA580C' },
  { name: 'Verde', hex: '#16A34A' },
  { name: 'Roxo', hex: '#7C3AED' },
  { name: 'Rosa', hex: '#DB2777' },
  { name: 'Turquesa', hex: '#0D9488' },
  { name: 'Marrom', hex: '#92400E' },
  { name: 'Grafite', hex: '#334155' },
];

export const isHexColor = (v: string | null | undefined): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

function toRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Luminância relativa WCAG (0 = preto, 1 = branco). */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/** A cor precisa ter contraste mínimo com texto branco (botões/menus usam texto branco). */
export function isReadableOnWhiteText(hex: string): boolean {
  return isHexColor(hex) && contrastWithWhite(hex) >= 3;
}

export function darken(hex: string, amount = 0.25): string {
  if (!isHexColor(hex)) return '#1E40AF';
  return toHex(toRgb(hex).map((c) => c * (1 - amount)));
}

/** Cor segura: se inválida/clara demais, volta ao padrão. */
export function safeColor(hex: string | null | undefined): string {
  return isHexColor(hex) && isReadableOnWhiteText(hex) ? hex.toUpperCase() : DEFAULT_COLOR;
}

export function accessMessage(state: AccessState, tenant: Tenant | null): { title: string; text: string } {
  switch (state) {
    case 'pendente':
      return {
        title: 'Cadastro em análise',
        text: 'Recebemos o cadastro do seu buffet. Assim que for aprovado você poderá usar o sistema. Entraremos em contato.',
      };
    case 'recusado':
      return {
        title: 'Cadastro não aprovado',
        text: tenant?.status_reason
          ? `Motivo: ${tenant.status_reason}`
          : 'Seu cadastro não foi aprovado. Entre em contato para mais informações.',
      };
    case 'suspenso':
      return {
        title: 'Acesso suspenso',
        text: tenant?.status_reason
          ? `Motivo: ${tenant.status_reason}`
          : 'O acesso do seu buffet está suspenso. Entre em contato para regularizar.',
      };
    case 'expirado':
      return {
        title: 'Assinatura vencida',
        text: 'O período de acesso do seu buffet terminou. Entre em contato para renovar. Seus dados estão preservados.',
      };
    case 'sem_buffet':
      return {
        title: 'Buffet não encontrado',
        text: 'Esta conta não está vinculada a nenhum buffet. Faça o cadastro do seu buffet ou fale com o suporte.',
      };
    default:
      return { title: '', text: '' };
  }
}
