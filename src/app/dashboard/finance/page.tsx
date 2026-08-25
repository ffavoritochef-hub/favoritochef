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
  'pago': 'bg-success text-white border-success rounded-full',
  'recebido': 'bg-success text-white border-success rounded-full',
  'pendente': 'bg-warning text-white border-warning rounded-full',
  'atrasado': 'bg-destructive text-white border-destructive rounded-full',
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
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Financeiro</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base leading-relaxed">Controle de entradas, saídas e fluxo de caixa.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold shadow-sm flex items-center gap-2 w-full md:w-auto px-5 text-base">
          <Link href="/dashboard/finance/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Nova Transação
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 w-full px-1 sm:px-0">
        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total a Receber</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-success/10 flex items-center justify-center border border-success/20">
              <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-success shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-success break-all">
              R$ {cashFlow.total_receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total a Pagar</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <TrendingDown className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-destructive shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-destructive break-all">
              R$ {cashFlow.total_payable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Saldo em Caixa</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold break-all ${
              cashFlow.balance >= 0 ? 'text-slate-900' : 'text-destructive'
            }`}>
              R$ {cashFlow.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 sm:space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 sm:px-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-6 sm:h-7 bg-primary rounded-full shrink-0"></span>
            Transações Recentes
          </h2>
          <Button variant="outline" size="sm" className="border-border text-primary hover:bg-primary/5 hover:border-primary/30 h-11 px-5 rounded-xl font-semibold flex items-center gap-2 self-start sm:self-center">
            <Filter className="w-4 h-4 shrink-0" />
            Filtrar
          </Button>
        </div>

        <div className="md:hidden space-y-3 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4 rounded-2xl border border-border bg-white mx-1">
              <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary"></div>
              <p className="text-sm font-medium">Carregando transações...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-white text-slate-500 p-6 text-center mx-1">
              <Wallet className="w-14 h-14 mb-4 shrink-0 text-primary/40" />
              <p className="text-base sm:text-lg font-semibold text-slate-900">Nenhuma transação registrada.</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">Clique em &quot;Nova Transação&quot; para começar.</p>
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="group relative rounded-2xl border border-border bg-white shadow-card p-4 sm:p-5 hover:shadow-card-hover transition-all duration-200 w-full">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      {t.type === 'receivable' ? (
                        <span className="flex items-center gap-1 bg-success/10 border-success/20 text-success rounded-full px-2 py-1 text-[10px] uppercase font-bold tracking-widest shrink-0">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Receita
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-destructive/10 border-destructive/20 text-destructive rounded-full px-2 py-1 text-[10px] uppercase font-bold tracking-widest shrink-0">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          Despesa
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 break-words leading-relaxed">{t.description}</p>
                  </div>
                  <span className={`text-[11px] px-3 py-1 rounded-full border font-bold uppercase tracking-tight shrink-0 ${
                    statusStyles[t.status] || 'bg-slate-700 text-white border-slate-600 rounded-full'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className={`border-t border-slate-100 pt-3 mt-4 text-right font-bold text-xl sm:text-2xl ${
                  t.type === 'receivable' ? 'text-success' : 'text-destructive'
                }`}>
                  {t.type === 'receivable' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block bg-white border-border shadow-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-slate-600 font-semibold text-sm">Data</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm">Descrição</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm">Tipo</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm text-right">Valor</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="text-sm font-medium">Carregando transações...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic font-medium">
                    Nenhuma transação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                    <TableCell className="text-slate-700 font-semibold text-sm">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 text-sm">
                      {t.description}
                    </TableCell>
                    <TableCell>
                      {t.type === 'receivable' ? (
                        <span className="flex items-center gap-1.5 text-success text-xs uppercase font-bold tracking-widest">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Receita
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-destructive text-xs uppercase font-bold tracking-widest">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          Despesa
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-bold text-base ${
                      t.type === 'receivable' ? 'text-success' : 'text-destructive'
                    }`}>
                      {t.type === 'receivable' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-[11px] px-3 py-1 rounded-full border font-bold uppercase tracking-tight ${
                        statusStyles[t.status] || 'bg-slate-700 text-white border-slate-600 rounded-full'
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
