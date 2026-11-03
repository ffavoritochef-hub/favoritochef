'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewTransactionPage() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  // Evento de origem (?event_id=): ao salvar, volta para a página do evento.
  const [returnEventId, setReturnEventId] = useState<string | null>(null);
  const router = useRouter();
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'receivable' as 'receivable' | 'payable',
    date: new Date().toISOString().split('T')[0],
    status: 'pago',
    event_id: '' as string | ''
  });

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, date')
      .eq('is_active', true)
      .order('date', { ascending: false });
    setEvents(data || []);

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event_id');
    const type = params.get('type');
    const linked = (data || []).find((ev) => ev.id === eventId);
    setFormData((prev) => ({
      ...prev,
      ...(type === 'payable' || type === 'receivable' ? { type } : {}),
      ...(linked ? { event_id: linked.id, date: linked.date } : {}),
    }));
    if (linked) setReturnEventId(linked.id);
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  // Vincular a um evento usa a data do evento como data do lançamento.
  function handleEventChange(val: string) {
    const linked = events.find((ev) => ev.id === val);
    setFormData((prev) => ({
      ...prev,
      event_id: val,
      ...(linked ? { date: linked.date } : {}),
    }));
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const another = (e.nativeEvent as SubmitEvent).submitter?.dataset.another === 'true';
    setLoading(true);

    try {
      const payload = {
        ...formData,
        event_id: formData.event_id && formData.event_id !== '0' ? formData.event_id : null
      };

      const { error } = await supabase
        .from('finance_transactions')
        .insert([payload]);

      if (error) throw error;

      toast.success('Transação registrada com sucesso!');
      if (another) {
        // Mantém tipo, evento, data e status para o próximo lançamento.
        setFormData((prev) => ({ ...prev, description: '', amount: 0 }));
        document.getElementById('desc')?.focus();
        return;
      }
      router.push(returnEventId ? `/dashboard/events/${returnEventId}` : '/dashboard/finance');
    } catch (error: any) {
      toast.error('Erro ao registrar transação: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isReceivable = formData.type === 'receivable';

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">Nova Transação</h1>
            <p className="text-sm sm:text-base text-slate-500 truncate">Registre uma entrada ou saída de caixa.</p>
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
                  Preencha os campos abaixo para registrar um movimento financeiro.
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
                  onValueChange={handleEventChange}
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
                  {' '}A data do movimento passa a ser a data do evento (pode alterar).
                </p>
              </div>

              <div className="field-group lg:col-span-12">
                <Label>Status da Transação</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, status: 'pago' })}
                    className={`h-auto py-3 sm:py-4 border-2 transition-all ${
                      formData.status === 'pago'
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
                      {isReceivable ? 'Total a registrar (entrada)' : 'Total a registrar (saída)'}
                    </p>
                    <p className={`text-2xl sm:text-3xl font-bold ${
                      isReceivable ? 'text-success' : 'text-destructive'
                    }`}>
                      {isReceivable ? '+' : '−'} {formatCurrency(formData.amount)}
                    </p>
                  </div>
                  {formData.status === 'pago' && (
                    <div className={`px-4 py-2 rounded-xl font-semibold text-sm ${
                      isReceivable
                        ? 'bg-success/15 text-success'
                        : 'bg-slate-700/10 text-slate-800'
                    }`}>
                      Caixa {isReceivable ? 'aumenta' : 'diminui'} hoje
                    </div>
                  )}
                  {formData.status === 'pendente' && (
                    <div className="px-4 py-2 rounded-xl font-semibold text-sm bg-warning/15 text-warning">
                      Aguardar liquidação
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link href={returnEventId ? `/dashboard/events/${returnEventId}` : '/dashboard/finance'}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              data-another="true"
              variant="outline"
              className="w-full sm:w-auto h-12 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
              disabled={loading}
            >
              Salvar e Lançar Outra
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Save className="size-5" />
              {loading ? 'Registrando...' : 'Salvar Transação'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
