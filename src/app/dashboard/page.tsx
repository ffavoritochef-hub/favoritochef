'use client';

import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user } = useAuth();

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
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">0</p>
            <div className="flex items-center gap-1 text-success text-xs font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>12,5% vs mês passado</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl hover:shadow-card-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Faturamento</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-success shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">R$ 0,00</p>
            <div className="flex items-center gap-1 text-success text-xs font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>8,2% vs mês passado</span>
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
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">0</p>
            <div className="flex items-center gap-1 text-success text-xs font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>5,3% vs mês passado</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl hover:shadow-card-hover transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pendentes</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-warning shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">0</p>
            <div className="flex items-center gap-1 text-destructive text-xs font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>2,1% vs semana passada</span>
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
          <Card className="bg-white border-border shadow-card rounded-2xl">
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
