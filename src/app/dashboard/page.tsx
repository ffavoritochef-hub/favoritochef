'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <header>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tighter neon-glow">Bem-vindo, {user?.email?.split('@')[0]}</h1>
        <p className="text-zinc-400 mt-1.5 sm:mt-2 text-sm sm:text-base">Aqui está o que está acontecendo no seu Buffet hoje.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Eventos do Mês</CardTitle>
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-glow text-white">0</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Faturamento</CardTitle>
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-glow text-primary">R$ 0,00</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Clientes</CardTitle>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-glow text-white">0</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">Pendentes</CardTitle>
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold neon-glow text-white">0</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(188,19,254,0.5)] shrink-0"></span>
              Próximos Eventos
            </h2>
            <Button asChild variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary hover:text-white transition-all self-start sm:self-center">
              <Link href="/dashboard/events">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-white/5 border-white/5 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8 lg:p-10 text-center space-y-4">
              <p className="text-zinc-500 italic text-sm sm:text-base">Nenhum evento agendado para os próximos dias.</p>
              <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] w-full sm:w-auto min-h-[44px] sm:min-h-0">
                <Link href="/dashboard/events/new" className="flex items-center justify-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Criar Novo Evento
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(188,19,254,0.5)] shrink-0"></span>
              Orçamentos Pendentes
            </h2>
            <Button asChild variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary hover:text-white transition-all self-start sm:self-center">
              <Link href="/dashboard/budgets">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-white/5 border-white/5 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8 lg:p-10 text-center">
              <p className="text-zinc-500 italic text-sm">Não há orçamentos aguardando aprovação.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
