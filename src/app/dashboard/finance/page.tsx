'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Calendar,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { expenseSituation, isPending } from '@/lib/expenses';
import { ReimbursementsPanel } from '@/components/finance/ReimbursementsPanel';

const statusStyles: Record<string, string> = {
  'pago': 'bg-success text-white border-success rounded-full',
  'recebido': 'bg-success text-white border-success rounded-full',
  'pendente': 'bg-warning text-white border-warning rounded-full',
  'atrasado': 'bg-destructive text-white border-destructive rounded-full',
};

export default function FinancePage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'receivable' | 'payable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'pago' | 'reembolsar'>('all');
  const [month, setMonth] = useState(''); // YYYY-MM

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    id: string;
    description?: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*, event:events(name, client:clients(name))')
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados financeiros: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function openDelete(t: any) {
    const amt = Number(t.amount || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    setConfirmData({
      id: t.id,
      description: `${t.type === 'receivable' ? 'Receita' : 'Despesa'} de ${amt} — ${t.description || 'Sem descrição'}`,
    });
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmData) return;
    setConfirmLoading(true);
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', confirmData.id);
      if (error) throw error;
      toast.success('Transação excluída permanentemente.');
      setConfirmOpen(false);
      setConfirmData(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Falha ao excluir transação.');
    } finally {
      setConfirmLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (month && !String(t.date || '').startsWith(month)) return false;
      if (statusFilter === 'pendente' && !isPending(t.status)) return false;
      if (statusFilter === 'pago' && isPending(t.status)) return false;
      if (statusFilter === 'reembolsar' && !(t.paid_by && isPending(t.status))) return false;
      if (q) {
        const hay = [t.description, t.category, t.paid_by, t.event?.name, t.event?.client?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, typeFilter, statusFilter, month]);

  // Resumo do que está filtrado: realizado x pendente.
  const cashFlow = useMemo(() => {
    const acc = { received: 0, paid: 0, toReceive: 0, toPay: 0, toReimburse: 0 };
    filtered.forEach((t) => {
      const v = Number(t.amount || 0);
      const pending = isPending(t.status);
      if (t.type === 'receivable') {
        if (pending) acc.toReceive += v;
        else acc.received += v;
      } else if (pending) {
        acc.toPay += v;
        if (t.paid_by) acc.toReimburse += v;
      } else {
        acc.paid += v;
      }
    });
    return { ...acc, balance: acc.received - acc.paid };
  }, [filtered]);

  const hasFilter = !!(search || month || typeFilter !== 'all' || statusFilter !== 'all');
  const brl = (n: number) =>
    'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function situationLabel(t: any) {
    if (t.type === 'payable') return expenseSituation(t).label;
    return isPending(t.status) ? 'A receber' : 'Recebido';
  }

  function handleEdit(id: string) {
    router.push(`/dashboard/finance/${id}/edit`);
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
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Entradas recebidas</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-success/10 flex items-center justify-center border border-success/20">
              <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-success shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-success break-all">
              {brl(cashFlow.received)}
            </p>
            {cashFlow.toReceive > 0 && (
              <p className="text-xs mt-1 font-semibold text-slate-500">+ {brl(cashFlow.toReceive)} a receber</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Saídas pagas</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <TrendingDown className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-destructive shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-destructive break-all">
              {brl(cashFlow.paid)}
            </p>
            {cashFlow.toPay > 0 && (
              <p className="text-xs mt-1 font-semibold text-slate-500">
                + {brl(cashFlow.toPay)} a pagar
                {cashFlow.toReimburse > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('reembolsar')}
                    className="block text-warning hover:underline"
                  >
                    {brl(cashFlow.toReimburse)} a reembolsar (ver)
                  </button>
                )}
              </p>
            )}
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
              {brl(cashFlow.balance)}
            </p>
            <p className="text-xs mt-1 font-semibold text-slate-500">
              {hasFilter ? 'Considerando os filtros' : 'Recebido − pago'}
            </p>
          </CardContent>
        </Card>
      </div>

      <ReimbursementsPanel transactions={transactions} onChanged={fetchData} />

      <div className="space-y-3 sm:space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 sm:px-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-6 sm:h-7 bg-primary rounded-full shrink-0"></span>
            Transações
            <span className="text-sm font-semibold text-slate-400">({filtered.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-1 sm:px-0">
          <div className="relative col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar descrição, evento, cliente, quem pagou..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 lg:h-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="h-11 lg:h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-700"
            aria-label="Tipo"
          >
            <option value="all">Receitas e despesas</option>
            <option value="receivable">Só receitas</option>
            <option value="payable">Só despesas</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-11 lg:h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-700"
            aria-label="Situação"
          >
            <option value="all">Qualquer situação</option>
            <option value="pago">Pago / recebido</option>
            <option value="pendente">Pendente</option>
            <option value="reembolsar">A reembolsar</option>
          </select>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-11 lg:h-10 w-full lg:w-44"
            aria-label="Mês"
          />
          {hasFilter ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setStatusFilter('all');
                setMonth('');
              }}
              className="h-11 lg:h-10 rounded-xl text-slate-500"
            >
              <X className="size-4" />
              Limpar
            </Button>
          ) : (
            <span className="hidden lg:block" />
          )}
        </div>

        <div className="md:hidden space-y-3 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4 rounded-2xl border border-border bg-white mx-1">
              <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary"></div>
              <p className="text-sm font-medium">Carregando transações...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-white text-slate-500 p-6 text-center mx-1">
              <Wallet className="w-14 h-14 mb-4 shrink-0 text-primary/40" />
              <p className="text-base sm:text-lg font-semibold text-slate-900">
                {hasFilter ? 'Nada encontrado com esses filtros.' : 'Nenhuma transação registrada.'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                {hasFilter ? 'Ajuste ou limpe os filtros.' : 'Clique em "Nova Transação" para começar.'}
              </p>
            </div>
          ) : (
            filtered.map((t) => (
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
                      <span className="text-xs text-slate-500 font-medium">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 break-words leading-relaxed">{t.description}</p>
                    {(t.category || t.paid_by) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {t.category}
                        {t.category && t.paid_by ? ' · ' : ''}
                        {t.paid_by && <>pago por <span className="font-semibold text-slate-700">{t.paid_by}</span></>}
                      </p>
                    )}
                    {t.event && (
                      <p className="text-[11px] sm:text-xs mt-1.5 font-semibold text-primary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.event.name}</span>
                        {t.event.client && (
                          <span className="text-slate-500 ml-0.5">
                            ({t.event.client.name})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className={`text-[11px] px-3 py-1 rounded-full border font-bold uppercase tracking-tight shrink-0 ${
                    statusStyles[t.status] || 'bg-slate-700 text-white border-slate-600 rounded-full'
                  }`}>
                    {situationLabel(t)}
                  </span>
                </div>
                <div className={`border-t border-slate-100 pt-3 mt-4 flex items-end justify-between gap-3 ${
                  t.type === 'receivable' ? 'text-success' : 'text-destructive'
                }`}>
                  <span className="font-bold text-xl sm:text-2xl">
                    {t.type === 'receivable' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(t.id)}
                      className="size-11 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/30" aria-label="Editar"
                      title="Editar"
                    >
                      <Pencil className="size-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDelete(t)}
                      className="size-11 shrink-0 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white" aria-label="Excluir"
                      title="Excluir"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block bg-white border-border shadow-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[880px]">
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-slate-600 font-semibold text-sm">Data</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm">Descrição</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm">Evento Vinculado</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm">Tipo</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm text-right">Valor</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm text-center">Status</TableHead>
                  <TableHead className="text-slate-600 font-semibold text-sm text-right w-[180px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="text-sm font-medium">Carregando transações...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic font-medium">
                    {hasFilter ? 'Nada encontrado com esses filtros.' : 'Nenhuma transação registrada.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                    <TableCell className="text-slate-700 font-semibold text-sm">
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-semibold text-slate-900">{t.description}</span>
                      {(t.category || t.paid_by) && (
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {t.category}
                          {t.category && t.paid_by ? ' · ' : ''}
                          {t.paid_by && <>pago por <span className="font-semibold text-slate-700">{t.paid_by}</span></>}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.event ? (
                        <Link
                          href={`/dashboard/events/${t.event_id}`}
                          className="text-primary font-semibold hover:underline inline-flex items-center gap-1.5 max-w-[220px]"
                        >
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{t.event.name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
                        {situationLabel(t)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(t.id)}
                          className="rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                          title="Editar"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDelete(t)}
                          className="rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5"
                          title="Excluir"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          if (confirmLoading) return;
          setConfirmOpen(v);
          if (!v) setConfirmData(null);
        }}
        title={`Excluir ${confirmData?.description || 'transação'}?`}
        description="Esta ação não pode ser desfeita. A transação será removida permanentemente do financeiro e deixará de influenciar nos cálculos de rentabilidade do evento vinculado."
        variant="destructive"
        dangerLabel="Exclusão permanente: afeta diretamente os relatórios e o fluxo de caixa."
        confirmText="Sim, excluir transação"
        onConfirm={handleConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}
