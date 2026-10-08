'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save, FileText, Calculator, ChefHat, Users, Wallet, AlertTriangle, HardHat } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { calcGuestPricing, calcCostMargin, calcDeposit, formatBRL, suggestStaff } from '@/lib/buffet-rules';

type Mode = 'por_convidado' | 'custo_margem';

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function NewBudgetPage() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [menuTemplates, setMenuTemplates] = useState<any[]>([]);
  const router = useRouter();

  const [form, setForm] = useState({
    event_id: '',
    menu_template_id: '',
    pricing_mode: 'por_convidado' as Mode,
    adult_count: 0,
    child_count: 0,
    price_per_adult: 0,
    child_discount_percent: 50,
    min_total: 0,
    extras_value: 0,
    deposit_percent: 30,
    food_value: 0,
    drinks_value: 0,
    staff_value: 0,
    location_value: 0,
    transport_value: 0,
    margin_percent: 20,
    payment_conditions: '',
  });
  const set = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const [eventsRes, templatesRes] = await Promise.all([
          supabase
            .from('events')
            .select('id, name, guest_count, status')
            .in('status', ['Orçamento enviado', 'Aguardando aprovação'])
            .order('name'),
          supabase.from('menu_templates').select('id, name, is_active').order('name'),
        ]);
        setEvents(eventsRes.data || []);
        setMenuTemplates((templatesRes.data || []).filter((t: any) => t.is_active !== false));
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
      }
    })();
  }, []);

  const costs = [form.food_value, form.drinks_value, form.staff_value, form.location_value, form.transport_value];
  const costTotal = costs.reduce((a, b) => a + b, 0);

  const calc = useMemo(() => {
    if (form.pricing_mode === 'por_convidado') {
      const p = calcGuestPricing({
        adults: form.adult_count,
        children: form.child_count,
        pricePerAdult: form.price_per_adult,
        childDiscountPercent: form.child_discount_percent,
        minTotal: form.min_total,
        extras: form.extras_value,
      });
      return { total: p.total, pricing: p };
    }
    return { total: calcCostMargin(costs, form.margin_percent).total, pricing: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const profit = calc.total - costTotal;
  const marginReal = calc.total > 0 ? (profit / calc.total) * 100 : 0;
  const deposit = calcDeposit(calc.total, form.deposit_percent);
  const selectedEvent = events.find((e) => e.id === form.event_id);
  const guests = form.adult_count + form.child_count;
  const staff = suggestStaff(guests);

  function pickEvent(id: string) {
    const ev = events.find((e) => e.id === id);
    set({ event_id: id, adult_count: ev && form.adult_count === 0 ? Number(ev.guest_count) || 0 : form.adult_count });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_id) return toast.error('Selecione o evento.');
    if (!(calc.total > 0)) return toast.error('O valor da proposta está zerado. Preencha os valores.');
    if (form.pricing_mode === 'por_convidado' && guests === 0) return toast.error('Informe o número de convidados.');
    if (form.pricing_mode === 'por_convidado' && form.price_per_adult <= 0 && form.min_total <= 0)
      return toast.error('Informe o valor por adulto ou um valor mínimo.');

    setLoading(true);
    try {
      const { error } = await supabase.from('budgets').insert([
        {
          event_id: form.event_id,
          menu_template_id: form.menu_template_id || null,
          pricing_mode: form.pricing_mode,
          adult_count: form.adult_count,
          child_count: form.child_count,
          price_per_adult: form.price_per_adult,
          child_discount_percent: form.child_discount_percent,
          min_total: form.min_total,
          extras_value: form.extras_value,
          deposit_percent: form.deposit_percent,
          food_value: form.food_value,
          drinks_value: form.drinks_value,
          staff_value: form.staff_value,
          location_value: form.location_value,
          transport_value: form.transport_value,
          total_value: calc.total,
          payment_conditions: form.payment_conditions,
          proposal_status: 'rascunho',
        },
      ]);
      if (error) throw error;
      toast.success('Orçamento salvo! Envie a proposta pela lista de orçamentos.');
      router.push('/dashboard/budgets');
    } catch (error: any) {
      toast.error('Erro ao gerar orçamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const CardTitleIcon = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      {children}
    </CardTitle>
  );
  const headCls = 'bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6';
  const bodyCls = 'px-5 sm:px-8 py-6 sm:py-8 space-y-6';
  const money = (label: string, key: keyof typeof form, hint?: string) => (
    <div className="field-group">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={(form[key] as number) || ''}
        placeholder="0,00"
        onChange={(e) => set({ [key]: num(e.target.value) } as any)}
      />
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0">
          <Link href="/dashboard/budgets"><ChevronLeft className="size-5" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Novo Orçamento</h1>
          <p className="text-sm sm:text-base text-slate-500">Monte a proposta por convidado e acompanhe seu lucro.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <Card className="shadow-card border-border overflow-hidden bg-white">
            <CardHeader className={headCls}><CardTitleIcon icon={FileText}>Evento e Cardápio</CardTitleIcon></CardHeader>
            <CardContent className={bodyCls}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <div className="field-group">
                  <Label>Evento</Label>
                  <Select onValueChange={pickEvent}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Selecione o evento" /></SelectTrigger>
                    <SelectContent className="bg-white border-border text-slate-900">
                      {events.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">Nenhum evento aguardando orçamento.</div>}
                      {events.map((ev) => (<SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="flex items-center gap-1.5"><ChefHat className="size-4 text-primary" />Cardápio</Label>
                  <Select onValueChange={(val) => set({ menu_template_id: val })}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Selecione o cardápio" /></SelectTrigger>
                    <SelectContent className="bg-white border-border text-slate-900">
                      {menuTemplates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border overflow-hidden bg-white">
            <CardHeader className={headCls}><CardTitleIcon icon={Users}>Precificação</CardTitleIcon></CardHeader>
            <CardContent className={bodyCls}>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100" role="tablist">
                {([['por_convidado', 'Por convidado'], ['custo_margem', 'Custos + margem']] as [Mode, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={form.pricing_mode === m}
                    onClick={() => set({ pricing_mode: m })}
                    className={`h-11 rounded-lg text-sm font-semibold transition ${form.pricing_mode === m ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.pricing_mode === 'por_convidado' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="field-group">
                    <Label>Adultos</Label>
                    <Input type="number" inputMode="numeric" min="0" value={form.adult_count || ''} placeholder="0"
                      onChange={(e) => set({ adult_count: Math.floor(num(e.target.value)) })} />
                    {selectedEvent && guests !== Number(selectedEvent.guest_count) && (
                      <p className="text-xs text-warning mt-1.5">O evento tem {selectedEvent.guest_count} convidados cadastrados.</p>
                    )}
                  </div>
                  <div className="field-group">
                    <Label>Crianças</Label>
                    <Input type="number" inputMode="numeric" min="0" value={form.child_count || ''} placeholder="0"
                      onChange={(e) => set({ child_count: Math.floor(num(e.target.value)) })} />
                  </div>
                  {money('Valor por adulto (R$)', 'price_per_adult')}
                  <div className="field-group">
                    <Label>Desconto criança (%)</Label>
                    <Input type="number" inputMode="decimal" min="0" max="100" value={form.child_discount_percent}
                      onChange={(e) => set({ child_discount_percent: Math.min(100, num(e.target.value)) })} />
                    <p className="text-xs text-slate-500 mt-1.5">Criança paga {formatBRL(calc.pricing?.pricePerChild ?? 0)}.</p>
                  </div>
                  {money('Valor mínimo de contratação (R$)', 'min_total', 'Se o total por convidado ficar abaixo, cobra o mínimo.')}
                  {money('Extras: locação, estrutura, logística (R$)', 'extras_value')}
                </div>
              ) : (
                <div className="field-group sm:max-w-xs">
                  <Label>Margem de lucro (%)</Label>
                  <Input type="number" inputMode="decimal" min="0" value={form.margin_percent}
                    onChange={(e) => set({ margin_percent: num(e.target.value) })} />
                  <p className="text-xs text-slate-500 mt-1.5">Aplicada sobre a soma dos custos abaixo.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card border-border overflow-hidden bg-white">
            <CardHeader className={headCls}><CardTitleIcon icon={Calculator}>Custos internos</CardTitleIcon></CardHeader>
            <CardContent className={bodyCls}>
              <p className="text-sm text-slate-500 -mt-2">Usados só para calcular seu lucro. O cliente <strong>não</strong> vê estes valores.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {money('Insumos / Alimentos', 'food_value')}
                {money('Bebidas', 'drinks_value')}
                {money('Equipe / Garçons', 'staff_value')}
                {money('Locação / Estrutura', 'location_value')}
                {money('Transporte / Logística', 'transport_value')}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border overflow-hidden bg-white">
            <CardHeader className={headCls}><CardTitleIcon icon={Wallet}>Pagamento</CardTitleIcon></CardHeader>
            <CardContent className={bodyCls}>
              <div className="field-group sm:max-w-xs">
                <Label>Sinal para reservar a data (%)</Label>
                <Input type="number" inputMode="decimal" min="0" max="100" value={form.deposit_percent}
                  onChange={(e) => set({ deposit_percent: Math.min(100, num(e.target.value)) })} />
                <p className="text-xs text-slate-500 mt-1.5">O evento só pode ser iniciado após receber este sinal.</p>
              </div>
              <div className="field-group">
                <Label>Condições de pagamento</Label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none"
                  placeholder="Ex: saldo via Pix até 3 dias antes do evento."
                  value={form.payment_conditions}
                  onChange={(e) => set({ payment_conditions: e.target.value })}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4 pt-2 lg:hidden">
                <Button type="submit" className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold flex items-center justify-center gap-2" disabled={loading}>
                  <Save className="size-5" />{loading ? 'Salvando...' : 'Salvar Orçamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card className="border-primary/20 shadow-modal overflow-hidden bg-gradient-to-br from-primary/5 via-white to-white">
              <CardHeader className="bg-primary text-white px-6 py-5">
                <CardTitle className="text-center text-white text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-6 py-6">
                <div className="text-center space-y-1">
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Valor da proposta</p>
                  <p className="text-3xl sm:text-4xl font-black text-primary leading-none break-words">{formatBRL(calc.total)}</p>
                  {calc.pricing?.minApplied && <p className="text-xs text-warning font-medium">Valor mínimo aplicado</p>}
                </div>
                <dl className="space-y-2.5 text-sm border-t border-slate-100 pt-4">
                  <Row l={`Sinal (${deposit.percent}%)`} v={formatBRL(deposit.deposit)} />
                  <Row l="Saldo" v={formatBRL(deposit.balance)} />
                  <Row l="Custo interno" v={formatBRL(costTotal)} />
                  <Row l={`Lucro (${marginReal.toFixed(1)}%)`} v={formatBRL(profit)} tone={profit >= 0 ? 'ok' : 'bad'} />
                  {form.pricing_mode === 'por_convidado' && guests > 0 && <Row l="Por convidado" v={formatBRL(calc.total / guests)} />}
                </dl>
                {calc.total > 0 && profit < 0 && (
                  <p className="flex gap-2 text-xs rounded-lg bg-destructive/5 border border-destructive/20 text-destructive p-3">
                    <AlertTriangle className="size-4 shrink-0" /> Prejuízo estimado: o valor está abaixo dos seus custos.
                  </p>
                )}
                {calc.total > 0 && profit >= 0 && marginReal < 15 && (
                  <p className="flex gap-2 text-xs rounded-lg bg-warning/10 border border-warning/30 text-slate-700 p-3">
                    <AlertTriangle className="size-4 shrink-0 text-warning" /> Margem baixa (abaixo de 15%).
                  </p>
                )}
                {guests > 0 && (
                  <p className="flex gap-2 text-xs rounded-lg bg-slate-50 border border-border text-slate-600 p-3">
                    <HardHat className="size-4 shrink-0 text-highlight" /> Equipe sugerida: {staff.waiters} garçons + {staff.kitchen} cozinha.
                  </p>
                )}
                <div className="hidden lg:block pt-1">
                  <Button type="submit" className="w-full h-14 bg-primary hover:bg-primary-dark text-white font-bold shadow-md" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Orçamento'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

function Row({ l, v, tone }: { l: string; v: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500 font-medium">{l}</dt>
      <dd className={`font-semibold text-right ${tone === 'ok' ? 'text-success' : tone === 'bad' ? 'text-destructive' : 'text-slate-900'}`}>{v}</dd>
    </div>
  );
}
