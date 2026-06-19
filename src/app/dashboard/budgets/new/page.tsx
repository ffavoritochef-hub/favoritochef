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
import { 
  ChevronLeft, 
  Save, 
  FileText, 
  DollarSign, 
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <header className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5">
          <Link href="/dashboard/budgets">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Novo Orçamento</h1>
          <p className="text-zinc-400">Vincule um cardápio e calcule os custos da proposta.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md">
            <CardHeader className="bg-white/5 border-b border-white/10 p-6">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Dados do Evento e Cardápio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Evento Alvo</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, event_id: val })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-primary">
                      <SelectValue placeholder="Selecione o evento" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {events.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-primary" />
                    Cardápio Base
                  </Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, menu_template_id: val })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-primary">
                      <SelectValue placeholder="Selecione o cardápio" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {menuTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md">
            <CardHeader className="bg-white/5 border-b border-white/10 p-6">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <Calculator className="w-5 h-5 text-primary" />
                Composição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Insumos / Alimentos (Custo)</Label>
                  <Input
                    type="number"
                    value={formData.food_value}
                    onChange={(e) => setFormData({ ...formData, food_value: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Bebidas (Custo)</Label>
                  <Input
                    type="number"
                    value={formData.drinks_value}
                    onChange={(e) => setFormData({ ...formData, drinks_value: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Equipe / Garçons</Label>
                  <Input
                    type="number"
                    value={formData.staff_value}
                    onChange={(e) => setFormData({ ...formData, staff_value: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Locação / Estrutura</Label>
                  <Input
                    type="number"
                    value={formData.location_value}
                    onChange={(e) => setFormData({ ...formData, location_value: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Transporte / Logística</Label>
                  <Input
                    type="number"
                    value={formData.transport_value}
                    onChange={(e) => setFormData({ ...formData, transport_value: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" />
                    Margem de Lucro (%)
                  </Label>
                  <Input
                    type="number"
                    value={formData.margin_percent}
                    onChange={(e) => setFormData({ ...formData, margin_percent: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-primary/30 text-white focus:border-primary font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Condições de Pagamento</Label>
                <textarea
                  rows={3}
                  className="w-full rounded-md bg-white/5 border border-white/10 text-white p-3 focus:border-primary outline-none transition-all"
                  placeholder="Ex: 50% na reserva, 50% no dia do evento..."
                  value={formData.payment_conditions}
                  onChange={(e) => setFormData({ ...formData, payment_conditions: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-primary/10 border-primary/30 neon-border backdrop-blur-xl sticky top-8">
            <CardHeader>
              <CardTitle className="text-white text-center">Resumo Final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 border-b border-white/10 pb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Custo Total</span>
                  <span className="text-white font-medium">
                    R$ {(formData.total_value / (1 + formData.margin_percent / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Lucro ({formData.margin_percent}%)</span>
                  <span className="text-green-400 font-medium">
                    + R$ {(formData.total_value - (formData.total_value / (1 + formData.margin_percent / 100))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Valor da Proposta</p>
                <p className="text-4xl font-black text-white neon-glow">
                  R$ {formData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-8 transition-all shadow-[0_0_20px_rgba(188,19,254,0.4)]"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Finalizar Orçamento'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
