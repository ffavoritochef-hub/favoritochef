'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  Edit,
  Calendar,
  Clock,
  MapPin,
  Users,
  HardHat,
  PlusCircle,
  TrendingUp,
  Wallet,
  Pencil,
  Trash2,
  Banknote,
  Receipt,
  Sparkles,
  UserCheck,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const statusStyles: Record<string, string> = {
  'Orçamento enviado': 'bg-sky-600 text-white border-sky-600 rounded-full',
  'Aguardando aprovação': 'bg-warning text-white border-warning rounded-full',
  'Confirmado': 'bg-success text-white border-success rounded-full',
  'Aprovado': 'bg-success text-white border-success rounded-full',
  'Em andamento': 'bg-highlight text-white border-highlight rounded-full',
  'Finalizado': 'bg-slate-500 text-white border-slate-500 rounded-full',
  'Concluído': 'bg-slate-500 text-white border-slate-500 rounded-full',
  'Cancelado': 'bg-destructive text-white border-destructive rounded-full',
};

const paymentMethods = [
  'Pix',
  'Dinheiro',
  'Cartão',
  'Transferência',
  'Boleto',
  'Outro',
];

const paymentStatuses = ['Recebido', 'Previsão'];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  status: string;
  notes: string | null;
  register_in_finance: boolean;
};

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    method: 'Pix',
    status: 'Recebido',
    notes: '',
    register_in_finance: true,
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    id: string;
    kind: 'payment_delete';
    description?: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [eventId]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [eventRes, paymentsRes, teamRes, expRes] = await Promise.all([
        supabase
          .from('events')
          .select('*, client:clients(name, phone, email)')
          .eq('id', eventId)
          .single(),
        supabase
          .from('event_payments')
          .select('*')
          .eq('event_id', eventId)
          .order('payment_date', { ascending: false }),
        supabase
          .from('event_employees')
          .select('employee_id, specific_role, employee:employees(id, name, role, phone)')
          .eq('event_id', eventId),
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('event_id', eventId)
          .eq('type', 'payable')
          .order('date', { ascending: false }),
      ]);
      if (eventRes.error) throw eventRes.error;
      setEvent(eventRes.data);
      setPayments((paymentsRes.data as Payment[]) || []);
      setEmployees((teamRes.data || []).map((l: any) => ({
        ...(l.employee || {}),
        specific_role: l.specific_role,
      })));
      setExpenses(expRes.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar evento: ' + error.message);
      router.push('/dashboard/events');
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const agreed = Number(event?.agreed_value || 0);
    const received = payments
      .filter((p) => p.status === 'Recebido')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const allExpected = payments.reduce(
      (acc, p) => acc + Number(p.amount || 0),
      0
    );
    const balance = agreed - received;
    const progress = agreed > 0 ? Math.min(100, (received / agreed) * 100) : 0;
    const totalExpenses = expenses.reduce(
      (acc, t) => acc + Number(t.amount || 0),
      0
    );
    const profit = agreed - totalExpenses;
    return {
      agreed,
      received,
      allExpected,
      balance,
      progress,
      totalExpenses,
      profit,
    };
  }, [event, payments, expenses]);

  function openNewPayment() {
    setEditingPayment(null);
    setPaymentForm({
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      method: 'Pix',
      status: 'Recebido',
      notes: '',
      register_in_finance: true,
    });
    setPaymentDialogOpen(true);
  }

  function openEditPayment(p: Payment) {
    setEditingPayment(p);
    setPaymentForm({
      amount: Number(p.amount),
      payment_date: p.payment_date,
      method: p.method || 'Outro',
      status: p.status || 'Recebido',
      notes: p.notes || '',
      register_in_finance: !!p.register_in_finance,
    });
    setPaymentDialogOpen(true);
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error('Informe um valor válido para o pagamento.');
      return;
    }
    setPaymentLoading(true);
    try {
      const payload = {
        event_id: eventId,
        amount: Number(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        method: paymentForm.method,
        status: paymentForm.status,
        notes: paymentForm.notes || null,
        register_in_finance: !!paymentForm.register_in_finance,
      };

      let financeId: string | null = null;
      if (payload.register_in_finance) {
        const ftPayload = {
          type: 'receivable' as const,
          description: `Pagamento cliente: ${event?.client?.name || ''} / ${event?.name || 'Evento'}${
            payload.status === 'Previsão' ? ' (Previsão)' : ''
          }`,
          amount: payload.amount,
          date: payload.payment_date,
          status:
            payload.status === 'Recebido'
              ? 'recebido'
              : 'pendente',
          event_id: eventId,
          category: 'Vendas de Evento',
        };
        if (editingPayment?.register_in_finance) {
          const existing = payments.find(
            (x) => x.id === editingPayment.id
          ) as any;
          const fid = existing?.finance_transaction_id;
          if (fid) {
            const { error } = await supabase
              .from('finance_transactions')
              .update(ftPayload)
              .eq('id', fid);
            if (error) throw error;
            financeId = fid;
          } else {
            const { data } = await supabase
              .from('finance_transactions')
              .insert([ftPayload])
              .select('id');
            financeId = data?.[0]?.id || null;
          }
        } else {
          const { data } = await supabase
            .from('finance_transactions')
            .insert([ftPayload])
            .select('id');
          financeId = data?.[0]?.id || null;
        }
      }

      if (editingPayment) {
        const updatePayload: any = { ...payload };
        if (payload.register_in_finance && financeId) {
          updatePayload.finance_transaction_id = financeId;
        }
        const { error } = await supabase
          .from('event_payments')
          .update(updatePayload)
          .eq('id', editingPayment.id);
        if (error) throw error;
        toast.success('Pagamento atualizado com sucesso.');
      } else {
        const insertPayload: any = { ...payload };
        if (payload.register_in_finance && financeId) {
          insertPayload.finance_transaction_id = financeId;
        }
        const { error } = await supabase
          .from('event_payments')
          .insert([insertPayload]);
        if (error) throw error;
        toast.success('Pagamento registrado com sucesso.');
      }

      setPaymentDialogOpen(false);
      await fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Falha ao registrar pagamento.');
    } finally {
      setPaymentLoading(false);
    }
  }

  function openDeletePayment(p: Payment) {
    setConfirmData({
      id: p.id,
      kind: 'payment_delete',
      description: `pagamento de ${formatCurrency(Number(p.amount))} em ${new Date(
        p.payment_date
      ).toLocaleDateString('pt-BR')}`,
    });
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmData) return;
    setConfirmLoading(true);
    try {
      if (confirmData.kind === 'payment_delete') {
        const pay = payments.find((p) => p.id === confirmData.id) as any;
        if (pay?.register_in_finance && pay?.finance_transaction_id) {
          await supabase
            .from('finance_transactions')
            .delete()
            .eq('id', pay.finance_transaction_id);
        }
        const { error } = await supabase
          .from('event_payments')
          .delete()
          .eq('id', confirmData.id);
        if (error) throw error;
        toast.success('Pagamento excluído.');
      }
      setConfirmOpen(false);
      setConfirmData(null);
      await fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Falha ao executar operação.');
    } finally {
      setConfirmLoading(false);
    }
  }

  if (loading || !event) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
        <div className="animate-pulse space-y-6 sm:space-y-8">
          <div className="h-12 bg-slate-200 rounded-2xl w-3/4"></div>
          <div className="h-40 bg-slate-200 rounded-2xl"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const progressColor =
    totals.progress >= 100
      ? 'bg-success'
      : totals.progress >= 50
      ? 'bg-primary'
      : 'bg-warning';

  return (
    <div className="w-full space-y-4 sm:space-y-6 lg:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0"
          >
            <Link href="/dashboard/events">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
                {event.name}
              </h1>
              <Badge
                className={`${
                  statusStyles[event.status] ||
                  'bg-slate-700 text-white border-slate-600 rounded-full'
                } border font-semibold text-[11px] shrink-0 px-3 py-1 uppercase tracking-tight`}
              >
                {event.status}
              </Badge>
            </div>
            <p className="text-slate-500 mt-0.5 text-xs sm:text-base leading-relaxed truncate">
              {event.type || 'Evento'} •{' '}
              <span className="font-semibold text-slate-700">
                {event.client?.name || 'Cliente não informado'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
          <Button
            asChild
            variant="outline"
            className="h-12 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold px-5 flex items-center gap-2 w-full sm:w-auto"
          >
            <Link href={`/dashboard/events/${eventId}/edit`}>
              <Edit className="w-4.5 h-4.5" />
              Editar Evento
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold px-5 flex items-center gap-2 w-full sm:w-auto"
          >
            <Link href="/dashboard/budgets/new">
              <Receipt className="w-4.5 h-4.5" />
              Orçamento / Proposta
            </Link>
          </Button>
        </div>
      </header>

      {/* RESUMO DATA + CARDS VALOR E PROGRESSO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 w-full">
        <Card className="bg-white border-border shadow-card rounded-2xl lg:col-span-4 overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="flex flex-col items-center justify-center gap-0.5 w-20 sm:w-24 h-20 sm:h-24 rounded-xl bg-primary/10 border-primary/20 shrink-0">
                <span className="text-2xl sm:text-3xl font-bold leading-none text-slate-900">
                  {new Date(event.date + 'T12:00:00').getDate()}
                </span>
                <span className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-primary">
                  {new Date(event.date + 'T12:00:00')
                    .toLocaleString('pt-BR', { month: 'short' })
                    .replace('.', '')}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {new Date(event.date + 'T12:00:00').getFullYear()}
                </span>
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-sm sm:text-base text-slate-600 flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}
                </p>
                <p className="text-sm sm:text-base text-slate-600 flex items-start gap-2 font-medium">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="break-words">{event.address}</span>
                </p>
                <p className="text-sm sm:text-base text-slate-600 flex items-center gap-2 font-medium">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  {event.guest_count} convidados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-card rounded-2xl lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-4 sm:pt-5 px-5 sm:px-6">
            <CardTitle className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
              Valor Fechado
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <DollarSign className="w-4.5 h-4.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-5 px-5 sm:px-6">
            <p className="text-2xl sm:text-3xl font-bold text-primary break-all">
              {formatCurrency(totals.agreed)}
            </p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Progresso recebido</span>
                <span className="text-slate-700">
                  {totals.progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor}`}
                  style={{ width: `${totals.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-4">
          <Card className="bg-white border-border shadow-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
              <CardTitle className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider px-0.5">
                Recebido
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center mr-0.5">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-5">
              <p className="text-xl sm:text-2xl font-bold text-success break-all">
                {formatCurrency(totals.received)}
              </p>
              {totals.allExpected > totals.received && (
                <p className="text-[11px] mt-1 text-slate-500 font-semibold">
                  +{formatCurrency(totals.allExpected - totals.received)} em
                  previsão
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-border shadow-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4">
              <CardTitle className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider px-0.5">
                Saldo a Receber
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center mr-0.5">
                <Wallet className="w-4 h-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-5">
              <p
                className={`text-xl sm:text-2xl font-bold break-all ${
                  totals.balance <= 0 ? 'text-success' : 'text-warning'
                }`}
              >
                {formatCurrency(Math.max(0, totals.balance))}
              </p>
              <p className="text-[11px] mt-1 text-slate-500 font-semibold">
                {totals.balance <= 0
                  ? 'Tudo recebido'
                  : `${totals.agreed > 0 ? (totals.balance / totals.agreed) * 100 : 0}% do total`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO PAGAMENTOS */}
      <Card className="bg-white border-border shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Banknote className="size-5" />
                </span>
                Pagamentos do Cliente
              </CardTitle>
              <CardDescription className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px]">
                Controle os recebimentos parciais e o saldo restante do evento.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={openNewPayment}
              className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold flex items-center gap-2 w-full sm:w-auto px-5 text-base"
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              Adicionar Pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 sm:px-8 py-5 sm:py-6">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-2xl bg-slate-50/40 text-slate-500 text-center">
              <Receipt className="w-14 h-14 mb-4 shrink-0 text-primary/30" />
              <p className="text-base sm:text-lg font-semibold text-slate-900">
                Nenhum pagamento lançado.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md">
                Clique em &quot;Adicionar Pagamento&quot; para lançar recebimentos
                parciais (sinal, parcelas, etc).
              </p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3 w-full">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="group relative rounded-2xl border border-border bg-white shadow-card p-4 hover:shadow-card-hover transition-all w-full"
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                          <Badge
                            className={`rounded-full border font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 ${
                              p.status === 'Recebido'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-warning/10 text-warning border-warning/20'
                            }`}
                          >
                            {p.status}
                          </Badge>
                          <span className="text-xs text-slate-500 font-semibold">
                            {new Date(p.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2.5 py-1">
                            {p.method}
                          </span>
                        </div>
                        {p.notes && (
                          <p className="text-sm text-slate-600 font-medium break-words">
                            {p.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3 mt-4">
                      <span className="text-xl sm:text-2xl font-bold text-success">
                        +{formatCurrency(Number(p.amount))}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditPayment(p)}
                          className="size-11 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/30" aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="size-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeletePayment(p)}
                          className="size-11 shrink-0 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white" aria-label="Excluir"
                          title="Excluir"
                        >
                          <Trash2 className="size-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8">
                <Table className="min-w-[720px]">
                  <TableHeader className="bg-transparent">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="text-slate-600 font-semibold text-sm">
                        Data
                      </TableHead>
                      <TableHead className="text-slate-600 font-semibold text-sm">
                        Método
                      </TableHead>
                      <TableHead className="text-slate-600 font-semibold text-sm">
                        Status
                      </TableHead>
                      <TableHead className="text-slate-600 font-semibold text-sm">
                        Observação
                      </TableHead>
                      <TableHead className="text-right text-slate-600 font-semibold text-sm">
                        Valor
                      </TableHead>
                      <TableHead className="text-right text-slate-600 font-semibold text-sm w-[120px]">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow
                        key={p.id}
                        className="hover:bg-slate-50/50 border-slate-100 transition-colors"
                      >
                        <TableCell className="text-slate-700 font-semibold text-sm">
                          {new Date(p.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {p.method}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded-full border font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 ${
                              p.status === 'Recebido'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-warning/10 text-warning border-warning/20'
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                          {p.notes || <span className="text-slate-400">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-success text-base">
                            +{formatCurrency(Number(p.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditPayment(p)}
                              className="rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                              title="Editar"
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeletePayment(p)}
                              className="rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5"
                              title="Excluir"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* EQUIPE E DESPESAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 w-full">
        {/* EQUIPE */}
        <Card className="bg-white border-border shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-highlight/10 text-highlight">
                    <HardHat className="size-5" />
                  </span>
                  Equipe Alocada
                </CardTitle>
                <CardDescription className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px]">
                  Funcionários escalados para trabalhar neste evento.
                </CardDescription>
              </div>
              <Button
                asChild
                variant="outline"
                className="h-11 border-primary/20 text-primary hover:bg-primary hover:text-white rounded-xl font-semibold px-5 w-full sm:w-auto flex items-center gap-2"
              >
                <Link href={`/dashboard/events/${eventId}/edit`}>
                  <UserCheck className="w-4.5 h-4.5" />
                  Gerenciar Equipe
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-5 sm:py-6">
            {employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border rounded-2xl bg-slate-50/40 text-slate-500 text-center">
                <HardHat className="w-12 h-12 mb-3 text-highlight/30" />
                <p className="font-semibold text-slate-700">
                  Nenhum funcionário alocado.
                </p>
                <p className="text-xs sm:text-sm mt-2">
                  Edite o evento para selecionar a equipe.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 shrink-0 rounded-full bg-highlight/10 border border-highlight/20 flex items-center justify-center">
                        <HardHat className="w-5 h-5 text-highlight" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 break-words">
                          {emp.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {emp.role && (
                            <Badge className="rounded-full bg-highlight/10 text-highlight border-highlight/20 border text-[11px] font-semibold">
                              {emp.role}
                            </Badge>
                          )}
                          {emp.specific_role && (
                            <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 border text-[11px] font-semibold">
                              {emp.specific_role}
                            </Badge>
                          )}
                          {emp.phone && (
                            <span className="text-[11px] font-semibold text-slate-500 inline-flex items-center">
                              📞 {emp.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RENTABILIDADE / DESPESAS */}
        <Card className="bg-white border-border shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 border border-violet-200">
                  <Sparkles className="size-5" />
                </span>
                Despesas &amp; Rentabilidade
              </CardTitle>
              <CardDescription className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px]">
                Comparativo do valor fechado com despesas vinculadas ao evento.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-5 sm:py-6 space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-border bg-slate-50/60 p-4">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                  Valor Fechado
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary break-all">
                  {formatCurrency(totals.agreed)}
                </p>
              </div>
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-xs text-destructive/80 uppercase font-bold tracking-wider mb-1">
                  Despesas
                </p>
                <p className="text-xl sm:text-2xl font-bold text-destructive break-all">
                  -{formatCurrency(totals.totalExpenses)}
                </p>
              </div>
            </div>

            <div
              className={`rounded-2xl border p-5 ${
                totals.profit >= 0
                  ? 'border-success/30 bg-success/5'
                  : 'border-destructive/30 bg-destructive/5'
              }`}
            >
              <p
                className={`text-xs uppercase font-bold tracking-wider mb-1 ${
                  totals.profit >= 0
                    ? 'text-success/80'
                    : 'text-destructive/80'
                }`}
              >
                {totals.profit >= 0 ? 'Lucro Estimado' : 'Prejuízo Estimado'}
              </p>
              <p
                className={`text-2xl sm:text-3xl font-bold break-all ${
                  totals.profit >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {totals.profit >= 0 ? '+' : ''}
                {formatCurrency(totals.profit)}
              </p>
              {totals.agreed > 0 && (
                <p className="text-xs sm:text-sm mt-2 font-semibold text-slate-500">
                  Margem:{' '}
                  <span className={totals.profit >= 0 ? 'text-success' : 'text-destructive'}>
                    {((totals.profit / totals.agreed) * 100).toFixed(1)}%
                  </span>{' '}
                  sobre valor fechado
                </p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Despesas vinculadas ({expenses.length})
              </h4>
              {expenses.length === 0 ? (
                <p className="text-sm text-slate-500 rounded-xl bg-slate-50 border border-border p-4 text-center">
                  Nenhuma despesa vinculada a este evento.
                </p>
              ) : (
                <div className="space-y-2">
                  {expenses.slice(0, 8).map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {exp.description || 'Sem descrição'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {exp.status ? ` • ${exp.status}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-destructive shrink-0">
                        -{formatCurrency(Number(exp.amount))}
                      </span>
                    </div>
                  ))}
                  {expenses.length > 8 && (
                    <p className="text-xs text-slate-500 text-center pt-1">
                      +{expenses.length - 8} despesa(s) listada(s) no Financeiro.
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Link href="/dashboard/finance/new">
                <PlusCircle className="w-4.5 h-4.5 mr-2" />
                Lançar Despesa para este Evento
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* DIALOG PAGAMENTO */}
      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(v) => {
          if (paymentLoading) return;
          setPaymentDialogOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              {editingPayment ? 'Editar Pagamento' : 'Registrar Pagamento'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-1">
              {editingPayment
                ? 'Atualize as informações do recebimento.'
                : 'Lançar um valor recebido ou previsão de recebimento do cliente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="field-group sm:col-span-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={paymentForm.amount || ''}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <Label htmlFor="pay_date">Data do Pagamento</Label>
                <Input
                  id="pay_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, payment_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <Label>Método</Label>
                <Select
                  value={paymentForm.method}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-group sm:col-span-2">
                <Label>Status</Label>
                <Select
                  value={paymentForm.status}
                  onValueChange={(v) =>
                    setPaymentForm({ ...paymentForm, status: v })
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {paymentStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-group sm:col-span-2">
                <Label htmlFor="pay_notes">Observações</Label>
                <textarea
                  id="pay_notes"
                  rows={3}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none"
                  placeholder="Ex: Sinal de 50%, 2ª parcela, etc."
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                checked={paymentForm.register_in_finance}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    register_in_finance: e.target.checked,
                  })
                }
              />
              <span className="text-sm font-semibold text-slate-700 leading-relaxed">
                Registrar também no Financeiro (cria/atualiza uma transação do
                tipo &quot;Receita&quot; vinculada a este evento)
              </span>
            </label>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-11 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                onClick={() => setPaymentDialogOpen(false)}
                disabled={paymentLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Salvando...' : editingPayment ? 'Salvar Alterações' : 'Registrar Pagamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          if (confirmLoading) return;
          setConfirmOpen(v);
          if (!v) setConfirmData(null);
        }}
        title={`Excluir ${confirmData?.description || 'pagamento'}?`}
        description="Esta ação não pode ser desfeita. Se o pagamento estava vinculado ao financeiro, também será removido de lá."
        variant="destructive"
        dangerLabel="Exclusão permanente."
        confirmText="Sim, excluir"
        onConfirm={handleConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}
