'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ChevronLeft, Save, DollarSign, ArrowUpRight, ArrowDownRight, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'receivable' as 'receivable' | 'payable',
    date: new Date().toISOString().split('T')[0],
    status: 'pago',
    event_id: '' as string | ''
  });

  async function fetchAll() {
    try {
      setLoading(true);
      const [tRes, eRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('id', transactionId)
          .single(),
        supabase
          .from('events')
          .select('id, name, date')
          .order('date', { ascending: false }),
      ]);
      if (tRes.error) throw tRes.error;
      if (!tRes.data) {
        toast.error('Transação não encontrada.');
        router.push('/dashboard/finance');
        return;
      }
      const t = tRes.data;
      setFormData({
        description: t.description || '',
        amount: Number(t.amount || 0),
        type: t.type === 'payable' ? 'payable' : 'receivable',
        date: t.date,
        status: t.status || 'pago',
        event_id: t.event_id || ''
      });
      setEvents(eRes.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar transação: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [transactionId]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        event_id: formData.event_id || null
      };
      const { error } = await supabase
        .from('finance_transactions')
        .update(payload)
        .eq('id', transactionId);
      if (error) throw error;
      toast.success('Transação atualizada com sucesso!');
      router.push('/dashboard/finance');
    } catch (error: any) {
      toast.error('Erro ao atualizar transação: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const isReceivable = formData.type === 'receivable';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded-2xl w-1/2"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0">
            <Link href="/dashboard/finance">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">Editar Transação</h1>
            <p className="text-sm sm:text-base text-slate-500 truncate">Atualize os dados da movimentação financeira.</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <DollarSign className="size-5" />
                  </span>
                  Dados da Transação
                </CardTitle>
                <CardDescription className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px]">
                  Altere os campos abaixo para atualizar a transação.
                </CardDescription>
              </div>
              <div className={`pl-0 sm:pl-6 pt-1 sm:pt-0 sm:border-l sm:border-border ${
                isReceivable ? 'text-success' : 'text-destructive'
              }`}>
                <span className="font-bold text-lg sm:text-xl whitespace-nowrap">
                  {isReceivable ? '+ Receita' : '− Despesa'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
            <div className="field-group">
              <Label>Tipo de Transação</Label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, type: 'receivable' })}
                  className={`h-auto py-4 sm:py-5 border-2 transition-all ${
                    isReceivable
                      ? 'border-success/40 bg-success/5 text-success hover:bg-success/10 ring-2 ring-success/10'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700 bg-white'
                  }`}
                >
                  <ArrowUpRight className="size-5 mr-1.5" />
                  <span className="font-semibold">Receita</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, type: 'payable' })}
                  className={`h-auto py-4 sm:py-5 border-2 transition-all ${
                    !isReceivable
                      ? 'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 ring-2 ring-destructive/10'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700 bg-white'
                  }`}
                >
                  <ArrowDownRight className="size-5 mr-1.5" />
                  <span className="font-semibold">Despesa</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              <div className="field-group lg:col-span-7 xl:col-span-8">
                <Label htmlFor="desc">Descrição</Label>
                <Input
                  id="desc"
                  placeholder={
                    isReceivable
                      ? 'Ex: Pagamento de evento, entrada de orçamento, parcelas'
                      : 'Ex: Compra de insumos, carvão, pagamento de equipe'
                  }
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="field-group lg:col-span-5 xl:col-span-4">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className={`font-semibold ${
                    isReceivable ? 'text-success' : 'text-destructive'
                  }`}
                />
              </div>

              <div className="field-group lg:col-span-5 xl:col-span-4">
                <Label htmlFor="date" className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-primary" />
                  Data do Movimento
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="field-group lg:col-span-7 xl:col-span-8">
                <Label>
                  {isReceivable ? 'Vincular Recebível a Evento' : 'Vincular Despesa a Evento'}
                </Label>
                <Select
                  value={formData.event_id || ''}
                  onValueChange={(val) => setFormData({ ...formData, event_id: val })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue
                      placeholder={
                        isReceivable
                          ? 'Selecione o evento (recebimento do cliente)'
                          : 'Selecione o evento (gasto realizado para o evento)'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    <SelectItem value="0">Não vincular a evento</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} — {formatDateBR(event.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className={`text-xs mt-2 pl-1 ${
                  isReceivable ? 'text-success/80' : 'text-destructive/80'
                }`}>
                  {isReceivable
                    ? '💡 Ao vincular, este valor entra no cálculo do Lucro Real do evento (Recebido − Gastos).'
                    : '💡 Ao vincular, este valor é deduzido do valor fechado para calcular a rentabilidade do evento.'}
                </p>
              </div>

              <div className="field-group lg:col-span-12">
                <Label>Status da Transação</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, status: isReceivable ? 'recebido' : 'pago' })}
                    className={`h-auto py-3 sm:py-4 border-2 transition-all ${
                      (formData.status === 'pago' || formData.status === 'recebido')
                        ? isReceivable
                          ? 'border-success/40 bg-success/5 text-success hover:bg-success/10'
                          : 'border-slate-700/40 bg-slate-700/5 text-slate-800 hover:bg-slate-700/10'
                        : 'border-slate-200 text-slate-500 hover:text-slate-700 bg-white'
                    }`}
                  >
                    <span className="font-semibold">
                      {isReceivable ? '✅ Já Recebido' : '✅ Já Pago'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, status: 'pendente' })}
                    className={`h-auto py-3 sm:py-4 border-2 transition-all ${
                      formData.status === 'pendente'
                        ? 'border-warning/40 bg-warning/5 text-warning hover:bg-warning/10'
                        : 'border-slate-200 text-slate-500 hover:text-slate-700 bg-white'
                    }`}
                  >
                    <span className="font-semibold">⏳ Pendente</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, status: 'atrasado' })}
                    className={`h-auto py-3 sm:py-4 border-2 transition-all ${
                      formData.status === 'atrasado'
                        ? 'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10'
                        : 'border-slate-200 text-slate-500 hover:text-slate-700 bg-white'
                    }`}
                  >
                    <span className="font-semibold">⚠️ Atrasado</span>
                  </Button>
                </div>
              </div>
            </div>

            {formData.amount > 0 && (
              <div className={`rounded-2xl border-2 p-4 sm:p-6 ${
                isReceivable
                  ? 'border-success/20 bg-success/[0.03]'
                  : 'border-destructive/20 bg-destructive/[0.03]'
              }`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-slate-500 mb-0.5">
                      {isReceivable ? 'Total (entrada)' : 'Total (saída)'}
                    </p>
                    <p className={`text-2xl sm:text-3xl font-bold ${
                      isReceivable ? 'text-success' : 'text-destructive'
                    }`}>
                      {isReceivable ? '+' : '−'} {formatCurrency(formData.amount)}
                    </p>
                  </div>
                  {(formData.status === 'pago' || formData.status === 'recebido') && (
                    <div className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                      isReceivable
                        ? 'bg-success/15 text-success'
                        : 'bg-slate-700/10 text-slate-800'
                    }`}>
                      Caixa {isReceivable ? 'aumenta' : 'diminui'}
                    </div>
                  )}
                  {formData.status === 'pendente' && (
                    <div className="px-4 py-2 rounded-xl font-semibold text-sm bg-warning/15 text-warning">
                      Aguardar liquidação
                    </div>
                  )}
                  {formData.status === 'atrasado' && (
                    <div className="px-4 py-2 rounded-xl font-semibold text-sm bg-destructive/15 text-destructive">
                      Pagamento em atraso
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link href="/dashboard/finance">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
              disabled={saving}
            >
              <Save className="size-5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
