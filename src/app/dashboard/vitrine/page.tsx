'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Plus,
  QrCode,
  Save,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { authFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { safeColor } from '@/lib/tenant';
import { EVENT_TYPES } from '@/lib/leads';
import { resizeToJpegBlob } from '@/lib/image-utils';
import { ShowcaseView } from '@/components/showcase/ShowcaseView';
import { ShowcaseQrDialog } from '@/components/showcase/ShowcaseQrDialog';
import { libraryMenu } from '@/lib/menu-library';
import {
  GALLERY_LAYOUTS,
  SECTION_META,
  SHOWCASE_BUCKET,
  SHOWCASE_MENU_SELECT,
  SHOWCASE_MENU_SELECT_BASIC,
  SHOWCASE_LIMITS as L,
  SHOWCASE_THEMES,
  defaultShowcase,
  normalizeInstagram,
  normalizeShowcase,
  pickMenus,
  showcaseImageUrls,
  storagePathFromUrl,
  toShowcaseMenus,
  type GalleryLayout,
  type SectionKey,
  type ShowcaseContent,
  type ShowcaseMenu,
  type ShowcaseTheme,
} from '@/lib/showcase';

export const dynamic = 'force-dynamic';

const textareaCls = 'w-full rounded-xl border border-input bg-white px-3 py-3 text-base text-slate-900 focus:border-primary outline-none';

const THEME_SWATCH: Record<ShowcaseTheme, string> = {
  classico: 'bg-[#FAF6EF] font-serif',
  moderno: 'bg-white font-sans font-extrabold',
  festivo: 'bg-[#FFF6F0] font-sans font-bold',
};

export default function ShowcaseEditorPage() {
  const { tenant } = useTenant();
  const [content, setContent] = useState<ShowcaseContent | null>(null);
  const [savedJson, setSavedJson] = useState('');
  const [savedUrls, setSavedUrls] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [menus, setMenus] = useState<ShowcaseMenu[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswers, setAiAnswers] = useState({ kind: '', highlight: '', extra: '' });
  const [qrOpen, setQrOpen] = useState(false);
  const [stats, setStats] = useState<{ week: number; month: number; leads: number } | null>(null);
  // fotos enviadas nesta sessão: se saírem antes de salvar, são apagadas do storage
  const sessionUploads = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const loadMenus = async () => {
        const full = await supabase.from('menu_templates').select(SHOWCASE_MENU_SELECT).order('name');
        if (!full.error) return full.data ?? [];
        const basic = await supabase.from('menu_templates').select(SHOWCASE_MENU_SELECT_BASIC).order('name');
        return basic.data ?? [];
      };
      const [show, menuRows] = await Promise.all([
        supabase.from('tenant_showcase').select('content, published').eq('tenant_id', tenant.id).maybeSingle(),
        loadMenus(),
      ]);
      if (show.error) {
        if (show.error.code === 'PGRST205' || show.error.code === '42P01') setMissingTable(true);
        else toast.error('Erro ao carregar a vitrine: ' + show.error.message);
      }
      const c = show.data ? normalizeShowcase(show.data.content, tenant.name) : defaultShowcase(tenant.name);
      setContent(c);
      setSavedJson(JSON.stringify(c));
      setSavedUrls(showcaseImageUrls(c));
      setPublished(!!show.data?.published);
      setMenus(toShowcaseMenus(menuRows as never[], (k) => libraryMenu(k)?.image ?? null));
    })();
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const since = (days: number) => {
        const d = new Date(Date.now() - (days - 1) * 86400000);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      };
      const [visits, leads] = await Promise.all([
        supabase.from('showcase_visits').select('day, views').gte('day', since(30)),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('source', 'vitrine')
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);
      if (visits.error) return;
      const rows = visits.data ?? [];
      const weekStart = since(7);
      setStats({
        week: rows.filter((r) => r.day >= weekStart).reduce((n, r) => n + r.views, 0),
        month: rows.reduce((n, r) => n + r.views, 0),
        leads: leads.count ?? 0,
      });
    })();
  }, [tenant]);

  const dirty = useMemo(() => !!content && JSON.stringify(content) !== savedJson, [content, savedJson]);

  // avisa ao fechar a aba com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!tenant || !content) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/vitrine/${tenant.slug}` : `/vitrine/${tenant.slug}`;

  const update = (fn: (c: ShowcaseContent) => ShowcaseContent) => setContent((c) => (c ? fn(c) : c));

  async function uploadImage(file: File, maxSize = 1600): Promise<string> {
    if (!/^image\/(png|jpe?g|webp|heic|heif)$/.test(file.type)) throw new Error('Use fotos JPG, PNG ou WEBP.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Foto muito grande (máx. 20 MB).');
    const blob = await resizeToJpegBlob(file, maxSize);
    const path = `${tenant!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from(SHOWCASE_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    const url = supabase.storage.from(SHOWCASE_BUCKET).getPublicUrl(path).data.publicUrl;
    sessionUploads.current.add(url);
    return url;
  }

  /** Envia 1 foto e entrega a URL para `apply`. `key` identifica o botão que mostra "Enviando...". */
  async function pickOne(key: string, file: File | undefined, apply: (url: string) => void, maxSize?: number) {
    if (!file) return;
    setUploading(key);
    try {
      apply(await uploadImage(file, maxSize));
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao enviar a foto.');
    } finally {
      setUploading(null);
    }
  }

  async function addHeroSlides(files: FileList | null) {
    if (!files?.length) return;
    const room = L.heroSlides - content!.hero.slides.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast.warning(`A capa aceita até ${L.heroSlides} fotos extras. Enviando ${list.length}.`);
    for (let i = 0; i < list.length; i++) {
      setUploading(`slides:${i + 1}/${list.length}`);
      try {
        const url = await uploadImage(list[i], 2000);
        update((c) => ({ ...c, hero: { ...c.hero, slides: [...c.hero.slides, url].slice(0, L.heroSlides) } }));
      } catch (e) {
        toast.error(`${list[i].name}: ${(e as Error).message}`);
      }
    }
    setUploading(null);
  }

  async function addGallery(files: FileList | null) {
    if (!files?.length) return;
    const room = L.gallery - content!.gallery.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast.warning(`A galeria aceita até ${L.gallery} fotos. Enviando ${list.length}.`);
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      setUploading(`gallery:${i + 1}/${list.length}`);
      try {
        const url = await uploadImage(list[i]);
        update((c) => ({ ...c, gallery: [...c.gallery, { url, caption: '' }].slice(0, L.gallery) }));
        ok++;
      } catch (e) {
        toast.error(`${list[i].name}: ${(e as Error).message}`);
      }
    }
    setUploading(null);
    if (ok) toast.success(ok === 1 ? 'Foto adicionada!' : `${ok} fotos adicionadas!`);
  }

  async function save(nextPublished = published) {
    if (!content) return;
    const clean = normalizeShowcase(content, tenant!.name);
    setSaving(true);
    const { error } = await supabase
      .from('tenant_showcase')
      .upsert({ tenant_id: tenant!.id, content: clean, published: nextPublished }, { onConflict: 'tenant_id' });
    setSaving(false);
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') setMissingTable(true);
      return toast.error('Erro ao salvar: ' + error.message);
    }

    // apaga do storage as fotos que saíram da vitrine (melhor esforço)
    const keep = new Set(showcaseImageUrls(clean));
    const gone = [...new Set([...savedUrls, ...sessionUploads.current])]
      .filter((u) => !keep.has(u))
      .map(storagePathFromUrl)
      .filter((p): p is string => !!p && p.startsWith(tenant!.id + '/'));
    if (gone.length) supabase.storage.from(SHOWCASE_BUCKET).remove(gone).then(() => {}, () => {});
    sessionUploads.current.clear();

    setContent(clean);
    setSavedJson(JSON.stringify(clean));
    setSavedUrls([...keep]);
    const wasPublished = published;
    setPublished(nextPublished);
    if (nextPublished && !wasPublished) toast.success('Vitrine publicada! Já pode compartilhar o link.');
    else if (!nextPublished && wasPublished) toast.success('Vitrine despublicada. O link ficou fora do ar.');
    else toast.success('Alterações salvas!');
  }

  async function runAi() {
    if (!content) return;
    const images = [...new Set([content.hero.image, ...content.gallery.map((g) => g.url)].filter((u): u is string => !!u))].slice(0, 12);
    setAiBusy(true);
    try {
      const res = await authFetch('/api/showcase/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', answers: aiAnswers, images }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Erro ao falar com a IA.');
      const before = content;
      update((c) => {
        const captions = new Map<string, string>(out.photos.map((p: { url: string; caption: string }) => [p.url, p.caption]));
        const ordered = (out.photos as { url: string }[])
          .map((p) => c.gallery.find((g) => g.url === p.url))
          .filter((g): g is { url: string; caption: string } => !!g)
          .map((g) => ({ url: g.url, caption: g.caption || captions.get(g.url) || '' }));
        const rest = c.gallery.filter((g) => !captions.has(g.url));
        const suggested = out.events as { title: string; text: string }[];
        return {
          ...c,
          hero: { title: out.heroTitle || c.hero.title, subtitle: out.heroSubtitle || c.hero.subtitle, image: c.hero.image ?? out.cover, slides: c.hero.slides },
          about: { ...c.about, text: out.aboutText || c.about.text },
          contact: { ...c.contact, text: out.contactText || c.contact.text },
          gallery: [...ordered, ...rest],
          events: c.events.length
            ? c.events.map((e) => (e.text ? e : { ...e, text: suggested.find((x) => x.title.toLowerCase() === e.title.toLowerCase())?.text ?? '' }))
            : suggested.map((e) => ({ ...e, image: null })),
        };
      });
      setAiOpen(false);
      toast.success('Pronto! Revise os textos e salve.', { duration: 10000, action: { label: 'Desfazer', onClick: () => setContent(before) } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  const openAi = () => {
    setAiAnswers((a) => ({ ...a, kind: a.kind || content.events.map((e) => e.title).filter(Boolean).join(', ') }));
    setAiOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  };

  const moveSection = (i: number, d: -1 | 1) =>
    update((c) => {
      const s = [...c.sections];
      const j = i + d;
      if (j < 0 || j >= s.length) return c;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...c, sections: s };
    });

  const setSection = (key: SectionKey, patch: Partial<{ enabled: boolean; title: string }>) =>
    update((c) => ({ ...c, sections: c.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  const busy = uploading !== null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 md:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="size-6 text-primary" /> Vitrine
          </h1>
          <p className="text-sm text-slate-500">Monte uma página bonita para apresentar seu buffet aos clientes.</p>
        </div>
        <span
          className={cn(
            'self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
            published ? 'bg-success/10 text-success border-success/20' : 'bg-slate-100 text-slate-500 border-slate-200'
          )}
        >
          {published ? <Check className="size-4" /> : <EyeOff className="size-4" />}
          {published ? 'Publicada' : 'Rascunho'}
        </span>
      </div>

      {missingTable && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm text-slate-700">
            A vitrine ainda não foi ativada no banco de dados. Execute a migração <code className="font-mono">0008_vitrine.sql</code> no SQL Editor do Supabase.
          </CardContent>
        </Card>
      )}

      {/* Link e publicação */}
      <Card className="bg-white border-border">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <Label>Link da sua vitrine</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={publicUrl} onFocus={(e) => e.target.select()} className="h-11 rounded-xl font-mono text-sm" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copyLink} disabled={!published} className="flex-1 sm:flex-none min-h-[44px] gap-2">
                <Copy className="size-4" /> Copiar
              </Button>
              <Button type="button" variant="outline" asChild={published} disabled={!published} className="flex-1 sm:flex-none min-h-[44px] gap-2">
                {published ? (
                  <a href={`/vitrine/${tenant.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" /> Abrir
                  </a>
                ) : (
                  <span><ExternalLink className="size-4" /> Abrir</span>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setQrOpen(true)} disabled={!published} className="flex-1 sm:flex-none min-h-[44px] gap-2">
                <QrCode className="size-4" /> QR Code
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {published
              ? 'Mande no WhatsApp ou coloque no Instagram. A foto de capa aparece na prévia do link.'
              : 'O link só funciona depois de publicar. Use "Ver prévia" para conferir antes.'}{' '}
            O endereço muda junto com o link de orçamento, em <Link href="/dashboard/settings" className="text-primary underline">Configurações</Link>.
          </p>
        </CardContent>
      </Card>

      {/* Resultados */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Visitas (7 dias)', value: stats.week },
            { label: 'Visitas (30 dias)', value: stats.month },
            { label: 'Pedidos (30 dias)', value: stats.leads },
          ].map((s) => (
            <Card key={s.label} className="bg-white border-border">
              <CardContent className="p-3 sm:p-4">
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Montar com IA */}
      <Card className="border-0 bg-gradient-to-br from-primary to-primary-dark text-white overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Sparkles className="size-6" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">Montar com IA</p>
            <p className="text-sm text-white/80">Envie as fotos na galeria, responda 3 perguntas e a IA escreve os textos, as legendas e escolhe a capa.</p>
          </div>
          <Button type="button" onClick={openAi} disabled={busy || aiBusy} className="min-h-[44px] gap-2 bg-white text-primary hover:bg-white/90">
            <Sparkles className="size-4" /> Montar com IA
          </Button>
        </CardContent>
      </Card>

      {/* Estilo */}
      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg">Estilo</CardTitle>
          <CardDescription>A cor vem da cor do seu buffet, definida em Configurações.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 sm:gap-3">
          {(Object.keys(SHOWCASE_THEMES) as ShowcaseTheme[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update((c) => ({ ...c, theme: key }))}
              className={cn(
                'rounded-xl border-2 p-2 text-left transition',
                content.theme === key ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-slate-300'
              )}
              aria-pressed={content.theme === key}
            >
              <div className={cn('h-16 rounded-lg border border-black/5 p-2 flex flex-col justify-between', THEME_SWATCH[key])}>
                <span className="text-sm text-slate-800 leading-none">Aa</span>
                <span className="h-2.5 w-10 rounded-full" style={{ backgroundColor: safeColor(tenant.primary_color) }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{SHOWCASE_THEMES[key].label}</p>
              <p className="hidden sm:block text-xs text-slate-500">{SHOWCASE_THEMES[key].hint}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Capa */}
      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg">Capa</CardTitle>
          <CardDescription>A primeira coisa que o cliente vê. Use sua foto mais bonita, de preferência deitada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageField
            url={content.hero.image}
            wide
            busy={uploading === 'hero'}
            disabled={busy}
            onPick={(f) => pickOne('hero', f, (url) => update((c) => ({ ...c, hero: { ...c.hero, image: url } })), 2000)}
            onRemove={() => update((c) => ({ ...c, hero: { ...c.hero, image: null } }))}
          />
          <HeroSlides
            slides={content.hero.slides}
            uploading={uploading}
            disabled={busy || !content.hero.image}
            onAdd={addHeroSlides}
            onChange={(slides) => update((c) => ({ ...c, hero: { ...c.hero, slides } }))}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="hero-title">Título</Label>
              <AiImprove field="hero.title" text={content.hero.title} onDone={(t) => update((c) => ({ ...c, hero: { ...c.hero, title: t } }))} />
            </div>
            <Input id="hero-title" value={content.hero.title} maxLength={L.title} placeholder={tenant.name}
              onChange={(e) => update((c) => ({ ...c, hero: { ...c.hero, title: e.target.value } }))} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="hero-sub">Frase de apresentação</Label>
              <AiImprove field="hero.subtitle" text={content.hero.subtitle} onDone={(t) => update((c) => ({ ...c, hero: { ...c.hero, subtitle: t } }))} />
            </div>
            <textarea id="hero-sub" rows={2} value={content.hero.subtitle} maxLength={L.subtitle} className={textareaCls}
              onChange={(e) => update((c) => ({ ...c, hero: { ...c.hero, subtitle: e.target.value } }))} />
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <h2 className="text-lg font-bold text-slate-900">Seções</h2>
        <p className="text-sm text-slate-500">Ligue, desligue e mude a ordem. Seções sem conteúdo não aparecem na página.</p>
      </div>

      {content.sections.map((s, i) => (
        <Card key={s.key} className={cn('bg-white border-border transition', !s.enabled && 'opacity-60')}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg">{SECTION_META[s.key].label}</CardTitle>
                <CardDescription>{SECTION_META[s.key].hint}</CardDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => moveSection(i, -1)} disabled={i === 0} aria-label="Subir seção" className="size-10">
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => moveSection(i, 1)} disabled={i === content.sections.length - 1} aria-label="Descer seção" className="size-10">
                <ArrowDown className="size-4" />
              </Button>
              <Toggle checked={s.enabled} onChange={(v) => setSection(s.key, { enabled: v })} label={`Mostrar ${SECTION_META[s.key].label}`} />
            </div>
          </CardHeader>
          {s.enabled && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`title-${s.key}`}>Título da seção</Label>
                <Input id={`title-${s.key}`} value={s.title} maxLength={L.title} placeholder={SECTION_META[s.key].defaultTitle}
                  onChange={(e) => setSection(s.key, { title: e.target.value })} className="h-11 rounded-xl" />
              </div>

              {s.key === 'about' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="about-text">Texto</Label>
                      <AiImprove field="about.text" text={content.about.text} context={content.hero.subtitle}
                        onDone={(t) => update((c) => ({ ...c, about: { ...c.about, text: t } }))} />
                    </div>
                    <textarea id="about-text" rows={6} value={content.about.text} maxLength={L.text} className={textareaCls}
                      placeholder="Conte desde quando o buffet existe, o que faz vocês especiais, quantos eventos já realizaram..."
                      onChange={(e) => update((c) => ({ ...c, about: { ...c.about, text: e.target.value } }))} />
                  </div>
                  <ImageField
                    url={content.about.image}
                    busy={uploading === 'about'}
                    disabled={busy}
                    onPick={(f) => pickOne('about', f, (url) => update((c) => ({ ...c, about: { ...c.about, image: url } })))}
                    onRemove={() => update((c) => ({ ...c, about: { ...c.about, image: null } }))}
                  />
                </>
              )}

              {s.key === 'gallery' && (
                <div className="space-y-2">
                  <Label>Formato da galeria</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(GALLERY_LAYOUTS) as GalleryLayout[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => update((c) => ({ ...c, galleryLayout: k }))}
                        className={cn(
                          'rounded-xl border p-2.5 text-left transition',
                          content.galleryLayout === k ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-slate-300'
                        )}
                      >
                        <LayoutIcon layout={k} />
                        <span className="mt-2 block text-sm font-semibold text-slate-900">{GALLERY_LAYOUTS[k].label}</span>
                        <span className="block text-[11px] leading-snug text-slate-500">{GALLERY_LAYOUTS[k].hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {s.key === 'gallery' && (
                <GalleryEditor
                  content={content}
                  update={update}
                  uploading={uploading}
                  disabled={busy}
                  onAdd={addGallery}
                />
              )}

              {s.key === 'events' && (
                <div className="space-y-3">
                  {content.events.map((ev, ei) => (
                    <div key={ei} className="rounded-xl border border-border p-3 flex gap-3">
                      <ImageField
                        url={ev.image}
                        small
                        busy={uploading === `event:${ei}`}
                        disabled={busy}
                        onPick={(f) => pickOne(`event:${ei}`, f, (url) => update((c) => ({ ...c, events: c.events.map((x, k) => (k === ei ? { ...x, image: url } : x)) })))}
                        onRemove={() => update((c) => ({ ...c, events: c.events.map((x, k) => (k === ei ? { ...x, image: null } : x)) }))}
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex gap-2">
                          <Input value={ev.title} maxLength={L.title} placeholder="Ex.: Casamento" aria-label="Tipo de evento"
                            onChange={(e) => update((c) => ({ ...c, events: c.events.map((x, k) => (k === ei ? { ...x, title: e.target.value } : x)) }))}
                            className="h-11 rounded-xl" />
                          <Button type="button" variant="ghost" size="icon" aria-label="Remover tipo de evento" className="size-11 shrink-0 text-destructive"
                            onClick={() => update((c) => ({ ...c, events: c.events.filter((_, k) => k !== ei) }))}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <textarea rows={2} value={ev.text} maxLength={L.shortText} placeholder="Descrição curta (opcional)" aria-label="Descrição"
                          onChange={(e) => update((c) => ({ ...c, events: c.events.map((x, k) => (k === ei ? { ...x, text: e.target.value } : x)) }))}
                          className={cn(textareaCls, 'text-sm py-2')} />
                        {ev.title && (
                          <AiImprove field="event.text" text={ev.text} context={`Tipo de evento: ${ev.title}`}
                            onDone={(t) => update((c) => ({ ...c, events: c.events.map((x, k) => (k === ei ? { ...x, text: t } : x)) }))} />
                        )}
                      </div>
                    </div>
                  ))}
                  {content.events.length < L.events && (
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TYPES.filter((t) => t !== 'Outros' && !content.events.some((e) => e.title === t)).map((t) => (
                        <button key={t} type="button"
                          onClick={() => update((c) => ({ ...c, events: [...c.events, { title: t, text: '', image: null }] }))}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-primary hover:text-primary">
                          <Plus className="size-3.5" /> {t}
                        </button>
                      ))}
                      <button type="button"
                        onClick={() => update((c) => ({ ...c, events: [...c.events, { title: '', text: '', image: null }] }))}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-primary hover:text-primary">
                        <Plus className="size-3.5" /> Outro
                      </button>
                    </div>
                  )}
                </div>
              )}

              {s.key === 'menus' && (
                menus.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Você ainda não tem cardápios ativos. Cadastre ou use um pronto em <Link href="/dashboard/menu" className="text-primary underline">Cardápios</Link>.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">
                      Marque quais mostrar. Sem nenhum marcado, todos os cardápios ativos aparecem.{' '}
                      <Link href="/dashboard/menu" className="text-primary underline">Gerenciar cardápios</Link>
                    </p>
                    {menus.map((m) => {
                      const on = content.menuIds.includes(m.id);
                      return (
                        <label key={m.id} className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer', on ? 'border-primary bg-primary/5' : 'border-border')}>
                          <input type="checkbox" checked={on} className="size-5 accent-[var(--primary)]"
                            onChange={() => update((c) => ({ ...c, menuIds: on ? c.menuIds.filter((x) => x !== m.id) : [...c.menuIds, m.id] }))} />
                          {m.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.image} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span className="size-12 shrink-0 rounded-lg bg-slate-100" />
                          )}
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900 truncate">{m.name}</span>
                            <span className="block text-xs text-slate-500">{m.items.length} itens</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )
              )}

              {s.key === 'testimonials' && (
                <div className="space-y-3">
                  {content.testimonials.map((d, di) => {
                    const set = (patch: Partial<typeof d>) =>
                      update((c) => ({ ...c, testimonials: c.testimonials.map((x, k) => (k === di ? { ...x, ...patch } : x)) }));
                    return (
                      <div key={di} className="rounded-xl border border-border p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input value={d.name} maxLength={L.title} placeholder="Nome do cliente" aria-label="Nome do cliente"
                            onChange={(e) => set({ name: e.target.value })} className="h-11 rounded-xl" />
                          <Input value={d.event} maxLength={L.title} placeholder="Evento (opcional)" aria-label="Evento"
                            onChange={(e) => set({ event: e.target.value })} className="h-11 rounded-xl" />
                          <Button type="button" variant="ghost" size="icon" aria-label="Remover depoimento" className="size-11 shrink-0 text-destructive"
                            onClick={() => update((c) => ({ ...c, testimonials: c.testimonials.filter((_, k) => k !== di) }))}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <textarea rows={3} value={d.text} maxLength={L.shortText} placeholder="O que o cliente disse" aria-label="Depoimento"
                          onChange={(e) => set({ text: e.target.value })} className={cn(textareaCls, 'text-sm py-2')} />
                      </div>
                    );
                  })}
                  {content.testimonials.length < L.testimonials && (
                    <Button type="button" variant="outline" className="gap-2 min-h-[44px]"
                      onClick={() => update((c) => ({ ...c, testimonials: [...c.testimonials, { name: '', event: '', text: '' }] }))}>
                      <Plus className="size-4" /> Adicionar depoimento
                    </Button>
                  )}
                  <p className="text-xs text-slate-500">Depoimentos sem nome ou sem texto não aparecem.</p>
                </div>
              )}

              {s.key === 'contact' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="contact-text">Texto</Label>
                      <AiImprove field="contact.text" text={content.contact.text}
                        onDone={(t) => update((c) => ({ ...c, contact: { ...c.contact, text: t } }))} />
                    </div>
                    <textarea id="contact-text" rows={2} value={content.contact.text} maxLength={L.shortText} className={textareaCls}
                      onChange={(e) => update((c) => ({ ...c, contact: { ...c.contact, text: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-ig">Instagram</Label>
                    <div className="flex items-center rounded-xl border border-border bg-white h-12 overflow-hidden focus-within:border-primary">
                      <span className="pl-3 text-slate-400">@</span>
                      <input id="contact-ig" value={content.contact.instagram} maxLength={60} placeholder="seubuffet"
                        onChange={(e) => update((c) => ({ ...c, contact: { ...c.contact, instagram: e.target.value } }))}
                        onBlur={() => update((c) => ({ ...c, contact: { ...c.contact, instagram: normalizeInstagram(c.contact.instagram) } }))}
                        className="flex-1 min-w-0 h-full px-1 pr-3 bg-transparent outline-none text-base" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {tenant.phone
                      ? <>Botão de WhatsApp: <strong>{tenant.phone}</strong>.</>
                      : <>Cadastre o WhatsApp em <Link href="/dashboard/settings" className="text-primary underline">Configurações</Link> para mostrar o botão.</>}
                    {' '}O botão &quot;Pedir orçamento&quot; abre o seu formulário e o pedido cai em Leads.
                  </p>
                </>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Ações: fixas no rodapé no celular, acima da barra de navegação */}
      <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 px-3 md:static md:px-0">
        <div className="mx-auto max-w-3xl flex gap-2 rounded-2xl border border-border bg-white/95 p-2 shadow-lg backdrop-blur md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <Button type="button" variant="outline" onClick={() => setPreview(true)} className="flex-1 sm:flex-none min-h-[48px] gap-2">
            <Eye className="size-4" /> Ver prévia
          </Button>
          <Button type="button" variant="outline" onClick={() => save()} disabled={saving || busy || !dirty} className="flex-1 sm:flex-none min-h-[48px] gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {dirty ? 'Salvar' : 'Salvo'}
          </Button>
          {published ? (
            <Button type="button" variant="ghost" onClick={() => setConfirmUnpublish(true)} disabled={saving || busy} className="flex-1 sm:flex-none min-h-[48px] gap-2 text-slate-600">
              <EyeOff className="size-4" /> Despublicar
            </Button>
          ) : (
            <Button type="button" onClick={() => save(true)} disabled={saving || busy} className="flex-1 sm:flex-none min-h-[48px] gap-2">
              <Check className="size-4" /> Publicar
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        variant="warning"
        title="Despublicar a vitrine?"
        description="O link deixa de funcionar até você publicar de novo. Nada do que você montou é apagado."
        confirmText="Despublicar"
        loading={saving}
        onConfirm={async () => {
          await save(false);
          setConfirmUnpublish(false);
        }}
      />

      <Dialog open={aiOpen} onOpenChange={(o) => !aiBusy && setAiOpen(o)}>
        <DialogContent className="max-w-lg !rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Montar com IA</DialogTitle>
            <DialogDescription>
              {content.gallery.length || content.hero.image
                ? `A IA vai olhar suas fotos (até 12) e escrever os textos.`
                : 'Dica: adicione fotos na galeria antes. Com fotos, a IA escreve legendas e escolhe a capa.'}{' '}
              Os textos atuais serão substituídos; você pode desfazer logo depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-kind">Que tipo de buffet e de eventos vocês fazem?</Label>
              <Input id="ai-kind" value={aiAnswers.kind} maxLength={200} placeholder="Ex.: casamentos e 15 anos, buffet completo"
                onChange={(e) => setAiAnswers((a) => ({ ...a, kind: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-high">Qual o principal diferencial?</Label>
              <Input id="ai-high" value={aiAnswers.highlight} maxLength={300} placeholder="Ex.: comida caseira feita na hora, equipe própria"
                onChange={(e) => setAiAnswers((a) => ({ ...a, highlight: e.target.value }))} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-extra">Mais alguma coisa? (opcional)</Label>
              <textarea id="ai-extra" rows={2} value={aiAnswers.extra} maxLength={500} className={cn(textareaCls, 'text-sm py-2')}
                placeholder="Ex.: atendemos até 300 pessoas, temos espaço próprio"
                onChange={(e) => setAiAnswers((a) => ({ ...a, extra: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAiOpen(false)} disabled={aiBusy}>Cancelar</Button>
            <Button type="button" onClick={runAi} disabled={aiBusy} className="gap-2">
              {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {aiBusy ? 'A IA está montando...' : 'Montar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShowcaseQrDialog open={qrOpen} onOpenChange={setQrOpen} url={publicUrl} name={tenant.name} />

      {preview && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-white">
          <ShowcaseView
            preview
            data={{
              brand: { name: tenant.name, slug: tenant.slug, logoUrl: tenant.logo_url, color: safeColor(tenant.primary_color) },
              phone: tenant.phone,
              city: tenant.city,
              state: tenant.state,
              content: normalizeShowcase(content, tenant.name),
              menus: content.sections.some((x) => x.key === 'menus' && x.enabled) ? pickMenus(menus, content.menuIds) : [],
            }}
          />
          <button
            type="button"
            onClick={() => setPreview(false)}
            className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[105] inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <X className="size-4" /> Fechar prévia
          </button>
        </div>
      )}
    </div>
  );
}

/** Botão "Melhorar com IA" (ou "Escrever com IA" se o campo estiver vazio). */
function AiImprove({ field, text, context, onDone }: { field: string; text: string; context?: string; onDone: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await authFetch('/api/showcase/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'improve', field, text, context }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Erro ao falar com a IA.');
      onDone(out.text);
      toast.success('Texto atualizado pela IA.', { action: { label: 'Desfazer', onClick: () => onDone(text) } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={run} disabled={busy}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {busy ? 'Escrevendo...' : text.trim() ? 'Melhorar com IA' : 'Escrever com IA'}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-slate-300')}
    >
      <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function ImageField({
  url,
  busy,
  disabled,
  wide,
  small,
  onPick,
  onRemove,
}: {
  url: string | null;
  busy: boolean;
  disabled: boolean;
  wide?: boolean;
  small?: boolean;
  onPick: (f: File | undefined) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const box = small ? 'size-24 shrink-0' : wide ? 'w-full aspect-[16/9]' : 'w-full max-w-xs aspect-[4/5]';
  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50', box)}>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ''; }} />
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="size-full object-cover" />
          <div className="absolute right-1.5 top-1.5 flex gap-1.5">
            <button type="button" onClick={() => ref.current?.click()} disabled={disabled} aria-label="Trocar foto"
              className="size-9 rounded-full bg-white/90 text-slate-700 shadow flex items-center justify-center">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            </button>
            <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remover foto"
              className="size-9 rounded-full bg-white/90 text-destructive shadow flex items-center justify-center">
              <Trash2 className="size-4" />
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={disabled}
          className="size-full flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-primary">
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className={small ? 'size-6' : 'size-8'} />}
          {!small && <span className="text-sm font-medium">{busy ? 'Enviando...' : 'Escolher foto'}</span>}
        </button>
      )}
    </div>
  );
}

function LayoutIcon({ layout }: { layout: GalleryLayout }) {
  const b = 'rounded-[3px] bg-slate-300';
  if (layout === 'carrossel')
    return (
      <span className="flex h-10 items-center gap-1">
        <span className={cn(b, 'h-6 w-2 opacity-60')} />
        <span className={cn(b, 'h-10 flex-1 bg-primary/50')} />
        <span className={cn(b, 'h-6 w-2 opacity-60')} />
      </span>
    );
  if (layout === 'grade')
    return (
      <span className="grid h-10 grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => <span key={i} className={b} />)}
      </span>
    );
  return (
    <span className="grid h-10 grid-cols-3 gap-1">
      <span className="flex flex-col gap-1"><span className={cn(b, 'h-6')} /><span className={cn(b, 'flex-1')} /></span>
      <span className="flex flex-col gap-1"><span className={cn(b, 'h-3')} /><span className={cn(b, 'flex-1')} /></span>
      <span className="flex flex-col gap-1"><span className={cn(b, 'flex-1')} /><span className={cn(b, 'h-4')} /></span>
    </span>
  );
}

function HeroSlides({
  slides,
  uploading,
  disabled,
  onAdd,
  onChange,
}: {
  slides: string[];
  uploading: string | null;
  disabled: boolean;
  onAdd: (files: FileList | null) => void;
  onChange: (slides: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const progress = uploading?.startsWith('slides:') ? uploading.slice(7) : null;
  return (
    <div className="space-y-2">
      <Label>Mais fotos na capa (carrossel)</Label>
      <p className="text-xs text-slate-500">
        Com 2 ou mais fotos, a capa vira um carrossel que troca sozinho a cada 5 segundos. {disabled && slides.length === 0 && 'Escolha primeiro a foto principal.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {slides.map((u, i) => (
          <div key={u} className="relative size-20 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="size-full object-cover" />
            <button type="button" aria-label="Remover foto da capa" onClick={() => onChange(slides.filter((_, k) => k !== i))}
              className="absolute right-1 top-1 size-7 rounded-full bg-white/90 text-destructive shadow flex items-center justify-center">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {slides.length < L.heroSlides && (
          <button type="button" onClick={() => ref.current?.click()} disabled={disabled}
            className="size-20 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-xs text-slate-500 hover:text-primary disabled:opacity-50">
            {progress ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
            {progress ? progress.replace('/', ' de ') : 'Adicionar'}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { onAdd(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

function GalleryEditor({
  content,
  update,
  uploading,
  disabled,
  onAdd,
}: {
  content: ShowcaseContent;
  update: (fn: (c: ShowcaseContent) => ShowcaseContent) => void;
  uploading: string | null;
  disabled: boolean;
  onAdd: (files: FileList | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const progress = uploading?.startsWith('gallery:') ? uploading.slice(8) : null;
  const move = (i: number, d: -1 | 1) =>
    update((c) => {
      const g = [...c.gallery];
      const j = i + d;
      if (j < 0 || j >= g.length) return c;
      [g[i], g[j]] = [g[j], g[i]];
      return { ...c, gallery: g };
    });

  return (
    <div className="space-y-3">
      {content.gallery.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {content.gallery.map((g, i) => (
            <div key={g.url} className="rounded-xl border border-border overflow-hidden bg-white">
              <div className="relative aspect-square bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">1ª</span>
                )}
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para trás"
                      className="size-8 rounded-full bg-white/90 text-slate-700 shadow flex items-center justify-center disabled:opacity-40">
                      <ArrowUp className="size-4 -rotate-90" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === content.gallery.length - 1} aria-label="Mover para frente"
                      className="size-8 rounded-full bg-white/90 text-slate-700 shadow flex items-center justify-center disabled:opacity-40">
                      <ArrowDown className="size-4 -rotate-90" />
                    </button>
                  </div>
                  <button type="button" aria-label="Remover foto"
                    onClick={() => update((c) => ({ ...c, gallery: c.gallery.filter((_, k) => k !== i) }))}
                    className="size-8 rounded-full bg-white/90 text-destructive shadow flex items-center justify-center">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <input value={g.caption} maxLength={L.caption} placeholder="Legenda (opcional)" aria-label={`Legenda da foto ${i + 1}`}
                onChange={(e) => update((c) => ({ ...c, gallery: c.gallery.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)) }))}
                className="w-full px-2.5 py-2 text-sm outline-none border-t border-border" />
            </div>
          ))}
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { onAdd(e.target.files); e.target.value = ''; }} />
      {content.gallery.length < L.gallery && (
        <Button type="button" variant="outline" onClick={() => ref.current?.click()} disabled={disabled} className="w-full min-h-[52px] gap-2 border-dashed">
          {progress ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {progress ? `Enviando ${progress.replace('/', ' de ')}...` : 'Adicionar fotos'}
        </Button>
      )}
      <p className="text-xs text-slate-500">
        {content.gallery.length}/{L.gallery} fotos. Pode escolher várias de uma vez; elas são comprimidas antes de enviar.
      </p>
    </div>
  );
}
