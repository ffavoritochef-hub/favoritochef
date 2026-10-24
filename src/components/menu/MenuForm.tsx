'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ChefHat, ChevronLeft, ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MENU_LIBRARY, SECTION_ORDER } from '@/lib/menu-library';
import { getMenu, removeMenuPhoto, saveMenu, uploadMenuPhoto, type MenuData, type MenuItemRow } from '@/lib/menus';

const textareaCls =
  'w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none';

const EMPTY: MenuData = {
  name: '',
  description: '',
  image_url: null,
  image_credit: null,
  price_per_person: null,
  library_key: null,
  is_active: true,
};

export function MenuForm({ menuId }: { menuId?: string }) {
  const router = useRouter();
  const { tenant } = useTenant();
  const [data, setData] = useState<MenuData>(EMPTY);
  const [items, setItems] = useState<MenuItemRow[]>([{ section: 'Prato principal', name: '', quantity: '' }]);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(!!menuId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!menuId) return;
    getMenu(menuId)
      .then((m) => {
        if (!m) return setNotFound(true);
        setData({
          name: m.name,
          description: m.description,
          image_url: m.image_url,
          image_credit: m.image_credit,
          price_per_person: m.price_per_person,
          library_key: m.library_key,
          is_active: m.is_active,
        });
        setPrice(m.price_per_person != null ? String(m.price_per_person).replace('.', ',') : '');
        setItems(m.items.length ? m.items.map(({ section, name, quantity }) => ({ section, name, quantity })) : []);
        setOriginalImage(m.image_url);
      })
      .catch((e) => toast.error('Erro ao carregar o cardápio: ' + e.message))
      .finally(() => setLoading(false));
  }, [menuId]);

  const set = (patch: Partial<MenuData>) => setData((d) => ({ ...d, ...patch }));
  const setItem = (i: number, patch: Partial<MenuItemRow>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  async function upload(file: File | undefined) {
    if (!file || !tenant) return;
    setUploading(true);
    try {
      const url = await uploadMenuPhoto(tenant.id, file);
      // descarta upload anterior desta mesma edição (que ainda não foi salvo)
      if (data.image_url && data.image_url !== originalImage) removeMenuPhoto(data.image_url);
      set({ image_url: url, image_credit: null });
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = data.name.trim();
    if (!name) return toast.error('Dê um nome ao cardápio.');
    const filled = items.filter((i) => i.name.trim());
    if (!filled.length) return toast.error('Adicione pelo menos um item ao cardápio.');
    const p = price.trim() ? Number(price.replace(/\./g, '').replace(',', '.')) : null;
    if (p != null && (!Number.isFinite(p) || p < 0)) return toast.error('Preço por pessoa inválido.');

    setSaving(true);
    try {
      await saveMenu(menuId ?? null, { ...data, name, price_per_person: p }, filled);
      if (originalImage && originalImage !== data.image_url) removeMenuPhoto(originalImage);
      toast.success(menuId ? 'Cardápio atualizado!' : 'Cardápio criado!');
      router.push('/dashboard/menu');
    } catch (err) {
      toast.error('Erro ao salvar: ' + ((err as Error).message || 'tente de novo'));
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 gap-3">
        <Loader2 className="size-6 animate-spin text-primary" /> Carregando cardápio...
      </div>
    );
  if (notFound)
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-lg font-semibold text-slate-900">Cardápio não encontrado.</p>
        <Button asChild variant="outline"><Link href="/dashboard/menu">Voltar aos cardápios</Link></Button>
      </div>
    );

  const sections = [...new Set([...SECTION_ORDER, ...items.map((i) => i.section).filter(Boolean)])];

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0">
          <Link href="/dashboard/menu" aria-label="Voltar"><ChevronLeft className="size-5" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{menuId ? 'Editar cardápio' : 'Novo cardápio'}</h1>
          <p className="text-sm sm:text-base text-slate-500">Foto, itens e preço aparecem nos orçamentos e na sua vitrine.</p>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5">
            <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ChefHat className="size-5" /></span>
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 grid gap-6 md:grid-cols-[260px_1fr]">
            <div className="space-y-2">
              <Label>Foto do cardápio</Label>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-slate-50">
                {data.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.image_url} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 text-sm">
                    <ImagePlus className="size-8" /> Sem foto
                  </div>
                )}
                {data.image_url && (
                  <button
                    type="button"
                    onClick={() => set({ image_url: null, image_credit: null })}
                    className="absolute top-2 right-2 size-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Remover foto"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-primary/30 text-primary font-semibold text-sm cursor-pointer hover:bg-primary/5">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? 'Enviando...' : 'Enviar foto'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-600 font-medium py-1">Usar uma foto pronta</summary>
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {MENU_LIBRARY.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      title={m.name}
                      onClick={() => set({ image_url: m.image, image_credit: m.credit })}
                      className={`aspect-square rounded-lg overflow-hidden border-2 ${data.image_url === m.image ? 'border-primary' : 'border-transparent'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image} alt={m.name} className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </details>
              {data.image_credit && <p className="text-[11px] text-slate-400 leading-snug">{data.image_credit}</p>}
            </div>

            <div className="space-y-5">
              <div className="field-group">
                <Label htmlFor="name">Nome do cardápio</Label>
                <Input id="name" maxLength={120} placeholder="Ex: Feijoada Completa" value={data.name} onChange={(e) => set({ name: e.target.value })} required />
              </div>
              <div className="field-group">
                <Label htmlFor="description">Descrição</Label>
                <textarea id="description" rows={3} maxLength={500} className={textareaCls} placeholder="Uma frase que apresenta o cardápio ao cliente" value={data.description} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="field-group">
                  <Label htmlFor="price">Preço por pessoa (opcional)</Label>
                  <Input id="price" inputMode="decimal" placeholder="Ex: 79,90" value={price} onChange={(e) => setPrice(e.target.value)} />
                  <p className="text-xs text-slate-500 mt-1">Usado como base no pré-orçamento.</p>
                </div>
                <div className="field-group">
                  <Label>Situação</Label>
                  <button
                    type="button"
                    onClick={() => set({ is_active: !data.is_active })}
                    className={`h-12 w-full rounded-xl border font-semibold text-sm ${data.is_active ? 'border-success/40 bg-success/10 text-success' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                  >
                    {data.is_active ? 'Ativo (aparece em orçamentos e vitrine)' : 'Desativado (fica oculto)'}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <CardTitle className="text-lg sm:text-xl text-slate-900">Itens do cardápio</CardTitle>
            <Button type="button" variant="outline" className="h-11 border-primary/30 text-primary hover:bg-primary/5" onClick={() => setItems((l) => [...l, { section: l[l.length - 1]?.section || 'Prato principal', name: '', quantity: '' }])}>
              <Plus className="size-4 mr-1" /> Adicionar item
            </Button>
          </CardHeader>
          <CardContent className="px-4 sm:px-8 py-6 space-y-3">
            <datalist id="menu-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border p-3 sm:p-0 sm:border-0 grid grid-cols-1 sm:grid-cols-[170px_1fr_150px_auto] gap-2 sm:gap-3 items-end">
                <div>
                  <Label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold sm:sr-only">Seção</Label>
                  <Input list="menu-sections" placeholder="Seção" value={it.section} maxLength={40} onChange={(e) => setItem(i, { section: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold sm:sr-only">Item</Label>
                  <Input placeholder="Ex: Arroz branco" value={it.name} maxLength={160} onChange={(e) => setItem(i, { name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold sm:sr-only">Quantidade</Label>
                  <Input placeholder="Ex: 150 g/pessoa" value={it.quantity} maxLength={60} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                </div>
                <div className="flex gap-1 justify-end">
                  <Button type="button" variant="ghost" size="icon" className="size-11 text-slate-500" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-11 text-slate-500" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-11 text-slate-500 hover:text-destructive" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} aria-label="Remover item"><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-500">
                Nenhum item. Clique em &quot;Adicionar item&quot;.
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700">
              <Link href="/dashboard/menu">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saving || uploading} className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold gap-2">
              {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
              {saving ? 'Salvando...' : 'Salvar cardápio'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
