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
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tighter neon-glow">Bem-vindo, {user?.email?.split('@')[0]}</h1>
        <p className="text-zinc-400 mt-2">Aqui está o que está acontecendo no seu Buffet hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Eventos do Mês</CardTitle>
            <CalendarIcon className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold neon-glow text-white">0</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Faturamento</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold neon-glow text-primary">R$ 0,00</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Clientes Ativos</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold neon-glow text-white">0</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md transition-all hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Pendentes</CardTitle>
            <PlusCircle className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold neon-glow text-white">0</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(188,19,254,0.5)]"></span>
              Próximos Eventos
            </h2>
            <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-white transition-all">
              <Link href="/dashboard/events">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-white/5 border-white/5 backdrop-blur-sm">
            <CardContent className="p-10 text-center space-y-4">
              <p className="text-zinc-500 italic">Nenhum evento agendado para os próximos dias.</p>
              <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)]">
                <Link href="/dashboard/events/new" className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Criar Novo Evento
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(188,19,254,0.5)]"></span>
              Orçamentos Pendentes
            </h2>
            <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-white transition-all">
              <Link href="/dashboard/budgets">Ver Todos</Link>
            </Button>
          </div>
          <Card className="bg-white/5 border-white/5 backdrop-blur-sm">
            <CardContent className="p-10 text-center">
              <p className="text-zinc-500 italic text-sm">Não há orçamentos aguardando aprovação.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
