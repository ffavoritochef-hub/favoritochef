'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  PlusCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  BadgeCheck,
  ArrowDownRight,
  Trash2,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const statusStyles: Record<string, string> = {
  'Orçamento enviado': 'bg-sky-600 text-white border-sky-600 rounded-full',
  'Aguardando aprovação': 'bg-warning text-white border-warning rounded-full',
  'Aprovado': 'bg-success text-white border-success rounded-full',
  'Em andamento': 'bg-highlight text-white border-highlight rounded-full',
  'Finalizado': 'bg-slate-500 text-white border-slate-500 rounded-full',
  'Cancelado': 'bg-destructive text-white border-destructive rounded-full',
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [submitting, setSubmitting] = useState(false);

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [eventId]);

  async function fetchData() {
    try {
      setLoading(true);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*, client:clients(name)')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData || null);

      const { data: expensesData, error: expensesError } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('event_id', eventId)
        .eq('type', 'payable')
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const agreedValue = Number(event?.agreed_value || 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const balance = agreedValue - totalExpenses;
  const spendPercent = agreedValue > 0 ? (totalExpenses / agreedValue) * 100 : 0;
  const profitPercent = agreedValue > 0 ? (balance / agreedValue) * 100 : 0;

  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      toast.error('Preencha a descrição e o valor.');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('finance_transactions').insert([
        {
          description: newExpense.description,
          amount: newExpense.amount,
          type: 'payable',
          date: newExpense.date,
          status: 'pendente',
          event_id: eventId,
        },
      ]);

      if (error) throw error;

      toast.success(`${newExpense.description} adicionado | -R$ ${newExpense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      setNewExpense({ description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
      setAddDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error('Erro ao adicionar gasto: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteDialog.id) return;
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', deleteDialog.id);

      if (error) throw error;
      toast.success('Gasto removido com sucesso.');
      setDeleteDialog({ open: false, id: null });
      await fetchData();
    } catch (error: any) {
      toast.error('Erro ao remover gasto: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-sm font-medium">Carregando evento...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-slate-900 font-semibold">Evento não encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/events">Voltar para Eventos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-16 sm:pb-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0">
            <Link href="/dashboard/events">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 truncate">{event.name}</h1>
              <Badge className={`${statusStyles[event.status] || 'bg-slate-700'} border font-semibold text-[11px] shrink-0 px-3 py-1 uppercase tracking-tight`}>
                {event.status}
              </Badge>
            </div>
            <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base font-medium truncate">
              <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{event.client?.name}</span>
            </p>
          </div>
        </div>
        <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold shadow-sm shadow-primary/15 flex items-center gap-2 w-full md:w-auto px-5 text-base">
          <Link href={`/dashboard/events/${eventId}/edit`}>
            <Edit2 className="w-5 h-5 shrink-0" />
            Editar Dados
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 w-full px-1 sm:px-0">
        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Valor Acordado</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <DollarSign className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-all">
              R$ {agreedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            {agreedValue === 0 && (
              <p className="text-xs text-warning font-semibold mt-1.5 uppercase tracking-wide">Valor não informado</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Gasto</CardTitle>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <ShoppingCart className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-destructive shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1.5">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-destructive break-all">
              - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${spendPercent >= 100 ? 'bg-destructive' : spendPercent >= 75 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(spendPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              {spendPercent.toFixed(1)}% gasto do valor acordado
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-white border-border shadow-card rounded-2xl border-2 ${balance >= 0 ? 'border-success/20' : 'border-destructive/20'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
              {balance >= 0 ? 'Saldo (Lucro)' : 'Saldo (Prejuízo)'}
            </CardTitle>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border ${balance >= 0 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
              {balance >= 0 ? (
                <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-success shrink-0" />
              ) : (
                <TrendingDown className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-destructive shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 space-y-1.5">
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold break-all ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {balance >= 0 ? '+' : ''} R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <Badge className={`w-fit font-bold text-[11px] px-3 py-1 border rounded-full ${balance >= 0 ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
              {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}% margem
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-border shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <ShoppingCart className="size-5" />
                </span>
                Gastos do Evento
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1 ml-12 sm:ml-0">
                {expenses.length} {expenses.length === 1 ? 'gasto lançado' : 'gastos lançados'}
              </p>
            </div>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl h-12 font-semibold shadow-sm shadow-destructive/15 flex items-center gap-2 w-full sm:w-auto px-5 text-base"
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              Adicionar Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-0 py-0">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 sm:py-16 text-slate-500 px-6 text-center">
              <ShoppingCart className="w-14 h-14 mb-4 shrink-0 text-destructive/30" />
              <p className="text-base sm:text-lg font-semibold text-slate-900">Nenhum gasto registrado.</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">Clique em &quot;Adicionar Gasto&quot; para lançar os custos deste evento.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between gap-3 px-5 sm:px-8 py-4 sm:py-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowDownRight className="w-5 h-5 text-destructive shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 break-words leading-snug">{exp.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
                        <span className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {new Date(exp.date).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-tight ${
                          exp.status === 'pago' ? 'bg-success/10 text-success border-success/20' :
                          exp.status === 'pendente' ? 'bg-warning/10 text-warning border-warning/20' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {exp.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-sm sm:text-lg font-bold text-destructive whitespace-nowrap">
                      - R$ {Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteDialog({ open: true, id: exp.id })}
                      className="size-9 text-slate-400 hover:text-destructive hover:bg-destructive/5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {expenses.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 sm:px-8 py-4 sm:py-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Resumo</p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Subtotal de gastos: R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {' • '}
                    {spendPercent.toFixed(1)}% do valor acordado
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg sm:text-xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {balance >= 0 ? 'Lucro estimado: ' : 'Prejuízo: '}
                    R$ {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-border shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-4 sm:py-5">
          <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="size-5" />
            </span>
            Detalhes do Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 sm:px-8 py-5 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="flex items-start gap-3">
              <CalendarIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</p>
                <p className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5">
                  {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horário</p>
                <p className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5">
                  {event.start_time?.slice(0, 5)} às {event.end_time?.slice(0, 5)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Convidados</p>
                <p className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5">
                  {event.guest_count} pessoas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:col-span-2">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Endereço</p>
                <p className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5 break-words">
                  {event.address}
                </p>
              </div>
            </div>
            {event.observations && (
              <div className="flex items-start gap-3 sm:col-span-2 pt-1">
                <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-500">i</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observações</p>
                  <p className="text-sm sm:text-base font-medium text-slate-700 mt-0.5 break-words leading-relaxed whitespace-pre-wrap">
                    {event.observations}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md !rounded-2xl">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-destructive/10 text-destructive border-destructive/20">
                <PlusCircle className="size-5" />
              </div>
              <div className="space-y-1.5 text-left">
                <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                  Adicionar Gasto
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 leading-relaxed">
                  Lançamento direto no evento. O valor será subtraído automaticamente do saldo.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5 pt-1">
            <div className="field-group">
              <Label htmlFor="exp-desc">Descrição</Label>
              <Input
                id="exp-desc"
                placeholder="Ex: Carvão 2 sacos, Cerveja, Equipe..."
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="field-group">
                <Label htmlFor="exp-amount">Valor (R$)</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="field-group">
                <Label htmlFor="exp-date">Data</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500 font-medium mb-1">Prévia</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">Novo saldo após lançamento:</span>
                <span className={`text-sm sm:text-base font-bold ${(agreedValue - (totalExpenses + newExpense.amount)) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {(agreedValue - (totalExpenses + newExpense.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddExpense}
              disabled={submitting}
              className="w-full sm:w-auto h-11 rounded-xl font-semibold px-5 bg-destructive hover:bg-destructive/90 text-white shadow-sm shadow-destructive/20"
            >
              {submitting ? 'Adicionando...' : 'Adicionar Gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(o) => setDeleteDialog({ open: o, id: o ? deleteDialog.id : null })}
        title="Remover gasto?"
        description="O gasto será removido do evento, mas continuará aparecendo no financeiro geral? Não — esta ação exclui permanentemente a transação."
        confirmText="Remover Gasto"
        onConfirm={handleDeleteExpense}
        loading={submitting}
        dangerLabel="Esta transação será excluída do financeiro também."
      />
    </div>
  );
}
