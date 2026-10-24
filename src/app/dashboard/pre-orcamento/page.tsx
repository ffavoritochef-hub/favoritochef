'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Calculator, CalendarDays, ChefHat, Copy, ExternalLink, Loader2, MessageSquare, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/api-client';
import { formatBRL } from '@/lib/buffet-rules';
import { MENU_LIBRARY, libraryMenu } from '@/lib/menu-library';
import { listMenus, type MenuRecord } from '@/lib/menus';
import { CostEstimator } from '@/components/pre-budget/CostEstimator';
import {
  DRINKS,
  GENERIC_RANGE,
  PRICE_SOURCES,
  SERVICE_LEVELS,
  calcPreBudget,
  type DrinksOption,
  type ServiceLevel,
} from '@/lib/pre-budget';

const selectCls = 'h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-slate-900';

export default function PreBudgetPage() {
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [guests, setGuests] = useState('100');
  const [date, setDate] = useState('');
  const [menuRef, setMenuRef] = useState('');
  const [service, setService] = useState<ServiceLevel>('padrao');
  const [drinks, setDrinks] = useState<DrinksOption>('nao_alcoolicas');
  const [aiAnswer, setAiAnswer] = useState<{ sig: string; text: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    listMenus()
      .then((m) => setMenus(m.filter((x) => x.is_active)))
      .catch(() => setMenus([]));
  }, []);

  // menuRef: "my:<id>" ou "lib:<key>"
  const choice = useMemo(() => {
    if (menuRef.startsWith('my:')) {
      const m = menus.find((x) => x.id === menuRef.slice(3));
      if (!m) return null;
      const lib = libraryMenu(m.library_key);
      const own = m.price_per_person;
      const base = lib?.priceRange ?? (own ? { min: own * 0.85, max: own * 1.2 } : GENERIC_RANGE);
      const note = lib
        ? own
          ? 'Faixa de mercado do cardápio pronto, com a sugestão partindo do seu preço cadastrado.'
          : 'Faixa de mercado do cardápio pronto de origem.'
        : own
          ? 'Baseado no preço por pessoa que você cadastrou neste cardápio.'
          : 'Este cardápio não tem preço nem referência: usamos uma faixa geral. Cadastre o preço por pessoa no cardápio para uma sugestão melhor.';
      return { name: m.name, base, own, note, items: m.items.map((i) => i.name), full: m.items.map(({ name, quantity }) => ({ name, quantity })) };
    }
    if (menuRef.startsWith('lib:')) {
      const lib = libraryMenu(menuRef.slice(4));
      if (!lib) return null;
      return { name: lib.name, base: lib.priceRange, own: null, note: 'Faixa de mercado do cardápio pronto.', items: lib.items.map((i) => i.name), full: lib.items.map(({ name, quantity }) => ({ name, quantity })) };
    }
    return null;
  }, [menuRef, menus]);

  const nGuests = Math.max(0, Math.floor(Number(guests) || 0));
  const result = useMemo(
    () => (choice && nGuests > 0 ? calcPreBudget({ guests: nGuests, date, base: choice.base, ownPrice: choice.own, service, drinks }) : null),
    [choice, nGuests, date, service, drinks]
  );

  // a análise da IA vale só para os dados com que foi pedida
  const sig = [menuRef, guests, date, service, drinks].join('|');
  const ai = aiAnswer?.sig === sig ? aiAnswer.text : null;

  const dateLabel = date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : 'data a definir';

  const summary = result && choice
    ? [
        `Pré-orçamento — ${choice.name}`,
        `${nGuests} pessoas · ${dateLabel}`,
        `Serviço ${SERVICE_LEVELS[service].label.toLowerCase()} · ${DRINKS[drinks].label}`,
        '',
        `Valor por pessoa: ${formatBRL(result.perPerson.suggested)}`,
        `Total estimado: ${formatBRL(result.total.suggested)}`,
        '',
        'Cardápio:',
        ...choice.items.map((i) => `• ${i}`),
        '',
        'Valores sujeitos a confirmação após definirmos os detalhes do evento.',
      ].join('\n')
    : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success('Resumo copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  async function askAi() {
    if (!result || !choice) return;
    setAiBusy(true);
    try {
      const res = await authFetch('/api/pre-budget/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu: choice.name,
          items: choice.items.slice(0, 30),
          guests: nGuests,
          date: date || null,
          service: SERVICE_LEVELS[service].label,
          drinks: DRINKS[drinks].label,
          perPerson: result.perPerson,
          adjustments: result.adjustments.map((a) => `${a.label} (${a.percent > 0 ? '+' : ''}${a.percent}%)`),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao falar com a IA.');
      setAiAnswer({ sig, text: data.text });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-8">
      <header>
        <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Pré-orçamento</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-base">Informe pessoas, data e cardápio e veja quanto cobrar, com base em referências de mercado.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="shadow-card border-border bg-white h-fit">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-lg"><Calculator className="size-5 text-primary" /> Dados do evento</CardTitle>
          </CardHeader>
          <CardContent className="py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="field-group">
                <Label htmlFor="pb-guests"><Users className="inline size-4 mr-1" />Pessoas</Label>
                <Input id="pb-guests" type="number" inputMode="numeric" min={1} max={5000} value={guests} onChange={(e) => setGuests(e.target.value)} />
              </div>
              <div className="field-group">
                <Label htmlFor="pb-date"><CalendarDays className="inline size-4 mr-1" />Data</Label>
                <Input id="pb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="field-group">
              <Label htmlFor="pb-menu"><ChefHat className="inline size-4 mr-1" />Cardápio</Label>
              <select id="pb-menu" className={selectCls} value={menuRef} onChange={(e) => setMenuRef(e.target.value)}>
                <option value="">Escolha um cardápio</option>
                {menus.length > 0 && (
                  <optgroup label="Meus cardápios">
                    {menus.map((m) => <option key={m.id} value={`my:${m.id}`}>{m.name}</option>)}
                  </optgroup>
                )}
                <optgroup label="Cardápios prontos">
                  {MENU_LIBRARY.map((m) => <option key={m.key} value={`lib:${m.key}`}>{m.name}</option>)}
                </optgroup>
              </select>
            </div>
            <div className="field-group">
              <Label>Nível de serviço</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SERVICE_LEVELS) as ServiceLevel[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setService(k)}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-semibold ${service === k ? 'border-primary bg-primary/10 text-primary' : 'border-border text-slate-600'}`}
                  >
                    {SERVICE_LEVELS[k].label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">{SERVICE_LEVELS[service].hint}</p>
            </div>
            <div className="field-group">
              <Label htmlFor="pb-drinks">Bebidas</Label>
              <select id="pb-drinks" className={selectCls} value={drinks} onChange={(e) => setDrinks(e.target.value as DrinksOption)}>
                {(Object.keys(DRINKS) as DrinksOption[]).map((k) => <option key={k} value={k}>{DRINKS[k].label}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {!result || !choice ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 border-2 border-dashed border-border rounded-2xl bg-white">
              <Calculator className="size-12 text-primary/40 mb-3" />
              <p className="font-semibold text-slate-900">Escolha o cardápio e o número de pessoas</p>
              <p className="text-sm text-slate-500 mt-1">A sugestão aparece aqui na hora.</p>
            </div>
          ) : (
            <>
              <Card className="shadow-card border-border bg-white overflow-hidden">
                <div className="bg-primary text-white px-5 sm:px-6 py-5">
                  <p className="text-sm opacity-90">{choice.name} · {nGuests} pessoas · {dateLabel}</p>
                  <p className="text-xs uppercase tracking-widest font-semibold mt-3 opacity-80">Sugestão por pessoa</p>
                  <p className="text-4xl sm:text-5xl font-bold leading-tight">{formatBRL(result.perPerson.suggested)}</p>
                  <p className="text-sm mt-1 opacity-90">Total estimado: <b>{formatBRL(result.total.suggested)}</b></p>
                </div>
                <CardContent className="py-5 space-y-5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Mínimo</p>
                      <p className="font-bold text-slate-900">{formatBRL(result.perPerson.min)}</p>
                      <p className="text-xs text-slate-500">{formatBRL(result.total.min)}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/30">
                      <p className="text-[11px] uppercase font-bold text-primary tracking-wider">Sugerido</p>
                      <p className="font-bold text-slate-900">{formatBRL(result.perPerson.suggested)}</p>
                      <p className="text-xs text-slate-500">{formatBRL(result.total.suggested)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Máximo</p>
                      <p className="font-bold text-slate-900">{formatBRL(result.perPerson.max)}</p>
                      <p className="text-xs text-slate-500">{formatBRL(result.total.max)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Como chegamos nesse valor</p>
                    <ul className="text-sm space-y-1.5">
                      <li className="flex justify-between gap-3">
                        <span className="text-slate-600">Base do cardápio (por pessoa)</span>
                        <span className="font-semibold text-slate-900 shrink-0">{formatBRL(choice.base.min)} a {formatBRL(choice.base.max)}</span>
                      </li>
                      {choice.own != null && (
                        <li className="flex justify-between gap-3">
                          <span className="text-slate-600">Seu preço cadastrado</span>
                          <span className="font-semibold text-slate-900">{formatBRL(choice.own)}</span>
                        </li>
                      )}
                      {result.adjustments.map((a) => (
                        <li key={a.label} className="flex justify-between gap-3">
                          <span className="text-slate-600">{a.label}</span>
                          <span className={`font-semibold shrink-0 ${a.percent > 0 ? 'text-success' : 'text-destructive'}`}>{a.percent > 0 ? '+' : ''}{a.percent}%</span>
                        </li>
                      ))}
                      {result.drinksPerPerson.max > 0 && (
                        <li className="flex justify-between gap-3">
                          <span className="text-slate-600">{DRINKS[drinks].label}</span>
                          <span className="font-semibold text-slate-900 shrink-0">+{formatBRL(result.drinksPerPerson.min)} a {formatBRL(result.drinksPerPerson.max)}</span>
                        </li>
                      )}
                    </ul>
                    <p className="text-xs text-slate-500 mt-2">{choice.note}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Equipe sugerida: <b>{result.staff.waiters} garçons</b> e <b>{result.staff.kitchen} na cozinha</b>.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button variant="outline" className="h-12 rounded-xl" onClick={copy}><Copy className="size-4" /> Copiar resumo</Button>
                    <Button asChild className="h-12 rounded-xl bg-success hover:bg-success/90 text-white">
                      <a href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer"><MessageSquare className="size-4" /> WhatsApp</a>
                    </Button>
                    <Button variant="outline" className="h-12 rounded-xl border-primary/30 text-primary" disabled={aiBusy} onClick={askAi}>
                      {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Opinião da IA
                    </Button>
                  </div>

                  {ai && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-800 whitespace-pre-line">
                      <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1"><Sparkles className="size-3.5" /> Análise da IA</p>
                      {ai}
                    </div>
                  )}
                </CardContent>
              </Card>

              <CostEstimator
                key={menuRef}
                menuName={choice.name}
                items={choice.full}
                guests={nGuests}
                staff={result.staff}
                marketPerPerson={result.perPerson.suggested}
              />

              <Card className="shadow-card border-border bg-white">
                <CardContent className="py-4 text-xs text-slate-500 space-y-2">
                  <p>
                    <b className="text-slate-700">Importante:</b> é uma estimativa. Preços variam muito por cidade e padrão. Confira seus custos reais
                    (insumos, equipe, transporte) antes de fechar. Para fechar com o cliente, crie o evento e o{' '}
                    <Link href="/dashboard/budgets/new" className="text-primary font-semibold underline">orçamento</Link>.
                  </p>
                  <p className="font-semibold text-slate-600">Referências de mercado usadas:</p>
                  <ul className="space-y-1">
                    {PRICE_SOURCES.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                          {s.label} <ExternalLink className="size-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
