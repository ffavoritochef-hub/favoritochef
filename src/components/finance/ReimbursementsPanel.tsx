'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { isPending } from '@/lib/expenses';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, Wallet } from 'lucide-react';
import { toast } from 'sonner';

type Tx = {
  id: string;
  type: string;
  description: string | null;
  amount: number;
  date: string;
  status: string | null;
  paid_by?: string | null;
  event_id?: string | null;
  event?: { name?: string | null } | null;
};

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');

/** Tudo o que alguém pagou do próprio bolso e ainda não foi devolvido. */
export function ReimbursementsPanel({
  transactions,
  onChanged,
}: {
  transactions: Tx[];
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    transactions
      .filter((t) => t.type === 'payable' && t.paid_by && isPending(t.status))
      .forEach((t) => {
        const k = t.paid_by!.trim();
        map.set(k, [...(map.get(k) || []), t]);
      });
    return [...map.entries()]
      .map(([person, items]) => ({
        person,
        items: items.sort((a, b) => (a.date < b.date ? -1 : 1)),
        total: items.reduce((s, t) => s + Number(t.amount || 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  if (groups.length === 0) return null;
  const total = groups.reduce((s, g) => s + g.total, 0);

  async function settle(ids: string[], label: string) {
    setBusy(label);
    const { error } = await supabase
      .from('finance_transactions')
      .update({ status: 'pago' })
      .in('id', ids);
    setBusy(null);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    toast.success(`Reembolso registrado: ${label}.`);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border-2 border-warning/40 bg-warning/5 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900">
          <Wallet className="size-5 text-warning" />
          Reembolsos pendentes
        </h2>
        <span className="text-lg font-bold text-warning">{brl(total)}</span>
      </div>
      <p className="text-xs sm:text-sm text-slate-600">
        Despesas que alguém pagou do próprio bolso e ainda precisam ser devolvidas.
      </p>

      <div className="space-y-2">
        {groups.map((g) => {
          const expanded = open === g.person;
          return (
            <div key={g.person} className="rounded-xl border border-warning/25 bg-white">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : g.person)}
                  className="flex flex-1 min-w-0 items-center gap-2 text-left"
                >
                  <ChevronDown
                    className={`size-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900 truncate">
                      Devolver para {g.person}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {g.items.length} despesa{g.items.length > 1 ? 's' : ''} · toque para ver
                    </span>
                  </span>
                </button>
                <span className="font-bold text-warning">{brl(g.total)}</span>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => settle(g.items.map((i) => i.id), g.person)}
                  className="h-9 rounded-lg bg-success hover:bg-success/90 text-white"
                >
                  <CheckCircle2 className="size-4" />
                  Reembolsei tudo
                </Button>
              </div>
              {expanded && (
                <ul className="divide-y divide-border border-t border-border">
                  {g.items.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 break-words">
                          {t.description || 'Sem descrição'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {dateBR(t.date)}
                          {t.event_id && t.event?.name && (
                            <>
                              {' · '}
                              <Link
                                href={`/dashboard/events/${t.event_id}`}
                                className="text-primary font-semibold hover:underline"
                              >
                                {t.event.name}
                              </Link>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-800 shrink-0">
                        {brl(Number(t.amount || 0))}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => settle([t.id], t.description || g.person)}
                        className="h-8 shrink-0 rounded-lg border-success/30 text-success hover:bg-success hover:text-white"
                      >
                        Reembolsei
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
