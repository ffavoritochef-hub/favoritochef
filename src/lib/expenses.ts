// Despesas (finance_transactions type = 'payable').
// paid_by preenchido = alguém pagou do próprio bolso; status 'pendente'
// nesse caso quer dizer "a reembolsar".

export const EXPENSE_CATEGORIES = [
  'Carnes',
  'Bebidas',
  'Mercado / Insumos',
  'Gás / Carvão',
  'Equipe / Diárias',
  'Decoração',
  'Aluguel de equipamentos',
  'Transporte',
  'Outros',
] as const;

export type Expense = {
  id: string;
  description: string | null;
  amount: number;
  date: string;
  status: string | null;
  category?: string | null;
  paid_by?: string | null;
  event_id?: string | null;
};

export const isPending = (status: string | null | undefined) =>
  status === 'pendente' || status === 'atrasado';

/** Aceita "1.234,56", "1234,56", "1234.56", "1.500" (mil e quinhentos) e "150". */
export function parseMoney(input: string): number {
  const s = input.trim().replace(/[R$\s]/g, '');
  if (!s) return 0;
  // "1.500" (só pontos de milhar) é mil e quinhentos, não 1,5
  const thousandsOnly = /^\d{1,3}(\.\d{3})+$/.test(s);
  const normalized = s.includes(',') || thousandsOnly ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function formatMoneyInput(n: number): string {
  return n ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

/** Rótulo de situação de uma despesa, levando em conta reembolso. */
export function expenseSituation(e: Pick<Expense, 'status' | 'paid_by'>) {
  if (e.paid_by) {
    return isPending(e.status)
      ? { label: `Reembolsar ${e.paid_by}`, tone: 'warning' as const }
      : { label: `Reembolsado a ${e.paid_by}`, tone: 'success' as const };
  }
  return isPending(e.status)
    ? { label: 'Caixa · a pagar', tone: 'warning' as const }
    : { label: 'Caixa · sem reembolso', tone: 'success' as const };
}

/** Erro típico quando a migration 0017 ainda não foi aplicada. */
export function missingExpenseColumns(message: string | undefined) {
  return !!message && /(category|paid_by)/i.test(message) && /column|schema/i.test(message);
}
