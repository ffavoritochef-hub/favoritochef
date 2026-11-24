'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { localTodayIso } from '@/lib/leads';
import {
  EXPENSE_CATEGORIES,
  type Expense,
  expenseSituation,
  formatMoneyInput,
  isPending,
  missingExpenseColumns,
  parseMoney,
} from '@/lib/expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CheckCircle2, Pencil, PlusCircle, Receipt, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateBR = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');

const toneClass = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/25',
};

type Form = {
  description: string;
  amount: string;
  category: string;
  date: string;
  whoPaid: 'buffet' | 'pessoa';
  paid_by: string;
  settled: boolean; // pago (buffet) ou reembolsado (pessoa)
};

interface Props {
  eventId: string;
  eventName: string;
  eventDate: string;
  expenses: Expense[];
  /** Nomes sugeridos em "quem pagou" (equipe do evento). */
  peopleSuggestions: string[];
  onChanged: () => Promise<void> | void;
}

export function EventExpenses({
  eventId,
  eventName,
  eventDate,
  expenses,
  peopleSuggestions,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lastPayer, setLastPayer] = useState('');

  const emptyForm = (): Form => ({
    description: '',
    amount: '',
    category: '',
    date: eventDate && eventDate <= localTodayIso() ? eventDate : localTodayIso(),
    whoPaid: 'buffet',
    paid_by: '',
    settled: true,
  });
  const [form, setForm] = useState<Form>(emptyForm);

  // Pessoas já usadas em despesas + equipe do evento
  const people = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => e.paid_by && set.add(e.paid_by));
    peopleSuggestions.forEach((p) => p && set.add(p));
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [expenses, peopleSuggestions]);

  const reimburse = useMemo(() => {
    const byPerson = new Map<string, number>();
    expenses
      .filter((e) => e.paid_by && isPending(e.status))
      .forEach((e) => {
        byPerson.set(e.paid_by!, (byPerson.get(e.paid_by!) || 0) + Number(e.amount || 0));
      });
    const total = [...byPerson.values()].reduce((a, b) => a + b, 0);
    return { total, byPerson: [...byPerson.entries()] };
  }, [expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const k = e.category || 'Sem categoria';
      map.set(k, (map.get(k) || 0) + Number(e.amount || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      description: e.description || '',
      amount: formatMoneyInput(Number(e.amount || 0)),
      category: e.category || '',
      date: e.date,
      whoPaid: e.paid_by ? 'pessoa' : 'buffet',
      paid_by: e.paid_by || '',
      settled: !isPending(e.status),
    });
    setOpen(true);
  }

  async function save(another: boolean) {
    const amount = parseMoney(form.amount);
    if (!form.description.trim()) {
      toast.error('Diga o que foi comprado (ex.: Carne para churrasco).');
      document.getElementById('exp_desc')?.focus();
      return;
    }
    if (!(amount > 0)) {
      toast.error('Informe o valor da despesa.');
      document.getElementById('exp_amount')?.focus();
      return;
    }
    if (form.whoPaid === 'pessoa' && !form.paid_by.trim()) {
      toast.error('Informe quem pagou do próprio bolso.');
      document.getElementById('exp_paid_by')?.focus();
      return;
    }
    if (!form.date) {
      toast.error('Informe a data.');
      return;
    }

    const payload = {
      type: 'payable' as const,
      event_id: eventId,
      description: form.description.trim(),
      amount,
      date: form.date,
      category: form.category || null,
      paid_by: form.whoPaid === 'pessoa' ? form.paid_by.trim() : null,
      status: form.settled ? 'pago' : 'pendente',
    };

    setSaving(true);
    try {
      const { error } = editing
        ? await supabase.from('finance_transactions').update(payload).eq('id', editing.id)
        : await supabase.from('finance_transactions').insert([payload]);
      if (error) throw error;

      toast.success(editing ? 'Despesa atualizada.' : 'Despesa lançada.');
      if (payload.paid_by) setLastPayer(payload.paid_by);
      await onChanged();

      if (another && !editing) {
        // Mantém data, categoria e quem pagou para lançar a próxima nota.
        setForm((f) => ({ ...f, description: '', amount: '' }));
        setTimeout(() => document.getElementById('exp_desc')?.focus(), 50);
      } else {
        setOpen(false);
      }
    } catch (err) {
      const error = err as { message?: string };
      if (missingExpenseColumns(error?.message)) {
        toast.error(
          'O banco ainda não tem os campos de categoria/quem pagou. Rode a migração 0017_despesas_evento.sql no Supabase.'
        );
      } else {
        toast.error('Erro ao salvar despesa: ' + (error?.message || 'tente novamente'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function markReimbursed(e: Expense) {
    const { error } = await supabase
      .from('finance_transactions')
      .update({ status: 'pago' })
      .eq('id', e.id);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    toast.success(e.paid_by ? `Reembolso para ${e.paid_by} registrado.` : 'Despesa marcada como paga.');
    await onChanged();
  }

  async function reimburseAll(person: string) {
    const ids = expenses
      .filter((e) => e.paid_by === person && isPending(e.status))
      .map((e) => e.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('finance_transactions')
      .update({ status: 'pago' })
      .in('id', ids);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    toast.success(`Reembolso para ${person} registrado.`);
    await onChanged();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', toDelete.id);
      if (error) throw error;
      toast.success('Despesa excluída.');
      setToDelete(null);
      await onChanged();
    } catch (err) {
      const error = err as { message?: string };
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleting(false);
    }
  }

  const sorted = [...expenses].sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? 1 : -1
  );

  return (
    <div className="space-y-4">
      {/* Reembolsos pendentes */}
      {reimburse.total > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 space-y-2">
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="size-4 text-warning" />
            A reembolsar: {formatCurrency(reimburse.total)}
          </p>
          {reimburse.byPerson.map(([person, value]) => (
            <div key={person} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-700 min-w-0 truncate">
                <span className="font-semibold">{person}</span> pagou do próprio bolso{' '}
                <span className="font-bold text-warning">{formatCurrency(value)}</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => reimburseAll(person)}
                className="h-8 shrink-0 rounded-lg border-success/30 text-success hover:bg-success hover:text-white"
              >
                <CheckCircle2 className="size-4" />
                Reembolsei
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Por categoria */}
      {byCategory.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {byCategory.map(([cat, value]) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600"
            >
              {cat}
              <span className="text-slate-900">{formatCurrency(value)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Lista */}
      {sorted.length === 0 ? (
        <div className="rounded-xl bg-slate-50 border border-dashed border-border p-5 text-center">
          <Receipt className="size-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma despesa lançada.</p>
          <p className="text-xs text-slate-500 mt-1">
            Lance tudo o que este evento gastou: carne, bebida, diárias, gás... Se alguém
            pagou do próprio bolso, o sistema controla o reembolso.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white">
          {sorted.map((e) => {
            const sit = expenseSituation(e);
            return (
              <li key={e.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm break-words">
                    {e.description || 'Sem descrição'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>{formatDateBR(e.date)}</span>
                    {e.category && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                        {e.category}
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 font-semibold ${toneClass[sit.tone]}`}
                    >
                      {sit.label}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-destructive">
                    -{formatCurrency(Number(e.amount || 0))}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {isPending(e.status) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => markReimbursed(e)}
                        className="rounded-lg text-slate-400 hover:text-success hover:bg-success/5"
                        title={e.paid_by ? 'Marcar como reembolsado' : 'Marcar como pago'}
                        aria-label={e.paid_by ? 'Marcar como reembolsado' : 'Marcar como pago'}
                      >
                        <CheckCircle2 />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(e)}
                      className="rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                      title="Editar"
                      aria-label="Editar despesa"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setToDelete(e)}
                      className="rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5"
                      title="Excluir"
                      aria-label="Excluir despesa"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        onClick={openNew}
        className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary-dark text-white lg:h-10"
      >
        <PlusCircle className="size-4.5 mr-1" />
        Lançar despesa
      </Button>

      {/* Dialog de despesa */}
      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="size-5 text-destructive" />
              {editing ? 'Editar despesa' : 'Lançar despesa'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Gasto do evento <span className="font-semibold text-slate-700">{eventName}</span>.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              const another =
                (ev.nativeEvent as SubmitEvent).submitter?.dataset.another === 'true';
              save(another);
            }}
          >
            <div className="field-group">
              <Label htmlFor="exp_desc">O que foi comprado / pago</Label>
              <Input
                id="exp_desc"
                autoFocus
                placeholder="Ex.: 20 kg de picanha no Açougue Central"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field-group">
                <Label htmlFor="exp_amount">Valor (R$)</Label>
                <Input
                  id="exp_amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  onBlur={() =>
                    setForm((f) => ({ ...f, amount: formatMoneyInput(parseMoney(f.amount)) }))
                  }
                  className="font-semibold text-destructive"
                />
              </div>
              <div className="field-group">
                <Label htmlFor="exp_date">Data</Label>
                <Input
                  id="exp_date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="field-group">
              <Label>Categoria</Label>
              <Select
                value={form.category || 'none'}
                onValueChange={(v) => setForm({ ...form, category: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="h-12 rounded-xl lg:h-10">
                  <SelectValue placeholder="Escolha a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-slate-900">
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="field-group">
              <Label>Quem pagou? (define se precisa reembolso)</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, whoPaid: 'buffet', settled: true })}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                    form.whoPaid === 'buffet'
                      ? 'border-primary/50 bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Caixa do buffet
                  <span className="block text-[11px] font-normal opacity-80">não precisa reembolso</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      whoPaid: 'pessoa',
                      settled: false,
                      paid_by: form.paid_by || lastPayer,
                    })
                  }
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                    form.whoPaid === 'pessoa'
                      ? 'border-warning/60 bg-warning/5 text-warning'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Do próprio bolso
                  <span className="block text-[11px] font-normal opacity-80">precisa reembolsar</span>
                </button>
              </div>
            </div>

            {form.whoPaid === 'pessoa' && (
              <div className="field-group">
                <Label htmlFor="exp_paid_by">Nome de quem pagou</Label>
                <Input
                  id="exp_paid_by"
                  list="exp_people"
                  placeholder="Ex.: João (sócio), Maria"
                  value={form.paid_by}
                  onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
                />
                <datalist id="exp_people">
                  {people.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            )}

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-border cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                checked={form.settled}
                onChange={(e) => setForm({ ...form, settled: e.target.checked })}
              />
              <span className="text-sm font-semibold text-slate-700 leading-relaxed">
                {form.whoPaid === 'pessoa'
                  ? 'Já foi reembolsado'
                  : 'Já foi pago'}
                <span className="block text-xs font-normal text-slate-500">
                  {form.whoPaid === 'pessoa'
                    ? 'Deixe desmarcado para o valor aparecer em "A reembolsar".'
                    : 'Desmarque se a conta ainda vai ser paga (fica como pendente no Financeiro).'}
                </span>
              </span>
            </label>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-11 rounded-xl lg:h-9"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              {!editing && (
                <Button
                  type="submit"
                  data-another="true"
                  variant="outline"
                  className="w-full sm:w-auto h-11 rounded-xl border-primary/30 text-primary hover:bg-primary/5 font-semibold lg:h-9"
                  disabled={saving}
                >
                  Salvar e lançar outra
                </Button>
              )}
              <Button
                type="submit"
                className="w-full sm:w-auto h-11 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold lg:h-9"
                disabled={saving}
              >
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !deleting && !v && setToDelete(null)}
        title="Excluir esta despesa?"
        description={
          toDelete
            ? `${toDelete.description || 'Despesa'} — ${formatCurrency(Number(toDelete.amount || 0))}. Ela sai do evento e do Financeiro.`
            : ''
        }
        variant="destructive"
        confirmText="Sim, excluir"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
