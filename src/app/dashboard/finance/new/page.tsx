'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ChevronLeft, Save, DollarSign, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewTransactionPage() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const router = useRouter();
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'receivable',
    date: new Date().toISOString().split('T')[0],
    status: 'pago',
    event_id: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, name, date')
        .order('date', { ascending: true });
      setEvents(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar eventos:', error.message);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        event_id: formData.event_id || null
      };
      const { error } = await supabase
        .from('finance_transactions')
        .insert([payload]);

      if (error) throw error;

      toast.success('Transação registrada com sucesso!');
      router.push('/dashboard/finance');
    } catch (error: any) {
      toast.error('Erro ao registrar transação: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <Link href="/dashboard/finance">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Nova Transação</h1>
          <p className="text-sm sm:text-base text-slate-500">Registre uma entrada ou saída de caixa.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DollarSign className="size-5" />
              </span>
              Dados da Transação
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">
            <div className="field-group">
              <Label>Tipo de Transação</Label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, type: 'receivable' })}
                  className={`h-auto py-4 sm:py-5 border-2 transition-all ${
                    formData.type === 'receivable'
                      ? 'border-success/40 bg-success/5 text-success hover:bg-success/10'
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
                    formData.type === 'payable'
                      ? 'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700 bg-white'
                  }`}
                >
                  <ArrowDownRight className="size-5 mr-1.5" />
                  <span className="font-semibold">Despesa</span>
                </Button>
              </div>
            </div>

            <div className="field-group">
              <Label htmlFor="desc">Descrição</Label>
              <Input
                id="desc"
                placeholder="Ex: Pagamento Evento Casamento, Compra de Bebidas..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="field-group">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="field-group">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-slate-900">
                  <SelectItem value="pago">Pago / Recebido</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="field-group">
              <Label className="flex items-center gap-1.5">
                <CalendarIcon className="size-4 text-primary" />
                Vincular a Evento (opcional)
              </Label>
              <Select
                value={formData.event_id}
                onValueChange={(val) => setFormData({ ...formData, event_id: val })}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Selecione um evento (se aplicável)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-slate-900">
                  <SelectItem value="">Não vincular</SelectItem>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.name} — {new Date(ev.date).toLocaleDateString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link href="/dashboard/finance">Cancelar</Link>
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
