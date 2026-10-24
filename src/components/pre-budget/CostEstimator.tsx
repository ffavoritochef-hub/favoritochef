'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/buffet-rules';
import { calcCostPrice, ingredientKey, type CostIngredient } from '@/lib/pre-budget';

interface Row extends CostIngredient {
  /** preço veio dos itens base do buffet (não da IA) */
  own: boolean;
}

interface BaseItem {
  id: string;
  name: string;
  cost_price: number | null;
  unit: string | null;
}

const toNum = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const fmt = (n: number) => (n ? String(n).replace('.', ',') : '');

export function CostEstimator({
  menuName,
  items,
  guests,
  staff,
  marketPerPerson,
}: {
  menuName: string;
  items: { name: string; quantity: string }[];
  guests: number;
  staff: { waiters: number; kitchen: number };
  marketPerPerson: number;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<BaseItem[]>([]);
  const [disposables, setDisposables] = useState('');
  const [waiters, setWaiters] = useState(String(staff.waiters));
  const [kitchen, setKitchen] = useState(String(staff.kitchen));
  const [waiterRate, setWaiterRate] = useState('150');
  const [kitchenRate, setKitchenRate] = useState('180');
  const [extras, setExtras] = useState('');
  const [margin, setMargin] = useState('30');
  const [estimatedFor, setEstimatedFor] = useState('');

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('id, name, cost_price, unit')
      .then(({ data }) => setBase((data as BaseItem[]) || []));
  }, []);

  const baseByKey = useMemo(() => new Map(base.map((b) => [ingredientKey(b.name), b])), [base]);
  const sig = `${menuName}|${guests}`;
  const stale = rows !== null && estimatedFor !== sig;

  async function estimate() {
    setBusy(true);
    try {
      const res = await authFetch('/api/pre-budget/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu: menuName, items, guests }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao falar com a IA.');
      setRows(
        (data.ingredients as CostIngredient[]).map((r) => {
          const mine = baseByKey.get(ingredientKey(r.name));
          return mine && Number(mine.cost_price) > 0
            ? { ...r, unitPrice: Number(mine.cost_price), unit: mine.unit || r.unit, own: true }
            : { ...r, own: false };
        })
      );
      setDisposables(fmt(data.disposablesPerPerson));
      setNotes(data.notes || '');
      setWaiters(String(staff.waiters));
      setKitchen(String(staff.kitchen));
      setEstimatedFor(sig);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows((list) => list && list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const result = useMemo(
    () =>
      rows
        ? calcCostPrice({
            guests,
            ingredients: rows,
            disposablesPerPerson: toNum(disposables),
            waiters: toNum(waiters),
            waiterRate: toNum(waiterRate),
            kitchen: toNum(kitchen),
            kitchenRate: toNum(kitchenRate),
            extras: toNum(extras),
            marginPercent: toNum(margin),
          })
        : null,
    [rows, guests, disposables, waiters, waiterRate, kitchen, kitchenRate, extras, margin]
  );

  /** Grava os preços da tabela nos itens base (atualiza os que já existem pelo nome). */
  async function savePrices() {
    if (!rows) return;
    setSaving(true);
    try {
      const updates = [];
      const inserts = [];
      for (const r of rows) {
        if (!(r.unitPrice > 0)) continue;
        const mine = baseByKey.get(ingredientKey(r.name));
        if (mine) updates.push(supabase.from('menu_items').update({ cost_price: r.unitPrice, unit: r.unit }).eq('id', mine.id));
        else inserts.push({ name: r.name, type: 'Insumos', cost_price: r.unitPrice, unit: r.unit });
      }
      const results = await Promise.all(updates);
      const failed = results.find((x) => x.error);
      if (failed?.error) throw failed.error;
      if (inserts.length) {
        const { error } = await supabase.from('menu_items').insert(inserts);
        if (error) throw error;
      }
      const { data } = await supabase.from('menu_items').select('id, name, cost_price, unit');
      setBase((data as BaseItem[]) || []);
      setRows((list) => list && list.map((r) => ({ ...r, own: r.unitPrice > 0 })));
      toast.success('Preços salvos nos seus itens base. Nas próximas estimativas eles serão usados.');
    } catch (e) {
      toast.error('Erro ao salvar preços: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="h-11" />
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );

  return (
    <Card className="shadow-card border-border bg-white">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="size-5 text-primary" /> Preço pelo custo (IA calcula os ingredientes)
        </CardTitle>
      </CardHeader>
      <CardContent className="py-5 space-y-5">
        {!rows ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              A IA monta a lista de compras deste cardápio para {guests} pessoas, com quantidades e preço estimado de cada ingrediente no
              atacado. Depois você corrige o que quiser e vê quanto cobrar para ter o lucro que deseja.
            </p>
            <Button className="h-12 rounded-xl w-full sm:w-auto" disabled={busy || items.length === 0} onClick={estimate}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? 'Calculando ingredientes...' : 'Calcular custo com IA'}
            </Button>
            {items.length === 0 && <p className="text-xs text-destructive">Este cardápio não tem itens cadastrados.</p>}
          </div>
        ) : (
          <>
            {stale && (
              <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-slate-700 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                Você mudou o cardápio ou o número de pessoas. Recalcule a lista.
                <Button size="sm" variant="outline" disabled={busy} onClick={estimate}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Recalcular
                </Button>
              </div>
            )}

            <div className="overflow-x-auto -mx-2">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-2 py-2 font-bold">Ingrediente</th>
                    <th className="px-2 py-2 font-bold w-24">Qtd.</th>
                    <th className="px-2 py-2 font-bold w-16">Un.</th>
                    <th className="px-2 py-2 font-bold w-28">R$/un.</th>
                    <th className="px-2 py-2 font-bold w-28 text-right">Subtotal</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        <Input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} className="h-10" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input inputMode="decimal" value={fmt(r.quantity)} onChange={(e) => setRow(i, { quantity: toNum(e.target.value) })} className="h-10" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} className="h-10" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          inputMode="decimal"
                          value={fmt(r.unitPrice)}
                          onChange={(e) => setRow(i, { unitPrice: toNum(e.target.value), own: false })}
                          className={`h-10 ${r.own ? 'border-success/50 bg-success/5' : ''}`}
                          title={r.own ? 'Seu preço (itens base)' : 'Estimativa da IA'}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-slate-900 whitespace-nowrap">{formatBRL(r.quantity * r.unitPrice)}</td>
                      <td className="px-1">
                        <Button variant="ghost" size="icon" className="size-9 text-slate-400 hover:text-destructive" aria-label="Remover" onClick={() => setRows((l) => l && l.filter((_, j) => j !== i))}>
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <Button variant="outline" className="h-11" onClick={() => setRows((l) => [...(l ?? []), { name: '', unit: 'kg', quantity: 0, unitPrice: 0, own: false }])}>
                <Plus className="size-4" /> Adicionar ingrediente
              </Button>
              <Button variant="outline" className="h-11 border-success/40 text-success" disabled={saving} onClick={savePrices}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar preços nos meus itens base
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Campo verde = seu preço cadastrado. Os demais são <b>estimativas da IA</b> (ela não consulta preços ao vivo): confira com seu
              fornecedor e corrija. {notes}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {field('Descartáveis/gás por pessoa (R$)', disposables, setDisposables)}
              {field('Transporte e outros (R$)', extras, setExtras)}
              {field('Garçons', waiters, setWaiters)}
              {field('Diária garçom (R$)', waiterRate, setWaiterRate)}
              {field('Cozinha', kitchen, setKitchen)}
              {field('Diária cozinha (R$)', kitchenRate, setKitchenRate)}
              {field('Lucro desejado (%)', margin, setMargin, 'Sobre o preço final')}
            </div>

            {result && (
              <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-white/60 text-xs">Ingredientes</p><p className="font-semibold">{formatBRL(result.food)}</p></div>
                  <div><p className="text-white/60 text-xs">Equipe</p><p className="font-semibold">{formatBRL(result.staff)}</p></div>
                  <div><p className="text-white/60 text-xs">Descartáveis</p><p className="font-semibold">{formatBRL(result.disposables)}</p></div>
                  <div><p className="text-white/60 text-xs">Outros</p><p className="font-semibold">{formatBRL(result.extras)}</p></div>
                </div>
                <div className="border-t border-white/15 pt-3 grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-white/60 text-xs">Custo total</p>
                    <p className="text-lg font-bold">{formatBRL(result.totalCost)}</p>
                    <p className="text-xs text-white/60">{formatBRL(result.costPerPerson)} por pessoa</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Cobrar por pessoa</p>
                    <p className="text-3xl font-bold text-emerald-300">{formatBRL(result.pricePerPerson)}</p>
                    <p className="text-xs text-white/60">Total {formatBRL(result.price)}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Seu lucro</p>
                    <p className="text-lg font-bold">{formatBRL(result.profit)}</p>
                    {marketPerPerson > 0 && (
                      <p className="text-xs text-white/70">
                        Mercado sugere {formatBRL(marketPerPerson)}/pessoa
                        {result.pricePerPerson > marketPerPerson * 1.15
                          ? ' — seu preço ficou acima: reveja custos ou margem.'
                          : result.pricePerPerson < marketPerPerson * 0.85
                            ? ' — dá para cobrar mais.'
                            : ' — preços alinhados.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
