'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

export default function FinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState({ total_receivable: 0, total_payable: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const items = data || [];
      setTransactions(items);

      const summary = items.reduce((acc, curr) => {
        if (curr.type === 'receivable') acc.total_receivable += Number(curr.amount);
        else acc.total_payable += Number(curr.amount);
        return acc;
      }, { total_receivable: 0, total_payable: 0 });

      setCashFlow({
        ...summary,
        balance: summary.total_receivable - summary.total_payable
      });
    } catch (error: any) {
      toast.error('Erro ao carregar dados financeiros: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter neon-glow">Financeiro</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Controle de entradas, saídas e fluxo de caixa.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2 w-full md:w-auto min-h-[44px] sm:min-h-0">
          <Link href="/dashboard/finance/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Nova Transação
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card className="bg-white/5 border-green-500/20 neon-border backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-sm font-medium uppercase tracking-wider">Total a Receber</CardTitle>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 break-all">
              R$ {cashFlow.total_receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-red-500/20 neon-border backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-sm font-medium uppercase tracking-wider">Total a Pagar</CardTitle>
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-400 break-all">
              R$ {cashFlow.total_payable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-sm font-medium uppercase tracking-wider">Saldo em Caixa</CardTitle>
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white neon-glow break-all">
              R$ {cashFlow.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 sm:h-6 bg-primary rounded-full shrink-0"></span>
            Transações Recentes
          </h2>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white flex items-center gap-2 self-start sm:self-center min-h-[44px] sm:min-h-0">
            <Filter className="w-4 h-4 shrink-0" />
            Filtrar
          </Button>
        </div>

        {/* Cards para mobile */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-zinc-500 rounded-xl border border-white/10 bg-white/5">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
              <span className="text-sm">Carregando transações...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-500 italic rounded-xl border border-dashed border-white/10 bg-white/5 text-sm">
              Nenhuma transação registrada.
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {t.type === 'receivable' ? (
                        <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          <ArrowUpRight className="w-3 h-3" />
                          Receita
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          <ArrowDownRight className="w-3 h-3" />
                          Despesa
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm font-medium text-white break-words">{t.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border shrink-0 ${
                    t.status === 'pago' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className={`mt-3 pt-3 border-t border-white/5 text-right font-bold text-lg ${t.type === 'receivable' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'receivable' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabela para desktop */}
        <div className="hidden md:block rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-zinc-400">Data</TableHead>
                  <TableHead className="text-zinc-400">Descrição</TableHead>
                  <TableHead className="text-zinc-400">Tipo</TableHead>
                  <TableHead className="text-zinc-400 text-right">Valor</TableHead>
                  <TableHead className="text-zinc-400 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                    Carregando transações...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500 italic">
                    Nenhuma transação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-white/5 border-white/5 transition-colors">
                    <TableCell className="text-zinc-300">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {t.description}
                    </TableCell>
                    <TableCell>
                      {t.type === 'receivable' ? (
                        <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold uppercase tracking-wider">
                          <ArrowUpRight className="w-3 h-3" />
                          Receita
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase tracking-wider">
                          <ArrowDownRight className="w-3 h-3" />
                          Despesa
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${t.type === 'receivable' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.type === 'receivable' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                        t.status === 'pago' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
