'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon, Users, DollarSign, FileText, Utensils } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="w-full space-y-5 sm:space-y-8 lg:space-y-10 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="px-1 sm:px-0">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight neon-glow">Olá, {user?.email?.split('@')[0]}!</h1>
        <p className="text-zinc-400 mt-1.5 sm:mt-2 text-xs sm:text-base leading-relaxed">Acompanhe tudo o que está acontecendo no seu Buffet.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5 w-full px-1 sm:px-0">
        <Card className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-primary/30 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(188,19,254,0.18)] rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">Eventos Mês</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(188,19,254,0.25)]">
              <CalendarIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black neon-glow text-white break-all">0</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.18)] rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">Faturamento</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <DollarSign className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 break-all drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">R$ 0,00</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent border-sky-500/30 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(14,165,233,0.18)] rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">Clientes</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
              <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white break-all">0</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.18)] rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">Pendentes</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white break-all">0</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full px-1 sm:px-0">
        <section className="space-y-3 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <h2 className="text-lg sm:text-2xl font-black flex items-center gap-2 sm:gap-3 text-white">
              <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(188,19,254,0.5)] shrink-0"></span>
              Próximos Eventos
            </h2>
            <Button asChild variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary hover:text-white transition-all self-start sm:self-center min-h-[44px] px-5 rounded-xl font-bold">
              <Link href="/dashboard/events">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10 backdrop-blur-md rounded-2xl">
            <CardContent className="p-6 sm:p-8 lg:p-10 text-center space-y-4">
              <CalendarIcon className="w-14 h-14 mx-auto opacity-30 shrink-0 text-primary/50 mb-2" />
              <p className="text-zinc-400 text-sm sm:text-base font-medium">Nenhum evento agendado para os próximos dias.</p>
              <Button asChild className="bg-primary hover:bg-primary/85 text-white font-extrabold transition-all shadow-[0_0_20px_rgba(188,19,254,0.35)] w-full sm:w-auto min-h-[48px] px-5 rounded-xl text-base">
                <Link href="/dashboard/events/new" className="flex items-center justify-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Criar Novo Evento
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <h2 className="text-lg sm:text-2xl font-black flex items-center gap-2 sm:gap-3 text-white">
              <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0"></span>
              Orçamentos Pendentes
            </h2>
            <Button asChild variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary hover:text-white transition-all self-start sm:self-center min-h-[44px] px-5 rounded-xl font-bold">
              <Link href="/dashboard/budgets">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10 backdrop-blur-md rounded-2xl">
            <CardContent className="p-6 sm:p-8 lg:p-10 text-center">
              <FileText className="w-14 h-14 mx-auto opacity-30 shrink-0 text-primary/50 mb-3" />
              <p className="text-zinc-400 text-sm sm:text-base font-medium">Não há orçamentos aguardando aprovação.</p>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="px-1 sm:px-0 pt-2 sm:pt-4">
        <h2 className="text-lg sm:text-2xl font-black flex items-center gap-2 sm:gap-3 text-white mb-3 sm:mb-5">
          <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-sky-500 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.5)] shrink-0"></span>
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 w-full">
          <Button asChild variant="outline" size="sm" className="flex flex-col gap-1 sm:gap-2 h-auto py-4 sm:py-5 px-3 rounded-2xl border-white/10 bg-white/[0.04] hover:bg-primary/15 hover:border-primary/40 hover:text-primary text-white transition-all duration-200">
            <Link href="/dashboard/agenda">
              <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
              <span className="text-xs sm:text-sm font-black">Agenda</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex flex-col gap-1 sm:gap-2 h-auto py-4 sm:py-5 px-3 rounded-2xl border-white/10 bg-white/[0.04] hover:bg-primary/15 hover:border-primary/40 hover:text-primary text-white transition-all duration-200">
            <Link href="/dashboard/budgets/new">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
              <span className="text-xs sm:text-sm font-black">+ Orçamento</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex flex-col gap-1 sm:gap-2 h-auto py-4 sm:py-5 px-3 rounded-2xl border-white/10 bg-white/[0.04] hover:bg-primary/15 hover:border-primary/40 hover:text-primary text-white transition-all duration-200">
            <Link href="/dashboard/clients/new">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
              <span className="text-xs sm:text-sm font-black">+ Cliente</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex flex-col gap-1 sm:gap-2 h-auto py-4 sm:py-5 px-3 rounded-2xl border-white/10 bg-white/[0.04] hover:bg-primary/15 hover:border-primary/40 hover:text-primary text-white transition-all duration-200">
            <Link href="/dashboard/menu">
              <Utensils className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
              <span className="text-xs sm:text-sm font-black">Cardápio</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
