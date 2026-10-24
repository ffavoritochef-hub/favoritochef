// Papéis e permissões dos usuários de um buffet (funções puras, testáveis em Node).

export type MemberRole = 'admin' | 'usuario';
/** owner = dono do buffet (sempre admin); none = sem vínculo. */
export type UserRole = 'owner' | MemberRole | 'none';

export const PERMISSIONS = [
  { key: 'leads', label: 'Leads', hint: 'Pedidos de orçamento recebidos' },
  { key: 'clientes', label: 'Clientes', hint: 'Cadastro de clientes' },
  { key: 'eventos', label: 'Eventos', hint: 'Eventos, equipe e pagamentos do evento' },
  { key: 'agenda', label: 'Agenda', hint: 'Calendário de eventos' },
  { key: 'funcionarios', label: 'Funcionários', hint: 'Equipe e diárias' },
  { key: 'cardapios', label: 'Cardápios', hint: 'Cardápios e itens base' },
  { key: 'pre_orcamento', label: 'Pré-orçamento', hint: 'Calcular quanto cobrar' },
  { key: 'orcamentos', label: 'Orçamentos', hint: 'Propostas para clientes' },
  { key: 'vitrine', label: 'Vitrine', hint: 'Página pública do buffet' },
  { key: 'financeiro', label: 'Financeiro', hint: 'Contas, faturamento e resultado' },
  { key: 'configuracoes', label: 'Configurações', hint: 'Dados, logo e cor do buffet' },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

const KEYS = new Set<string>(PERMISSIONS.map((p) => p.key));

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Dono',
  admin: 'Administrador',
  usuario: 'Usuário',
  none: '—',
};

/** Mantém só permissões conhecidas, sem repetição, na ordem da lista. */
export function sanitizePermissions(list: unknown): Permission[] {
  if (!Array.isArray(list)) return [];
  const set = new Set(list.filter((v): v is string => typeof v === 'string' && KEYS.has(v)));
  return PERMISSIONS.map((p) => p.key).filter((k) => set.has(k));
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function can(role: UserRole, permissions: readonly string[], perm: Permission | 'usuarios'): boolean {
  if (isAdminRole(role)) return true;
  if (role !== 'usuario' || perm === 'usuarios') return false;
  return permissions.includes(perm);
}

/** Área exigida por cada rota do painel (null = livre para qualquer usuário da empresa). */
const ROUTE_PERMS: [string, Permission | 'usuarios'][] = [
  ['/dashboard/leads', 'leads'],
  ['/dashboard/clients', 'clientes'],
  ['/dashboard/events', 'eventos'],
  ['/dashboard/agenda', 'agenda'],
  ['/dashboard/employees', 'funcionarios'],
  ['/dashboard/menu', 'cardapios'],
  ['/dashboard/pre-orcamento', 'pre_orcamento'],
  ['/dashboard/budgets', 'orcamentos'],
  ['/dashboard/vitrine', 'vitrine'],
  ['/dashboard/finance', 'financeiro'],
  ['/dashboard/settings', 'configuracoes'],
  ['/dashboard/usuarios', 'usuarios'],
];

export function routePermission(pathname: string): Permission | 'usuarios' | null {
  const hit = ROUTE_PERMS.find(([url]) => pathname === url || pathname.startsWith(url + '/'));
  return hit ? hit[1] : null;
}

export function canRoute(role: UserRole, permissions: readonly string[], pathname: string): boolean {
  const perm = routePermission(pathname);
  return perm === null || can(role, permissions, perm);
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const MIN_PASSWORD = 8;
