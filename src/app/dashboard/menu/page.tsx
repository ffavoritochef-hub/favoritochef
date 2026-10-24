'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Ban,
  BookOpen,
  Camera,
  Check,
  ChefHat,
  Copy,
  ImagePlus,
  ListChecks,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBRL } from '@/lib/buffet-rules';
import { MENU_LIBRARY, groupBySection, type LibraryMenu } from '@/lib/menu-library';
import {
  deleteMenu,
  duplicateMenu,
  importLibraryMenu,
  listMenus,
  migrationPending,
  removeMenuPhoto,
  setMenuActive,
  setMenuPhoto,
  uploadMenuPhoto,
  type MenuRecord,
} from '@/lib/menus';

type Tab = 'menus' | 'library' | 'items';

const ITEM_TYPES = ['Insumos', 'Bebidas', 'Garçom', 'Equipe', 'Descartáveis', 'Outros'];

interface BaseItem {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  cost_price: number | null;
  unit: string | null;
  category_id: string | null;
  category?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

type Pending =
  | { kind: 'menu-delete'; menu: MenuRecord }
  | { kind: 'menu-toggle'; menu: MenuRecord }
  | { kind: 'item-delete'; item: BaseItem }
  | { kind: 'category-delete'; category: Category };

const tabBtn = (active: boolean) =>
  `flex-1 sm:flex-none min-h-[44px] px-4 rounded-lg text-sm font-semibold transition-colors ${
    active ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
  }`;

export default function MenuPage() {
  const [tab, setTab] = useState<Tab>('menus');
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [items, setItems] = useState<BaseItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [libPreview, setLibPreview] = useState<LibraryMenu | null>(null);
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: BaseItem | null }>({ open: false, item: null });
  const [catFilter, setCatFilter] = useState<string>('');
  const [photoFor, setPhotoFor] = useState<MenuRecord | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [m, it, cats] = await Promise.all([
        listMenus(),
        supabase.from('menu_items').select('*, category:categories(name)').order('name'),
        supabase.from('categories').select('id, name').order('name'),
      ]);
      setMenus(m);
      setItems((it.data as BaseItem[]) || []);
      setCategories((cats.data as Category[]) || []);
    } catch (e) {
      toast.error('Erro ao carregar cardápios: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const visibleMenus = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menus
      .filter((m) => showInactive || m.is_active)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.items.some((i) => i.name.toLowerCase().includes(q)));
  }, [menus, showInactive, search]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => !catFilter || i.category_id === catFilter)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }, [items, search, catFilter]);

  const importedKeys = useMemo(() => new Set(menus.map((m) => m.library_key).filter(Boolean)), [menus]);

  async function importLib(lib: LibraryMenu) {
    setBusy(lib.key);
    try {
      await importLibraryMenu(lib.key);
      toast.success(`"${lib.name}" adicionado aos seus cardápios. Ajuste itens e preço quando quiser.`);
      setLibPreview(null);
      await fetchAll();
    } catch (e) {
      toast.error('Erro ao adicionar: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function duplicate(m: MenuRecord) {
    setBusy(m.id);
    try {
      await duplicateMenu(m);
      toast.success('Cardápio duplicado.');
      await fetchAll();
    } catch (e) {
      toast.error('Erro ao duplicar: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    if (!pending) return;
    setConfirmLoading(true);
    try {
      if (pending.kind === 'menu-delete') {
        const ok = await deleteMenu(pending.menu.id);
        if (!ok) {
          toast.error('Este cardápio está vinculado a outros registros. Desative em vez de excluir.');
          return;
        }
        toast.success('Cardápio excluído.');
      } else if (pending.kind === 'menu-toggle') {
        await setMenuActive(pending.menu.id, !pending.menu.is_active);
        toast.success(pending.menu.is_active ? 'Cardápio desativado.' : 'Cardápio ativado.');
      } else if (pending.kind === 'item-delete') {
        const { error } = await supabase.from('menu_items').delete().eq('id', pending.item.id);
        if (error) throw error.code === '23503' ? new Error('Item usado em cardápios. Remova-o deles primeiro.') : error;
        toast.success('Item excluído.');
      } else if (pending.kind === 'category-delete') {
        await supabase.from('menu_items').update({ category_id: null }).eq('category_id', pending.category.id);
        const { error } = await supabase.from('categories').delete().eq('id', pending.category.id);
        if (error) throw error;
        if (catFilter === pending.category.id) setCatFilter('');
        toast.success('Categoria excluída.');
      }
      setPending(null);
      await fetchAll();
    } catch (e) {
      toast.error((e as Error).message || 'Falha na operação.');
    } finally {
      setConfirmLoading(false);
    }
  }

  const confirmCopy = (() => {
    if (!pending) return { title: '', description: '', confirmText: '', variant: 'default' as const };
    switch (pending.kind) {
      case 'menu-delete':
        return {
          title: 'Excluir cardápio?',
          description: `"${pending.menu.name}" será apagado. Orçamentos que usavam ele continuam existindo, mas sem cardápio vinculado.`,
          confirmText: 'Excluir',
          variant: 'destructive' as const,
        };
      case 'menu-toggle':
        return pending.menu.is_active
          ? {
              title: 'Desativar cardápio?',
              description: `"${pending.menu.name}" deixa de aparecer em novos orçamentos e na vitrine. Você pode reativar depois.`,
              confirmText: 'Desativar',
              variant: 'warning' as const,
            }
          : { title: 'Ativar cardápio?', description: `"${pending.menu.name}" volta a aparecer.`, confirmText: 'Ativar', variant: 'default' as const };
      case 'item-delete':
        return { title: 'Excluir item?', description: `"${pending.item.name}" será apagado.`, confirmText: 'Excluir', variant: 'destructive' as const };
      case 'category-delete':
        return {
          title: 'Excluir categoria?',
          description: `A categoria "${pending.category.name}" será apagada. Os itens dela ficam sem categoria.`,
          confirmText: 'Excluir',
          variant: 'destructive' as const,
        };
    }
  })();

  return (
    <div className="w-full space-y-5 sm:space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Cardápios</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base">Monte seus cardápios com foto, use os prontos e controle os itens base.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full lg:w-auto">
          <button type="button" className={tabBtn(tab === 'menus')} onClick={() => setTab('menus')}>Meus cardápios</button>
          <button type="button" className={tabBtn(tab === 'library')} onClick={() => setTab('library')}>Prontos</button>
          <button type="button" className={tabBtn(tab === 'items')} onClick={() => setTab('items')}>Itens base</button>
        </div>
      </header>

      {migrationPending && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-slate-700">
          Falta rodar a atualização do banco <b>0009_cardapios_fotos.sql</b> no Supabase. Até lá, fotos, preço e seções dos cardápios não são salvos.
        </div>
      )}

      {tab !== 'library' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <Input
              placeholder={tab === 'menus' ? 'Buscar cardápio ou item...' : 'Buscar item base...'}
              className="pl-12 min-h-[48px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === 'menus' ? (
            <>
              <Button type="button" variant="outline" className="h-12 rounded-xl border-slate-200" onClick={() => setShowInactive((v) => !v)}>
                {showInactive ? <Power className="size-4 mr-2 text-success" /> : <Ban className="size-4 mr-2 text-slate-400" />}
                {showInactive ? 'Ocultar desativados' : 'Mostrar desativados'}
              </Button>
              <Button asChild className="h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold px-5">
                <Link href="/dashboard/menu/new"><Plus className="size-5 mr-1" /> Novo cardápio</Link>
              </Button>
            </>
          ) : (
            <Button className="h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold px-5" onClick={() => setItemDialog({ open: true, item: null })}>
              <Plus className="size-5 mr-1" /> Novo item
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 gap-3">
          <Loader2 className="size-6 animate-spin text-primary" /> Carregando...
        </div>
      ) : tab === 'menus' ? (
        visibleMenus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-border rounded-2xl bg-white text-center px-6">
            <ChefHat className="size-12 text-primary/40 mb-3" />
            <p className="text-base font-semibold text-slate-900">{menus.length ? 'Nenhum cardápio encontrado.' : 'Você ainda não tem cardápios.'}</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">Comece por um cardápio pronto (feijoada, churrasco, strogonoff...) e ajuste do seu jeito.</p>
            <Button onClick={() => setTab('library')} className="h-11 rounded-xl"><BookOpen className="size-4 mr-2" /> Ver cardápios prontos</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleMenus.map((m) => (
              <article key={m.id} className="bg-white border border-border shadow-card rounded-2xl overflow-hidden flex flex-col">
                <div className={`relative aspect-[16/9] bg-slate-100 ${m.is_active ? '' : 'grayscale opacity-70'}`}>
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt={m.name} className="absolute inset-0 size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 text-sm">
                      <ChefHat className="size-10" /> Sem foto
                    </div>
                  )}
                  {m.price_per_person != null && (
                    <span className="absolute bottom-3 left-3 text-sm font-bold bg-white/95 text-slate-900 rounded-full px-3 py-1 shadow">
                      {formatBRL(m.price_per_person)}<span className="text-xs font-medium text-slate-500">/pessoa</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPhotoFor(m)}
                    className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-white/95 text-slate-800 text-sm font-semibold shadow hover:bg-white"
                  >
                    <Camera className="size-4" /> {m.image_url ? 'Trocar foto' : 'Pôr foto'}
                  </button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{m.name}</h3>
                      {m.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{m.description}</p>}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={m.is_active}
                      onClick={() => setPending({ kind: 'menu-toggle', menu: m })}
                      className={`shrink-0 inline-flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border text-xs font-bold ${
                        m.is_active ? 'border-success/40 bg-success/10 text-success' : 'border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                      title={m.is_active ? 'Clique para inativar' : 'Clique para ativar'}
                    >
                      <span className={`relative h-6 w-10 rounded-full transition ${m.is_active ? 'bg-success' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${m.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                      </span>
                      {m.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.items.slice(0, 6).map((i, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-slate-700 font-medium">{i.name}</span>
                    ))}
                    {m.items.length > 6 && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">+{m.items.length - 6}</span>}
                    {m.items.length === 0 && <span className="text-xs text-slate-400">Nenhum item</span>}
                  </div>
                  <div className="mt-auto grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100">
                    <Button asChild variant="outline" className="h-11 rounded-xl font-semibold border-slate-200 px-2 text-xs sm:text-sm">
                      <Link href={`/dashboard/menu/${m.id}/edit`}><ListChecks className="size-4" /> Editar itens</Link>
                    </Button>
                    <Button variant="outline" className="h-11 rounded-xl font-semibold border-slate-200 px-2 text-xs sm:text-sm" disabled={busy === m.id} onClick={() => duplicate(m)}>
                      {busy === m.id ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />} Duplicar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl font-semibold border-slate-200 px-2 text-xs sm:text-sm hover:text-destructive hover:border-destructive/30"
                      onClick={() => setPending({ kind: 'menu-delete', menu: m })}
                    >
                      <Trash2 className="size-4" /> Excluir
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : tab === 'library' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Cardápios tradicionais montados com quantidades por pessoa. Ao adicionar, ele vira seu: dá para mudar itens, foto e preço.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {MENU_LIBRARY.map((lib) => (
              <article key={lib.key} className="bg-white border border-border shadow-card rounded-2xl overflow-hidden flex flex-col">
                <button type="button" className="relative aspect-[4/3] bg-slate-100 text-left" onClick={() => setLibPreview(lib)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lib.image} alt={lib.name} className="absolute inset-0 size-full object-cover" loading="lazy" />
                  <span className="absolute top-3 left-3 text-[11px] font-semibold bg-white/95 text-slate-700 rounded-full px-2.5 py-1">{lib.category}</span>
                </button>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3 className="font-bold text-slate-900 leading-tight">{lib.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{lib.description}</p>
                  <p className="text-xs text-slate-500">
                    Mercado: <b className="text-slate-700">{formatBRL(lib.priceRange.min)} a {formatBRL(lib.priceRange.max)}</b> por pessoa
                  </p>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" className="h-11 rounded-xl border-slate-200" onClick={() => setLibPreview(lib)}>Ver itens</Button>
                    <Button className="h-11 rounded-xl" disabled={busy === lib.key} onClick={() => importLib(lib)}>
                      {busy === lib.key ? <Loader2 className="size-4 animate-spin" /> : importedKeys.has(lib.key) ? <Check className="size-4" /> : <Plus className="size-4" />}
                      {importedKeys.has(lib.key) ? 'De novo' : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">Fotos reais do Wikimedia Commons sob licenças Creative Commons (crédito em cada cardápio).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <aside className="space-y-3">
            <CategoryBox categories={categories} active={catFilter} onPick={setCatFilter} onDelete={(c) => setPending({ kind: 'category-delete', category: c })} onChanged={fetchAll} />
          </aside>
          <div className="lg:col-span-3">
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-border rounded-2xl bg-white text-center px-6">
                <Package className="size-12 text-primary/40 mb-3" />
                <p className="font-semibold text-slate-900">Nenhum item base.</p>
                <p className="text-sm text-slate-500 mt-1">Cadastre insumos com custo (carne, arroz, refrigerante...) para controlar seus gastos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleItems.map((item) => (
                  <div key={item.id} className="bg-white border border-border shadow-card rounded-2xl p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-[11px] font-bold text-primary uppercase tracking-wider">{item.type || 'Insumo'}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="size-10 text-slate-500 hover:text-primary" aria-label="Editar" onClick={() => setItemDialog({ open: true, item })}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-10 text-slate-500 hover:text-destructive" aria-label="Excluir" onClick={() => setPending({ kind: 'item-delete', item })}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-900">{item.name}</h4>
                    <p className="text-sm text-slate-500 line-clamp-1">{item.description || 'Sem descrição'}</p>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 uppercase font-bold truncate">{item.category?.name || 'Sem categoria'}</span>
                      <span className="font-bold text-slate-900">
                        {formatBRL(Number(item.cost_price) || 0)}
                        <span className="text-xs text-slate-500 font-normal">/{item.unit || 'un'}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmText={confirmCopy.confirmText}
        variant={confirmCopy.variant}
        loading={confirmLoading}
        onConfirm={confirm}
      />

      <Dialog open={!!libPreview} onOpenChange={(o) => !o && setLibPreview(null)}>
        <DialogContent className="max-w-lg max-h-[90svh] overflow-y-auto !rounded-2xl">
          {libPreview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={libPreview.image} alt={libPreview.name} className="w-full aspect-[16/9] object-cover rounded-xl" />
              <DialogHeader>
                <DialogTitle>{libPreview.name}</DialogTitle>
                <DialogDescription>{libPreview.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {groupBySection(libPreview.items).map((g) => (
                  <div key={g.section}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">{g.section}</p>
                    <ul className="space-y-1">
                      {g.items.map((i) => (
                        <li key={i.name} className="flex justify-between gap-3 text-sm">
                          <span className="text-slate-800">{i.name}</span>
                          <span className="text-slate-500 shrink-0">{i.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-[11px] text-slate-400">{libPreview.credit}</p>
              </div>
              <DialogFooter>
                <Button className="w-full h-12 rounded-xl" disabled={busy === libPreview.key} onClick={() => importLib(libPreview)}>
                  {busy === libPreview.key ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Adicionar aos meus cardápios
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <MenuPhotoDialog
        menu={photoFor}
        onClose={() => setPhotoFor(null)}
        onSaved={(id, url, credit) => setMenus((list) => list.map((x) => (x.id === id ? { ...x, image_url: url, image_credit: credit } : x)))}
      />

      <BaseItemDialog
        key={itemDialog.open ? itemDialog.item?.id ?? 'new' : 'closed'}
        open={itemDialog.open}
        item={itemDialog.item}
        categories={categories}
        onClose={() => setItemDialog({ open: false, item: null })}
        onSaved={fetchAll}
      />
    </div>
  );
}

function MenuPhotoDialog({
  menu,
  onClose,
  onSaved,
}: {
  menu: MenuRecord | null;
  onClose: () => void;
  onSaved: (id: string, url: string | null, credit: string | null) => void;
}) {
  const { tenant } = useTenant();
  const [busy, setBusy] = useState(false);

  async function apply(url: string | null, credit: string | null) {
    if (!menu) return;
    setBusy(true);
    try {
      await setMenuPhoto(menu.id, url, credit);
      if (menu.image_url && menu.image_url !== url) removeMenuPhoto(menu.image_url);
      onSaved(menu.id, url, credit);
      toast.success(url ? 'Foto atualizada.' : 'Foto removida.');
      onClose();
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao salvar a foto.');
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file || !tenant || !menu) return;
    setBusy(true);
    let url: string | null = null;
    try {
      url = await uploadMenuPhoto(tenant.id, file);
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao enviar a foto.');
      setBusy(false);
      return;
    }
    await apply(url, null);
  }

  return (
    <Dialog open={!!menu} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md !rounded-2xl">
        <DialogHeader>
          <DialogTitle>Foto do cardápio</DialogTitle>
          <DialogDescription>{menu?.name}</DialogDescription>
        </DialogHeader>
        {menu?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={menu.image_url} alt="" className="w-full aspect-[16/9] object-cover rounded-xl" />
        )}
        <label className={`flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-white font-semibold cursor-pointer hover:bg-primary-dark ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {busy ? 'Salvando...' : 'Enviar foto do celular/computador'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Ou use uma foto pronta</p>
          <div className="grid grid-cols-4 gap-2">
            {MENU_LIBRARY.map((l) => (
              <button
                key={l.key}
                type="button"
                disabled={busy}
                title={l.name}
                onClick={() => apply(l.image, l.credit)}
                className={`aspect-square rounded-lg overflow-hidden border-2 ${menu?.image_url === l.image ? 'border-primary' : 'border-transparent hover:border-slate-300'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.image} alt={l.name} className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        {menu?.image_url && (
          <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => apply(null, null)}>
            <Trash2 className="size-4" /> Remover foto
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryBox({
  categories,
  active,
  onPick,
  onDelete,
  onChanged,
}: {
  categories: Category[];
  active: string;
  onPick: (id: string) => void;
  onDelete: (c: Category) => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('categories').insert([{ name: name.trim() }]);
    setSaving(false);
    if (error) return toast.error('Erro ao criar categoria: ' + error.message);
    setName('');
    onChanged();
  }

  async function rename() {
    if (!editing || !editing.name.trim()) return setEditing(null);
    const { error } = await supabase.from('categories').update({ name: editing.name.trim() }).eq('id', editing.id);
    if (error) return toast.error('Erro ao renomear: ' + error.message);
    setEditing(null);
    onChanged();
  }

  return (
    <div className="bg-white border border-border shadow-card rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Categorias</p>
      <form onSubmit={add} className="flex gap-2">
        <Input placeholder="Nova categoria" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" size="icon" className="size-12 shrink-0" disabled={saving} aria-label="Adicionar categoria">
          <Plus className="size-4" />
        </Button>
      </form>
      <div className="space-y-1">
        <button type="button" onClick={() => onPick('')} className={`w-full text-left px-3 h-10 rounded-lg text-sm font-semibold ${!active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}>
          Todas
        </button>
        {categories.map((c) =>
          editing?.id === c.id ? (
            <div key={c.id} className="flex gap-1">
              <Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && rename()} />
              <Button size="icon" className="size-12 shrink-0" onClick={rename} aria-label="Salvar"><Check className="size-4" /></Button>
            </div>
          ) : (
            <div key={c.id} className={`flex items-center rounded-lg ${active === c.id ? 'bg-primary/10' : 'hover:bg-slate-50'}`}>
              <button type="button" onClick={() => onPick(c.id)} className={`flex-1 text-left px-3 h-10 text-sm font-semibold flex items-center gap-2 min-w-0 ${active === c.id ? 'text-primary' : 'text-slate-700'}`}>
                <Tag className="size-4 shrink-0" /> <span className="truncate">{c.name}</span>
              </button>
              <Button variant="ghost" size="icon" className="size-9 text-slate-400 hover:text-primary" aria-label="Renomear" onClick={() => setEditing({ id: c.id, name: c.name })}>
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-9 text-slate-400 hover:text-destructive" aria-label="Excluir categoria" onClick={() => onDelete(c)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function BaseItemDialog({
  open,
  item,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: BaseItem | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => ({
    name: item?.name || '',
    description: item?.description || '',
    type: item?.type || 'Insumos',
    category_id: item?.category_id || '',
    cost_price: item?.cost_price != null ? String(item.cost_price).replace('.', ',') : '',
    unit: item?.unit || 'kg',
  }));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome do item.');
    const cost = form.cost_price.trim() ? Number(form.cost_price.replace(/\./g, '').replace(',', '.')) : 0;
    if (!Number.isFinite(cost) || cost < 0) return toast.error('Custo inválido.');
    const row = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      category_id: form.category_id || null,
      cost_price: cost,
      unit: form.unit.trim() || 'un',
    };
    setSaving(true);
    const { error } = item
      ? await supabase.from('menu_items').update(row).eq('id', item.id)
      : await supabase.from('menu_items').insert([row]);
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success(item ? 'Item atualizado.' : 'Item cadastrado.');
    onClose();
    onSaved();
  }

  const selectCls = 'h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-slate-900';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md !rounded-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar item base' : 'Novo item base'}</DialogTitle>
          <DialogDescription>Insumos e custos que você usa para montar os cardápios.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="field-group">
            <Label htmlFor="bi-name">Nome</Label>
            <Input id="bi-name" maxLength={120} placeholder="Ex: Picanha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-group">
              <Label htmlFor="bi-type">Tipo</Label>
              <select id="bi-type" className={selectCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ITEM_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field-group">
              <Label htmlFor="bi-cat">Categoria</Label>
              <select id="bi-cat" className={selectCls} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-group">
              <Label htmlFor="bi-cost">Custo (R$)</Label>
              <Input id="bi-cost" inputMode="decimal" placeholder="0,00" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            </div>
            <div className="field-group">
              <Label htmlFor="bi-unit">Unidade</Label>
              <Input id="bi-unit" maxLength={12} placeholder="kg, un, L" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div className="field-group">
            <Label htmlFor="bi-desc">Descrição</Label>
            <Input id="bi-desc" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="h-12" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
