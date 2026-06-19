'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Utensils, 
  Trash2, 
  Edit,
  Tag,
  Package,
  Layers,
  ChefHat,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
const itemTypes = ['Insumos', 'Bebidas', 'Garçom', 'Equipe', 'Outros'];

export default function MenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuTemplates, setMenuTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'templates'>('items');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [cats, items, templates] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('menu_items').select('*, category:categories(name)').order('name'),
        supabase.from('menu_templates').select('*, items:menu_template_items(custom_item_name, custom_quantity)').order('name')
      ]);

      setCategories(cats.data || []);
      setMenuItems(items.data || []);
      setMenuTemplates(templates.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar cardápio: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Gestão de Cardápio</h1>
          <p className="text-zinc-400 mt-1">Configure seus itens base e monte composições de cardápios.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            <Button 
              variant={activeTab === 'items' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('items')}
              className={activeTab === 'items' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-400'}
            >
              Itens Base
            </Button>
            <Button 
              variant={activeTab === 'templates' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('templates')}
              className={activeTab === 'templates' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-400'}
            >
              Composições (Cardápios)
            </Button>
          </div>
        </div>
      </header>

      {activeTab === 'items' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categorias e Filtros */}
          <aside className="lg:col-span-1 space-y-6">
             <Card className="bg-white/5 border-white/10 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Novo Item Base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Tipo de Insumo</Label>
                  <Select>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {itemTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Nome do Item</Label>
                  <Input placeholder="Ex: Carne Bovina" className="bg-white/5 border-white/10 text-white text-xs h-9" />
                </div>
                <Button className="w-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all text-xs h-9">
                  Adicionar Item
                </Button>
              </CardContent>
             </Card>

             <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-2">Categorias</h3>
                {categories.map(cat => (
                  <Button key={cat.id} variant="ghost" className="w-full justify-start text-zinc-300 hover:bg-primary/10 hover:text-primary gap-3 px-3">
                    <Tag className="w-4 h-4" />
                    {cat.name}
                  </Button>
                ))}
             </div>
          </aside>

          {/* Listagem de Itens */}
          <div className="lg:col-span-3 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Pesquisar itens..." className="bg-white/5 border-white/10 text-white pl-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="bg-white/5 border-white/10 hover:border-primary/30 transition-all group overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase">
                        {item.type || 'Insumo'}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-zinc-500 hover:text-primary">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-zinc-500 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-bold text-white mb-1">{item.name}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-1 mb-3">{item.description || 'Sem descrição'}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-medium">{item.category?.name}</span>
                      <span className="font-black text-white text-sm">
                        R$ {item.cost_price?.toFixed(2) || '0,00'}
                        <span className="text-[10px] text-zinc-500 font-normal ml-0.5">/{item.unit || 'un'}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-primary" />
              Cardápios Montados
            </h2>
            <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)]">
              <Link href="/dashboard/menu/new">Criar Novo Cardápio</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuTemplates.map((template) => (
              <Card key={template.id} className="bg-white/5 border-white/10 hover:border-primary/30 transition-all group">
                <CardHeader>
                  <CardTitle className="text-white flex justify-between items-center">
                    {template.name}
                    <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-primary">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-zinc-400">{template.description}</p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Itens Inclusos:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.items?.map((ti: any, idx: number) => (
                        <span key={idx} className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                          {ti.custom_item_name} ({ti.custom_quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-white/5 pt-4">
                   <Button variant="ghost" className="w-full text-xs text-primary hover:bg-primary/10">
                     Vincular ao Orçamento
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
