'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Edit,
  Tag,
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
  const [, setLoading] = useState(true);
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
    <div className="w-full space-y-4 sm:space-y-8 lg:space-y-10 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Gestão de Cardápio</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base leading-relaxed">Configure seus itens base e monte composições de cardápios.</p>
        </div>
        <div className="flex w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto h-11 sm:h-8 min-h-[44px] px-4">
            <Button 
              variant={activeTab === 'items' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('items')}
              className={`${activeTab === 'items' ? 'bg-white text-primary shadow-sm rounded-lg font-semibold' : 'text-slate-500 rounded-lg hover:text-slate-900 font-semibold'} flex-1 sm:flex-none min-h-[44px] sm:min-h-0 text-sm font-semibold px-4`}
            >
              Itens Base
            </Button>
            <Button 
              variant={activeTab === 'templates' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setActiveTab('templates')}
              className={`${activeTab === 'templates' ? 'bg-white text-primary shadow-sm rounded-lg font-semibold' : 'text-slate-500 rounded-lg hover:text-slate-900 font-semibold'} flex-1 sm:flex-none min-h-[44px] sm:min-h-0 text-sm font-semibold px-4`}
            >
              Composições
            </Button>
          </div>
        </div>
      </header>

      {activeTab === 'items' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full">
          <aside className="lg:col-span-1 space-y-4 sm:space-y-6 px-1 sm:px-0">
             <Card className="bg-white border-border shadow-card rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">Novo Item Base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tipo de Insumo</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-border rounded-xl min-h-[48px] text-slate-900">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-border text-slate-900 rounded-xl">
                      {itemTypes.map(t => <SelectItem key={t} value={t} className="min-h-[44px] hover:bg-slate-50">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Nome do Item</Label>
                  <Input placeholder="Ex: Carne Bovina" className="bg-white border-border rounded-xl min-h-[48px] text-slate-900 placeholder:text-slate-400 text-base" />
                </div>
                <Button className="w-full bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl min-h-[48px] shadow-sm">
                  Adicionar Item
                </Button>
              </CardContent>
             </Card>

             <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest px-2">Categorias</h3>
                {categories.map(cat => (
                  <Button key={cat.id} variant="ghost" className="w-full justify-start text-slate-700 hover:bg-primary/5 hover:text-primary gap-3 px-4 min-h-[48px] rounded-xl font-semibold bg-white border-border">
                    <Tag className="w-4.5 h-4.5 shrink-0" />
                    {cat.name}
                  </Button>
                ))}
             </div>
          </aside>

          <div className="lg:col-span-3 space-y-4 sm:space-y-6 w-full px-1 sm:px-0">
            <div className="relative">
              <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 shrink-0" />
              <Input placeholder="Pesquisar itens..." className="bg-white border-border rounded-xl pl-12 sm:pl-14 min-h-[48px] text-slate-900 text-base placeholder:text-slate-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="bg-white border-border shadow-card rounded-2xl overflow-hidden hover:shadow-card-hover hover:border-primary/20 transition-all">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary uppercase tracking-wider shrink-0">
                        {item.type || 'Insumo'}
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-primary hover:bg-primary/5 h-10 w-10 rounded-lg">
                          <Edit className="w-4.5 h-4.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-destructive hover:bg-destructive/5 h-10 w-10 rounded-lg">
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1.5 text-base sm:text-lg">{item.name}</h4>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mb-3.5 font-medium">{item.description || 'Sem descrição'}</p>
                    <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase font-bold truncate pr-2 tracking-wider">{item.category?.name}</span>
                      <span className="font-bold text-slate-900 text-lg sm:text-xl whitespace-nowrap">
                        R$ {item.cost_price?.toFixed(2) || '0,00'}
                        <span className="text-[10px] text-slate-500 font-normal ml-0.5 tracking-wider">/{item.unit || 'un'}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-8 w-full px-1 sm:px-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-900">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              Cardápios Montados
            </h2>
            <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold shadow-sm w-full sm:w-auto px-5 text-base">
              <Link href="/dashboard/menu/new">Criar Novo Cardápio</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {menuTemplates.map((template) => (
              <Card key={template.id} className="bg-white border-border shadow-card rounded-2xl hover:shadow-card-hover hover:border-primary/20 transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-slate-900 flex justify-between items-center gap-2 text-base sm:text-lg font-bold">
                    <span className="break-words font-bold">{template.name}</span>
                    <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-primary hover:bg-primary/5 shrink-0 h-10 w-10 rounded-lg">
                      <Edit className="w-4.5 h-4.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{template.description}</p>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Itens Inclusos:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.items?.map((ti: any, idx: number) => (
                        <span key={idx} className="text-[11px] sm:text-xs px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-slate-700 font-semibold">
                          {ti.custom_item_name} ({ti.custom_quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-100 pt-4 sm:pt-4">
                   <Button variant="outline" className="w-full text-sm font-semibold text-primary border-primary/20 hover:bg-primary hover:text-white min-h-[48px] rounded-xl">
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
