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

const statusStyles: Record<string, string> = {
  'pago': 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]',
  'recebido': 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]',
  'pendente': 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.45)]',
  'atrasado': 'bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.45)]',
};

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
    <div className="w-full space-y-4 sm:space-y-8 lg:space-y-10 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight neon-glow">Financeiro</h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-base leading-relaxed">Controle de entradas, saídas e fluxo de caixa.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/85 text-white font-extrabold transition-all shadow-[0_0_20px_rgba(188,19,254,0.35)] flex items-center gap-2 w-full md:w-auto min-h-[48px] px-5 rounded-xl text-base">
          <Link href="/dashboard/finance/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Nova Transação
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 w-full px-1 sm:px-0">
        <Card className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest">Total a Receber</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-400 break-all drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              R$ {cashFlow.total_receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/30 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest">Total a Pagar</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
              <TrendingDown className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-rose-400 shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-400 break-all drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
              R$ {cashFlow.total_payable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-primary/30 backdrop-blur-md rounded-2xl shadow-[0_0_30px_rgba(188,19,254,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-zinc-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest">Saldo em Caixa</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 shadow-[0_0_15px_rgba(188,19,254,0.25)]">
              <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className={`text-xl sm:text-2xl lg:text-3xl font-black neon-glow break-all ${
              cashFlow.balance >= 0 ? 'text-white' : 'text-rose-400'
            }`}>
              R$ {cashFlow.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 sm:space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 sm:px-0">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-6 sm:h-7 bg-primary rounded-full shrink-0"></span>
            Transações Recentes
          </h2>
          <Button variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary hover:text-white flex items-center gap-2 self-start sm:self-center min-h-[44px] px-5 rounded-xl font-bold">
            <Filter className="w-4 h-4 shrink-0" />
            Filtrar
          </Button>
        </div>

        <div className="md:hidden space-y-3 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] mx-1">
              <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary"></div>
              <p className="text-sm font-medium">Carregando transações...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.03] text-zinc-400 p-6 text-center mx-1">
              <Wallet className="w-14 h-14 mb-4 opacity-30 shrink-0 text-primary/50" />
              <p className="text-base sm:text-lg font-medium text-white/80">Nenhuma transação registrada.</p>
              <p className="text-xs sm:text-sm text-zinc-500 mt-2">Clique em &quot;Nova Transação&quot; para começar.</p>
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 sm:p-5 hover:from-white/[0.09] hover:to-white/[0.04] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_25px_rgba(188,19,254,0.12)] w-full">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      {t.type === 'receivable' ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase tracking-widest shrink-0 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Receita
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400 text-[10px] font-black uppercase tracking-widest shrink-0 px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/30">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          Despesa
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-white break-words leading-relaxed">{t.description}</p>
                  </div>
                  <span className={`text-[11px] px-3 py-1 rounded-full border font-extrabold uppercase tracking-tight shrink-0 ${
                    statusStyles[t.status] || 'bg-zinc-700 text-white border-zinc-600'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className={`mt-4 pt-3 border-t border-white/10 text-right font-black text-xl sm:text-2xl ${
                  t.type === 'receivable' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {t.type === 'receivable' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader className="bg-white/[0.05]">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-zinc-300 font-bold text-sm">Data</TableHead>
                  <TableHead className="text-zinc-300 font-bold text-sm">Descrição</TableHead>
                  <TableHead className="text-zinc-300 font-bold text-sm">Tipo</TableHead>
                  <TableHead className="text-zinc-300 font-bold text-sm text-right">Valor</TableHead>
                  <TableHead className="text-zinc-300 font-bold text-sm text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-400">
                    <div className="flex items-center justify-center gap-2 text-zinc-400">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="text-sm font-medium">Carregando transações...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-400 italic font-medium">
                    Nenhuma transação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-white/[0.05] border-white/5 transition-colors">
                    <TableCell className="text-zinc-200 font-semibold text-sm">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-semibold text-white text-sm">
                      {t.description}
                    </TableCell>
                    <TableCell>
                      {t.type === 'receivable' ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase tracking-widest">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Receita
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-rose-400 text-xs font-black uppercase tracking-widest">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          Despesa
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-black text-base ${
                      t.type === 'receivable' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {t.type === 'receivable' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-[11px] px-3 py-1 rounded-full border font-extrabold uppercase tracking-tight ${
                        statusStyles[t.status] || 'bg-zinc-700 text-white border-zinc-600'
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
