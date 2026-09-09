'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  FileText,
  Utensils,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    eventCount: 0,
    clientsCount: 0,
    pendingBudgets: 0,
    totalReceivable: 0,
    totalPayable: 0,
    monthlyAgreedValue: 0,
    monthlyEventCosts: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const [{ count: eventCount }, { count: clientsCount }, { count: pendingBudgets }] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('budgets').select('*', { count: 'exact', head: true }),
      ]);

      const { data: monthEvents } = await supabase
        .from('events')
        .select('agreed_value')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      const monthlyAgreedValue = (monthEvents || []).reduce((sum, e) => sum + Number(e.agreed_value || 0), 0);

      const { data: txns } = await supabase
        .from('finance_transactions')
        .select('amount, type, event_id, date')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      let totalReceivable = 0;
      let totalPayable = 0;
      let monthlyEventCosts = 0;
      (txns || []).forEach((t) => {
        const amt = Number(t.amount || 0);
        if (t.type === 'receivable') totalReceivable += amt;
        else {
          totalPayable += amt;
          if (t.event_id) monthlyEventCosts += amt;
        }
      });

      setStats({
        eventCount: eventCount || 0,
        clientsCount: clientsCount || 0,
        pendingBudgets: pendingBudgets || 0,
        totalReceivable,
        totalPayable,
        monthlyAgreedValue,
        monthlyEventCosts,
      });

      const { data: nextEvents } = await supabase
        .from('events')
        .select('*, client:clients(name)')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(3);
      setUpcomingEvents(nextEvents || []);
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }

  const monthlyResult = stats.monthlyAgreedValue - stats.monthlyEventCosts;
  const cashBalance = stats.totalReceivable - stats.totalPayable;

  return (
    <div className="w-full space-y-5 sm:space-y-6 lg:space-y-8">
      <header className="hidden md:block">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
          Olá, {user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm">
          Bem-vindo ao seu sistema. Acompanhe tudo o que está acontecendo no seu Buffet.
        </p>
      </header>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 shrink-0" />
        <Input
          placeholder="Buscar no sistema..."
          className="pl-12 h-12 bg-white border-border rounded-2xl placeholder:text-slate-400 text-slate-900 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        <Card className="bg-white border-border shadow-card rounded-2xl hover:shadow-card-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Eventos Mês</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              {loading ? '-' : stats.eventCount}
            </p>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
              <span>Total de eventos agendados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl hover:shadow-card-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Faturamento Eventos</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-success shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 break-all">
              {loading ? '-' : `R$ ${stats.monthlyAgreedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
              <span>Valor acordado no mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl hover:shadow-card-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Clientes</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-info shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              {loading ? '-' : stats.clientsCount}
            </p>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
              <span>Clientes ativos cadastrados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl hover:shadow-card-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Orçamentos</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-warning shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              {loading ? '-' : stats.pendingBudgets}
            </p>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
              <span>Orçamentos gerados no total</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 w-full">
        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Custos Vinculados</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <ShoppingCart className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-destructive shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-destructive break-all">
              {loading ? '-' : `- R$ ${stats.monthlyEventCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-1.5 uppercase tracking-wide">Gastos dos eventos do mês</p>
          </CardContent>
        </Card>

        <Card className={`bg-white border-border shadow-card rounded-2xl border-2 ${monthlyResult >= 0 ? 'border-success/20' : 'border-destructive/20'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Resultado do Mês</CardTitle>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border ${monthlyResult >= 0 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
              {monthlyResult >= 0 ? (
                <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-success shrink-0" />
              ) : (
                <TrendingDown className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-destructive shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold break-all ${monthlyResult >= 0 ? 'text-success' : 'text-destructive'}`}>
              {loading ? '-' : `${monthlyResult >= 0 ? '+' : ''} R$ ${monthlyResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-1.5 uppercase tracking-wide">Acordado − Custos dos eventos</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Saldo em Caixa</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold break-all ${
              loading ? 'text-slate-900' : cashBalance >= 0 ? 'text-slate-900' : 'text-destructive'
            }`}>
              {loading ? '-' : `R$ ${cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
            <div className="flex gap-3 text-xs text-slate-500 font-semibold mt-1.5">
              <span className="flex items-center gap-1 text-success">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {loading ? '-' : `R$ ${stats.totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {loading ? '-' : `R$ ${stats.totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 w-full">
        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full shrink-0"></span>
              Próximos Eventos
            </h2>
            <Button asChild variant="outline" size="sm" className="border-border text-primary hover:bg-primary/5 hover:border-primary/30 transition-all self-start sm:self-center h-11 px-5 rounded-xl font-semibold">
              <Link href="/dashboard/events">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-white border-border shadow-card rounded-2xl overflow-hidden">
            {loading ? (
              <CardContent className="p-6 sm:p-8 flex items-center justify-center h-48 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            ) : upcomingEvents.length === 0 ? (
              <CardContent className="p-6 sm:p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <CalendarIcon className="w-8 h-8 text-primary/60 shrink-0" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-slate-900 font-semibold text-base">Nenhum evento agendado</p>
                  <p className="text-slate-500 text-sm">Comece agendando seu primeiro evento agora.</p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary-dark text-white font-semibold transition-all w-full sm:w-auto h-12 px-6 rounded-xl text-sm shadow-sm shadow-primary/15">
                  <Link href="/dashboard/events/new" className="flex items-center justify-center gap-2">
                    <PlusCircle className="w-5 h-5" />
                    Agendar Evento
                  </Link>
                </Button>
              </CardContent>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingEvents.map((event) => {
                  const d = new Date(event.date);
                  return (
                    <Link
                      key={event.id}
                      href={`/dashboard/events/${event.id}`}
                      className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 sm:py-5 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 border-primary/20 shrink-0">
                        <span className="text-xl sm:text-2xl font-bold leading-none text-slate-900">{d.getDate()}</span>
                        <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-primary mt-0.5">
                          {d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm sm:text-base font-bold text-slate-900 truncate">{event.name}</p>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">
                          {event.client?.name || 'Cliente não informado'}
                        </p>
                      </div>
                      {Number(event.agreed_value || 0) > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valor</p>
                          <p className="text-sm sm:text-base font-bold text-primary">
                            R$ {Number(event.agreed_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-warning rounded-full shrink-0"></span>
              Orçamentos Pendentes
            </h2>
            <Button asChild variant="outline" size="sm" className="border-border text-primary hover:bg-primary/5 hover:border-primary/30 transition-all self-start sm:self-center h-11 px-5 rounded-xl font-semibold">
              <Link href="/dashboard/budgets">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-white border-border shadow-card rounded-2xl">
            <CardContent className="p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-warning/70 shrink-0" />
              </div>
              <div className="space-y-1.5">
                <p className="text-slate-900 font-semibold text-base">Sem orçamentos pendentes</p>
                <p className="text-slate-500 text-sm">Todos os orçamentos foram respondidos.</p>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold text-primary border-primary/30 hover:bg-primary/5">
                <Link href="/dashboard/budgets/new">
                  Gerar Novo Orçamento
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="space-y-3 sm:space-y-4 w-full">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-highlight rounded-full shrink-0"></span>
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
          <Button asChild variant="outline" className="flex flex-col gap-2 h-auto py-5 sm:py-6 px-3 rounded-2xl border-border bg-white hover:bg-primary/5 hover:border-primary/30 hover:text-primary text-slate-700 transition-all shadow-sm">
            <Link href="/dashboard/agenda" className="w-full h-full">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              </div>
              <span className="text-sm font-semibold">Agenda</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex flex-col gap-2 h-auto py-5 sm:py-6 px-3 rounded-2xl border-border bg-white hover:bg-primary/5 hover:border-primary/30 hover:text-primary text-slate-700 transition-all shadow-sm">
            <Link href="/dashboard/budgets/new" className="w-full h-full">
              <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-success shrink-0" />
              </div>
              <span className="text-sm font-semibold">+ Orçamento</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex flex-col gap-2 h-auto py-5 sm:py-6 px-3 rounded-2xl border-border bg-white hover:bg-primary/5 hover:border-primary/30 hover:text-primary text-slate-700 transition-all shadow-sm">
            <Link href="/dashboard/clients/new" className="w-full h-full">
              <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center mx-auto">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-info shrink-0" />
              </div>
              <span className="text-sm font-semibold">+ Cliente</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex flex-col gap-2 h-auto py-5 sm:py-6 px-3 rounded-2xl border-border bg-white hover:bg-primary/5 hover:border-primary/30 hover:text-primary text-slate-700 transition-all shadow-sm">
            <Link href="/dashboard/menu" className="w-full h-full">
              <div className="w-11 h-11 rounded-xl bg-highlight/10 flex items-center justify-center mx-auto">
                <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-highlight shrink-0" />
              </div>
              <span className="text-sm font-semibold">Cardápio</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
