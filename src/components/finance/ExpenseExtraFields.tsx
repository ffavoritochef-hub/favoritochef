'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EXPENSE_CATEGORIES } from '@/lib/expenses';

interface Props {
  category: string;
  paidBy: string;
  onChange: (patch: { category?: string; paid_by?: string }) => void;
}

/** Categoria + "quem pagou do próprio bolso" para despesas no Financeiro. */
export function ExpenseExtraFields({ category, paidBy, onChange }: Props) {
  return (
    <>
      <div className="field-group lg:col-span-5 xl:col-span-4">
        <Label htmlFor="exp_category">Categoria</Label>
        <select
          id="exp_category"
          value={category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="h-12 w-full rounded-xl border border-border bg-white px-3 text-[16px] text-slate-900 lg:h-10 lg:text-sm"
        >
          <option value="">Sem categoria</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group lg:col-span-7 xl:col-span-8">
        <Label htmlFor="exp_paid_by">Pago do próprio bolso por (opcional)</Label>
        <Input
          id="exp_paid_by"
          placeholder="Deixe vazio se saiu do caixa do buffet"
          value={paidBy}
          onChange={(e) => onChange({ paid_by: e.target.value })}
        />
        <p className="text-xs mt-1.5 pl-1 text-slate-500">
          Se alguém pagou com dinheiro próprio, informe o nome. Com status &quot;Pendente&quot; o valor
          aparece como <span className="font-semibold text-warning">a reembolsar</span>.
        </p>
      </div>
    </>
  );
}
