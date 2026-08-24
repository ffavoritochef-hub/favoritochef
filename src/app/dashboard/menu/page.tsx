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
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <header className="flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter neon-glow">Gestão de Cardápio</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Configure seus itens base e monte composições de cardápios.</p>
        </div>
        <div className="flex w-full md:w-auto">
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 w-full sm:w-auto">
            <Button 
              variant={activeTab === 'items' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('items')}
              className={`${activeTab === 'items' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-400'} flex-1 sm:flex-none min-h-[44px] sm:min-h-0`}
            >
              Itens Base
            </Button>
            <Button 
              variant={activeTab === 'templates' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('templates')}
              className={`${activeTab === 'templates' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-400'} flex-1 sm:flex-none min-h-[44px] sm:min-h-0`}
            >
              Composições
            </Button>
          </div>
        </div>
      </header>

      {activeTab === 'items' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
          {/* Categorias e Filtros */}
          <aside className="lg:col-span-1 space-y-4 sm:space-y-6">
             <Card className="bg-white/5 border-white/10 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">Novo Item Base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Tipo de Insumo</Label>
                  <Select>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {itemTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Nome do Item</Label>
                  <Input placeholder="Ex: Carne Bovina" className="bg-white/5 border-white/10 text-white" />
                </div>
                <Button className="w-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all min-h-[44px] sm:min-h-0">
                  Adicionar Item
                </Button>
              </CardContent>
             </Card>

             <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-widest px-2">Categorias</h3>
                {categories.map(cat => (
                  <Button key={cat.id} variant="ghost" className="w-full justify-start text-zinc-300 hover:bg-primary/10 hover:text-primary gap-3 px-3 min-h-[44px] sm:min-h-0">
                    <Tag className="w-4 h-4 shrink-0" />
                    {cat.name}
                  </Button>
                ))}
             </div>
          </aside>

          {/* Listagem de Itens */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 shrink-0" />
              <Input placeholder="Pesquisar itens..." className="bg-white/5 border-white/10 text-white pl-11 sm:pl-12" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="bg-white/5 border-white/10 hover:border-primary/30 transition-all group overflow-hidden">
                  <CardContent className="p-4 sm:p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase shrink-0">
                        {item.type || 'Insumo'}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" className="text-zinc-500 hover:text-primary">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-zinc-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-bold text-white mb-1 text-sm sm:text-base">{item.name}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-1 mb-3">{item.description || 'Sem descrição'}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-medium truncate pr-2">{item.category?.name}</span>
                      <span className="font-black text-white text-sm sm:text-base whitespace-nowrap">
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
        <div className="space-y-5 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              Cardápios Montados
            </h2>
            <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] w-full sm:w-auto min-h-[44px] sm:min-h-0">
              <Link href="/dashboard/menu/new">Criar Novo Cardápio</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {menuTemplates.map((template) => (
              <Card key={template.id} className="bg-white/5 border-white/10 hover:border-primary/30 transition-all group">
                <CardHeader>
                  <CardTitle className="text-white flex justify-between items-center gap-2 text-sm sm:text-base">
                    <span className="break-words">{template.name}</span>
                    <Button variant="ghost" size="icon-sm" className="text-zinc-500 hover:text-primary shrink-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <p className="text-xs sm:text-sm text-zinc-400">{template.description}</p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Itens Inclusos:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.items?.map((ti: any, idx: number) => (
                        <span key={idx} className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                          {ti.custom_item_name} ({ti.custom_quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-white/5 pt-3 sm:pt-4">
                   <Button variant="ghost" className="w-full text-xs sm:text-sm text-primary hover:bg-primary/10 min-h-[44px] sm:min-h-0">
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
