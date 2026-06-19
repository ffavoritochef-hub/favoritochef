'use client';

import { useState, useEffect } from 'react';
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
  const [items, setItems] = useState<any[]>([]);
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
      // 1. Criar o template
      const { data: template, error: tError } = await supabase
        .from('menu_templates')
        .insert([formData])
        .select()
        .single();

      if (tError) throw tError;

      // 2. Vincular os itens (agora salvando como texto livre na nova estrutura)
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
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <header className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5">
          <Link href="/dashboard/menu">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Novo Cardápio</h1>
          <p className="text-zinc-400">Crie uma composição de itens para usar em seus orçamentos.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md">
          <CardHeader className="bg-white/5 border-b border-white/10 p-6">
            <CardTitle className="flex items-center gap-2 text-white">
              <ChefHat className="w-5 h-5 text-primary" />
              Informações do Cardápio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Nome do Cardápio</Label>
              <Input
                id="name"
                placeholder="Ex: Buffet de Feijoada Completa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">Descrição</Label>
              <textarea
                id="description"
                rows={3}
                className="w-full rounded-md bg-white/5 border border-white/10 text-white p-3 focus:border-primary outline-none transition-all"
                placeholder="Detalhes sobre este cardápio..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md">
          <CardHeader className="bg-white/5 border-b border-white/10 p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-lg">Composição de Itens</CardTitle>
            <Button type="button" onClick={handleAddItem} variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {selectedItems.map((si, index) => (
              <div key={index} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-2">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Item / Insumo</Label>
                  <Input
                    placeholder="Ex: Carne Bovina, Refrigerante, etc."
                    value={si.item_name}
                    onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white focus:border-primary h-10"
                  />
                </div>
                <div className="w-48 space-y-2">
                  <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Quantidade</Label>
                  <Input
                    placeholder="Ex: 10kg, 50 un"
                    value={si.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white focus:border-primary h-10"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemoveItem(index)}
                  className="text-zinc-500 hover:text-red-400 h-10 w-10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {selectedItems.length === 0 && (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-white/5">
                <p className="text-zinc-500 italic">Nenhum item adicionado a este cardápio.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/10 p-6 flex justify-end gap-4">
            <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
              <Link href="/dashboard/menu">Cancelar</Link>
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Cardápio'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
