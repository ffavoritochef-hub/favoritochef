'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ChevronLeft,
  Save,
  FileText,
  Percent,
  Calculator,
  ChefHat
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewBudgetPage() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [menuTemplates, setMenuTemplates] = useState<any[]>([]);
  const router = useRouter();

  const [formData, setFormData] = useState({
    event_id: '',
    menu_template_id: '',
    food_value: 0,
    drinks_value: 0,
    staff_value: 0,
    location_value: 0,
    transport_value: 0,
    margin_percent: 20,
    total_value: 0,
    payment_conditions: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const [eventsRes, templatesRes] = await Promise.all([
        supabase.from('events').select('id, name').eq('status', 'Orçamento enviado').order('name'),
        supabase.from('menu_templates').select('id, name').order('name')
      ]);
      setEvents(eventsRes.data || []);
      setMenuTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados iniciais:', error);
    }
  }

  useEffect(() => {
    const subtotal =
      Number(formData.food_value) +
      Number(formData.drinks_value) +
      Number(formData.staff_value) +
      Number(formData.location_value) +
      Number(formData.transport_value);

    const margin = subtotal * (formData.margin_percent / 100);
    setFormData(prev => ({ ...prev, total_value: subtotal + margin }));
  }, [
    formData.food_value,
    formData.drinks_value,
    formData.staff_value,
    formData.location_value,
    formData.transport_value,
    formData.margin_percent
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('budgets')
        .insert([{
          event_id: formData.event_id,
          menu_template_id: formData.menu_template_id || null,
          food_value: formData.food_value,
          drinks_value: formData.drinks_value,
          staff_value: formData.staff_value,
          location_value: formData.location_value,
          transport_value: formData.transport_value,
          total_value: formData.total_value,
          payment_conditions: formData.payment_conditions
        }]);

      if (error) throw error;

      toast.success('Orçamento gerado com sucesso!');
      router.push('/dashboard/budgets');
    } catch (error: any) {
      toast.error('Erro ao gerar orçamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const custoTotal = (formData.total_value / (1 + formData.margin_percent / 100));
  const lucro = (formData.total_value - custoTotal);

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <Link href="/dashboard/budgets">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Novo Orçamento</h1>
          <p className="text-sm sm:text-base text-slate-500">Vincule um cardápio e calcule os custos da proposta.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <Card className="shadow-card border-border overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </span>
                Dados do Evento e Cardápio
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <div className="field-group">
                  <Label>Evento Alvo</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, event_id: val })}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecione o evento" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-border text-slate-900">
                      {events.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="flex items-center gap-1.5">
                    <ChefHat className="size-4 text-primary" />
                    Cardápio Base
                  </Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, menu_template_id: val })}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecione o cardápio" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-border text-slate-900">
                      {menuTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Calculator className="size-5" />
                </span>
                Composição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <div className="field-group">
                  <Label>Insumos / Alimentos (Custo)</Label>
                  <Input
                    type="number"
                    value={formData.food_value}
                    onChange={(e) => setFormData({ ...formData, food_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="field-group">
                  <Label>Bebidas (Custo)</Label>
                  <Input
                    type="number"
                    value={formData.drinks_value}
                    onChange={(e) => setFormData({ ...formData, drinks_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="field-group">
                  <Label>Equipe / Garçons</Label>
                  <Input
                    type="number"
                    value={formData.staff_value}
                    onChange={(e) => setFormData({ ...formData, staff_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="field-group">
                  <Label>Locação / Estrutura</Label>
                  <Input
                    type="number"
                    value={formData.location_value}
                    onChange={(e) => setFormData({ ...formData, location_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="field-group">
                  <Label>Transporte / Logística</Label>
                  <Input
                    type="number"
                    value={formData.transport_value}
                    onChange={(e) => setFormData({ ...formData, transport_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="field-group">
                  <Label className="flex items-center gap-1.5">
                    <Percent className="size-4 text-primary" />
                    Margem de Lucro (%)
                  </Label>
                  <Input
                    type="number"
                    value={formData.margin_percent}
                    onChange={(e) => setFormData({ ...formData, margin_percent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="field-group">
                <Label>Condições de Pagamento</Label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:bg-muted/50 disabled:opacity-50"
                  placeholder="Ex: 50% na reserva, 50% no dia do evento..."
                  value={formData.payment_conditions}
                  onChange={(e) => setFormData({ ...formData, payment_conditions: e.target.value })}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4 pt-2">
                <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50" type="button">
                  <Link href="/dashboard/budgets">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <Save className="size-5" />
                  {loading ? 'Salvando...' : 'Salvar Orçamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card className="border-primary/20 shadow-modal overflow-hidden bg-gradient-to-br from-primary/5 via-white to-white">
              <CardHeader className="bg-primary text-white px-6 py-5">
                <CardTitle className="text-center text-white text-lg">Resumo Final</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-6 py-6">
                <div className="space-y-3 border-b border-slate-100 pb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Custo Total</span>
                    <span className="text-slate-900 font-semibold">
                      R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Lucro ({formData.margin_percent}%)</span>
                    <span className="text-success font-semibold">
                      + R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Valor da Proposta</p>
                  <p className="text-3xl sm:text-4xl font-black text-primary leading-none">
                    R$ {formData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="pt-2 hidden lg:block">
                  <Button
                    type="submit"
                    className="w-full h-14 bg-primary hover:bg-primary-dark text-white font-bold shadow-md flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? 'Finalizando...' : 'Finalizar Orçamento'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
