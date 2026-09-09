'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Save, Plus, Trash2, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewMenuTemplatePage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [selectedItems, setSelectedItems] = useState<{ item_name: string, quantity: string }[]>([]);

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { item_name: '', quantity: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error('Adicione pelo menos um item ao cardápio.');
      return;
    }

    setLoading(true);
    try {
      const { data: template, error: tError } = await supabase
        .from('menu_templates')
        .insert([formData])
        .select()
        .single();

      if (tError) throw tError;

      const itemsToInsert = selectedItems.map(si => ({
        menu_template_id: template.id,
        custom_item_name: si.item_name,
        custom_quantity: si.quantity
      }));

      const { error: iError } = await supabase
        .from('menu_template_items')
        .insert(itemsToInsert);

      if (iError) throw iError;

      toast.success('Cardápio criado com sucesso!');
      router.push('/dashboard/menu');
    } catch (error: any) {
      toast.error('Erro ao criar cardápio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <Link href="/dashboard/menu">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Novo Cardápio</h1>
          <p className="text-sm sm:text-base text-slate-500">Crie uma composição de itens para usar em seus orçamentos.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ChefHat className="size-5" />
              </span>
              Informações do Cardápio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">
            <div className="space-y-6">
              <div className="field-group">
                <Label htmlFor="name">Nome do Cardápio</Label>
                <Input
                  id="name"
                  placeholder="Ex: Buffet de Feijoada Completa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:bg-muted/50 disabled:opacity-50"
                  placeholder="Detalhes sobre este cardápio..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <CardTitle className="text-lg sm:text-xl text-slate-900">Composição de Itens</CardTitle>
            <Button type="button" onClick={handleAddItem} variant="outline" size="default" className="h-11 border-primary/30 text-primary hover:bg-primary/5 font-medium">
              <Plus className="size-4 mr-2" />
              Adicionar Item
            </Button>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-4">
            {selectedItems.map((si, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end animate-in fade-in slide-in-from-top-2">
                <div className="flex-1 field-group">
                  <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Item / Insumo</Label>
                  <Input
                    placeholder="Ex: Carne Bovina, Refrigerante, etc."
                    value={si.item_name}
                    onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                    required
                  />
                </div>
                <div className="w-full sm:w-48 field-group">
                  <Label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Quantidade</Label>
                  <Input
                    placeholder="Ex: 10kg, 50 un"
                    value={si.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                  className="size-12 border-slate-200 text-slate-500 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>
            ))}
            {selectedItems.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <ChefHat className="size-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhum item adicionado a este cardápio.</p>
                <p className="text-sm text-slate-400 mt-1">Clique em "Adicionar Item" para começar.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link href="/dashboard/menu">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Save className="size-5" />
              {loading ? 'Salvando...' : 'Salvar Cardápio'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
