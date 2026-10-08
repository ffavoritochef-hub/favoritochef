'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  FileText,
  Utensils,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  HardHat,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { formatBRL, calcDeposit, staffGap } from '@/lib/buffet-rules';

export const dynamic = 'force-dynamic';

type Alert = { key: string; tone: 'danger' | 'warning'; icon: 'wallet' | 'staff'; text: string; href: string };

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    eventsMonth: 0,
    revenueMonth: 0,
    costsMonth: 0,
    clients: 0,
    awaiting: 0,
    upcoming: [] as any[],
    pendingBudgets: [] as any[],
    alerts: [] as Alert[],
  });

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
        const monthEnd = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        const today = iso(now);
        const in30 = iso(new Date(now.getTime() + 30 * 86400000));

        const [evRes, clientsRes, budRes, payRes, empRes, costRes] = await Promise.all([
          supabase.from('events').select('id, name, date, start_time, status, guest_count, agreed_value, client:clients(name)').neq('status', 'Cancelado').gte('date', monthStart).order('date'),
          supabase.from('clients').select('id', { count: 'exact', head: true }).neq('is_active', false),
          supabase.from('budgets').select('id, event_id, total_value, proposal_status, deposit_percent, created_at, events(name, client:clients(name))').in('proposal_status', ['rascunho', 'enviada']).order('created_at', { ascending: false }).limit(5),
          supabase.from('event_payments').select('event_id, amount, status'),
          supabase.from('event_employees').select('event_id'),
          supabase.from('finance_transactions').select('amount, event_id, date').eq('type', 'payable').not('event_id', 'is', null).gte('date', monthStart).lte('date', monthEnd),
        ]);

        const events = (evRes.data as any[]) || [];
        const inMonth = events.filter((e) => e.date <= monthEnd);
        const confirmed = inMonth.filter((e) => ['Aprovado', 'Em andamento', 'Finalizado'].includes(e.status));

        const received: Record<string, number> = {};
        (payRes.data || []).forEach((p: any) => {
          if (p.status === 'Recebido') received[p.event_id] = (received[p.event_id] || 0) + Number(p.amount || 0);
        });
        const staffCount: Record<string, number> = {};
        (empRes.data || []).forEach((r: any) => (staffCount[r.event_id] = (staffCount[r.event_id] || 0) + 1));
        const depositByEvent: Record<string, number> = {};
        ((budRes.data as any[]) || []).forEach((b) => (depositByEvent[b.event_id] ??= Number(b.deposit_percent) || 30));

        const alerts: Alert[] = [];
        events
          .filter((e) => e.date >= today && e.date <= in30 && ['Aprovado', 'Em andamento'].includes(e.status))
          .forEach((e) => {
            const need = calcDeposit(Number(e.agreed_value) || 0, depositByEvent[e.id] ?? 30).deposit;
            if (need > 0 && (received[e.id] || 0) + 0.005 < need) {
              alerts.push({
                key: 'p' + e.id, tone: 'danger', icon: 'wallet', href: `/dashboard/events/${e.id}`,
                text: `${e.name}: sinal pendente (${formatBRL(received[e.id] || 0)} de ${formatBRL(need)})`,
              });
            }
            const g = staffGap(Number(e.guest_count) || 0, staffCount[e.id] || 0);
            if (!g.ok) {
              alerts.push({
                key: 's' + e.id, tone: 'warning', icon: 'staff', href: `/dashboard/events/${e.id}/edit`,
                text: `${e.name}: equipe incompleta (faltam ${g.missing} de ${g.total} sugeridos)`,
              });
            }
          });

        setData({
          eventsMonth: inMonth.length,
          revenueMonth: confirmed.reduce((a, e) => a + (Number(e.agreed_value) || 0), 0),
          costsMonth: (costRes.data || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0),
          clients: clientsRes.count || 0,
          awaiting: events.filter((e) => ['Orçamento enviado', 'Aguardando aprovação'].includes(e.status)).length,
          upcoming: events.filter((e) => e.date >= today).slice(0, 5),
          pendingBudgets: (budRes.data as any[]) || [],
          alerts: alerts.slice(0, 6),
        });
      } catch (e) {
        console.error('Erro ao carregar dashboard', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const result = data.revenueMonth - data.costsMonth;
  const kpis = [
    { label: 'Eventos no mês', value: String(data.eventsMonth), icon: CalendarIcon, tone: 'primary' },
    { label: 'Faturamento fechado', value: formatBRL(data.revenueMonth), icon: DollarSign, tone: 'success' },
    { label: 'Resultado do mês', value: formatBRL(result), icon: result >= 0 ? TrendingUp : TrendingDown, tone: result >= 0 ? 'success' : 'destructive', sub: `Custos vinculados: ${formatBRL(data.costsMonth)}` },
    { label: 'Aguardando resposta', value: String(data.awaiting), icon: FileText, tone: 'warning' },
  ] as const;
  const toneBg: Record<string, string> = { primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', destructive: 'bg-destructive/10 text-destructive' };

  return (
    <div className="w-full space-y-5 sm:space-y-6 lg:space-y-8">
      <header className="hidden md:block">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Olá, {user?.email?.split('@')[0]}! 👋</h1>
        <p className="text-slate-500 mt-1.5 text-sm">Resumo do seu buffet neste mês.</p>
      </header>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-white border-border shadow-card rounded-2xl">
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-500 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">{k.label}</p>
                <span className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${toneBg[k.tone]}`}>
                  <k.icon className="size-5" />
                </span>
              </div>
              {loading ? (
                <div className="h-8 w-24 rounded bg-slate-100 animate-pulse" />
              ) : (
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold break-words ${k.tone === 'destructive' ? 'text-destructive' : 'text-slate-900'}`}>{k.value}</p>
              )}
              {'sub' in k && <p className="text-xs text-slate-500">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-destructive rounded-full" /> Atenção nos próximos 30 dias
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {data.alerts.map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 min-h-[52px] text-sm transition hover:shadow-sm ${a.tone === 'danger' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/40 bg-warning/10'}`}
              >
                {a.icon === 'wallet' ? <Wallet className="size-5 text-destructive shrink-0" /> : <HardHat className="size-5 text-warning shrink-0" />}
                <span className="flex-1 min-w-0 text-slate-800">{a.text}</span>
                <ChevronRight className="size-4 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 w-full">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-primary rounded-full" />Próximos Eventos</h2>
            <Button asChild variant="outline" size="sm" className="h-10 px-4 rounded-xl font-semibold text-primary border-border"><Link href="/dashboard/events">Ver todos</Link></Button>
          </div>
          <Card className="bg-white border-border shadow-card rounded-2xl">
            <CardContent className="p-0">
              {data.upcoming.length === 0 ? (
                <div className="p-8 text-center space-y-4">
                  <CalendarIcon className="size-10 mx-auto text-primary/50" />
                  <p className="font-semibold text-slate-900">Nenhum evento agendado</p>
                  <Button asChild className="bg-primary hover:bg-primary-dark text-white h-12 px-6 rounded-xl font-semibold w-full sm:w-auto">
                    <Link href="/dashboard/events/new"><PlusCircle className="size-5" /> Agendar Evento</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.upcoming.map((e) => (
                    <li key={e.id}>
                      <Link href={`/dashboard/events/${e.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50 min-h-[64px]">
                        <div className="size-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-lg font-bold leading-none text-slate-900">{new Date(e.date + 'T12:00:00').getDate()}</span>
                          <span className="text-[10px] uppercase font-bold text-primary">{new Date(e.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{e.name}</p>
                          <p className="text-xs text-slate-500 truncate">{e.client?.name} · {e.guest_count} convidados · {String(e.start_time).slice(0, 5)}</p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 hidden sm:block">{e.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-warning rounded-full" />Propostas em aberto</h2>
            <Button asChild variant="outline" size="sm" className="h-10 px-4 rounded-xl font-semibold text-primary border-border"><Link href="/dashboard/budgets">Ver todas</Link></Button>
          </div>
          <Card className="bg-white border-border shadow-card rounded-2xl">
            <CardContent className="p-0">
              {data.pendingBudgets.length === 0 ? (
                <div className="p-8 text-center space-y-4">
                  <FileText className="size-10 mx-auto text-warning/60" />
                  <p className="font-semibold text-slate-900">Sem propostas em aberto</p>
                  <Button asChild variant="outline" className="h-12 px-6 rounded-xl font-semibold text-primary border-primary/30 w-full sm:w-auto"><Link href="/dashboard/budgets/new">Gerar novo orçamento</Link></Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.pendingBudgets.map((b) => (
                    <li key={b.id}>
                      <Link href="/dashboard/budgets" className="flex items-center gap-3 p-4 hover:bg-slate-50 min-h-[64px]">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{b.events?.name}</p>
                          <p className="text-xs text-slate-500 truncate">{b.events?.client?.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900 text-sm">{formatBRL(Number(b.total_value))}</p>
                          <p className={`text-[11px] font-semibold ${b.proposal_status === 'enviada' ? 'text-sky-600' : 'text-slate-500'}`}>{b.proposal_status === 'enviada' ? 'Enviada ao cliente' : 'Rascunho'}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="space-y-3 w-full">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-highlight rounded-full" />Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
          {[
            { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarIcon, bg: 'bg-primary/10 text-primary' },
            { href: '/dashboard/budgets/new', label: '+ Orçamento', icon: FileText, bg: 'bg-success/10 text-success' },
            { href: '/dashboard/clients/new', label: '+ Cliente', icon: Users, bg: 'bg-info/10 text-info' },
            { href: '/dashboard/menu', label: 'Cardápio', icon: Utensils, bg: 'bg-highlight/10 text-highlight' },
          ].map((q) => (
            <Link key={q.href} href={q.href} className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border border-border bg-white hover:bg-primary/5 hover:border-primary/30 transition shadow-sm min-h-[96px]">
              <span className={`size-11 rounded-xl flex items-center justify-center ${q.bg}`}><q.icon className="size-6" /></span>
              <span className="text-sm font-semibold text-slate-700">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
