'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Save, Check, UtensilsCrossed, CalendarClock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COLOR_PRESETS, daysLeft, isHexColor, isReadableOnWhiteText, darken } from '@/lib/tenant';
import { resizeToPngBlob } from '@/lib/image-utils';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function SettingsPage() {
  const { tenant, refresh } = useTenant();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', responsible_name: '', phone: '', document: '', city: '', state: '' });
  const [color, setColor] = useState('#2563EB');
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setForm({
      name: tenant.name || '',
      responsible_name: tenant.responsible_name || '',
      phone: tenant.phone || '',
      document: tenant.document || '',
      city: tenant.city || '',
      state: tenant.state || '',
    });
    setColor(tenant.primary_color || '#2563EB');
    setLogo(tenant.logo_url);
  }, [tenant]);

  if (!tenant) return null;

  const colorOk = isHexColor(color) && isReadableOnWhiteText(color);
  const left = daysLeft(tenant.valid_until);

  const uploadLogo = async (file: File) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toast.error('Use uma imagem PNG, JPG ou WEBP.');
    if (file.size > 8 * 1024 * 1024) return toast.error('Imagem muito grande (máx. 8 MB).');
    setUploading(true);
    try {
      const blob = await resizeToPngBlob(file, 512);
      const path = `${tenant.id}/logo-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from('tenant-logos').upload(path, blob, { contentType: 'image/png', upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('tenant-logos').getPublicUrl(path);
      const { error } = await supabase.from('tenants').update({ logo_url: data.publicUrl }).eq('id', tenant.id);
      if (error) throw error;
      setLogo(data.publicUrl);
      await refresh();
      toast.success('Logo atualizada!');
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao enviar a logo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    const { error } = await supabase.from('tenants').update({ logo_url: null }).eq('id', tenant.id);
    if (error) return toast.error(error.message);
    setLogo(null);
    await refresh();
    toast.success('Logo removida.');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error('Informe o nome do buffet.');
    if (!colorOk) return toast.error('Escolha uma cor mais escura (o texto branco precisa ficar legível).');
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        name: form.name.trim(),
        responsible_name: form.responsible_name.trim() || null,
        phone: form.phone.trim() || null,
        document: form.document.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        primary_color: color.toUpperCase(),
      })
      .eq('id', tenant.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success('Configurações salvas!');
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações do buffet</h1>
        <p className="text-sm text-slate-500">Dados, logo e cor do seu sistema e das propostas enviadas aos clientes.</p>
      </div>

      <Card className="bg-white border-border">
        <CardContent className="p-4 sm:p-5 flex items-center gap-3">
          <CalendarClock className="w-5 h-5 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-slate-900">
              {left === null ? 'Acesso sem prazo de validade' : left > 0 ? `Acesso ativo por mais ${left} dia${left === 1 ? '' : 's'}` : 'Acesso vencido'}
            </p>
            {tenant.valid_until && (
              <p className="text-slate-500">Válido até {new Date(tenant.valid_until).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-border">
        <CardHeader>
          <CardTitle className="text-lg">Logo</CardTitle>
          <CardDescription>Aparece no menu, na proposta online e no PDF. PNG, JPG ou WEBP.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-24 h-24 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo do buffet" className="w-full h-full object-contain" />
            ) : (
              <UtensilsCrossed className="w-8 h-8 text-slate-300" />
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="min-h-[44px] gap-2">
              <Upload className="w-4 h-4" /> {uploading ? 'Enviando...' : logo ? 'Trocar logo' : 'Enviar logo'}
            </Button>
            {logo && (
              <Button type="button" variant="outline" onClick={removeLogo} className="min-h-[44px] gap-2 text-destructive border-destructive/30">
                <Trash2 className="w-4 h-4" /> Remover
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={save} className="space-y-6">
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle className="text-lg">Cor do sistema</CardTitle>
            <CardDescription>Define a cor dos botões, menus e da proposta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((p) => (
                <button key={p.hex} type="button" title={p.name} aria-label={p.name} onClick={() => setColor(p.hex)}
                  className={cn('w-11 h-11 rounded-full border-2 flex items-center justify-center transition', color.toUpperCase() === p.hex ? 'border-slate-900' : 'border-transparent')}
                  style={{ backgroundColor: p.hex }}>
                  {color.toUpperCase() === p.hex && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={isHexColor(color) ? color : '#2563EB'} onChange={(e) => setColor(e.target.value.toUpperCase())}
                className="w-11 h-11 rounded-lg border border-border bg-white p-1 cursor-pointer" aria-label="Escolher cor personalizada" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} className="w-32 h-11 font-mono uppercase" />
            </div>
            {!colorOk && <p className="text-sm text-destructive">Cor inválida ou clara demais. Use uma cor mais escura.</p>}
            {colorOk && (
              <div className="rounded-xl border border-border overflow-hidden max-w-sm">
                <div className="px-4 py-3 text-white text-sm font-semibold flex items-center gap-2" style={{ backgroundColor: color }}>
                  {logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" className="w-6 h-6 object-contain bg-white rounded" />}
                  {form.name || 'Seu buffet'}
                </div>
                <div className="p-4 bg-white flex gap-2">
                  <span className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: color }}>Botão</span>
                  <span className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: darken(color) }}>Destaque</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-border">
          <CardHeader><CardTitle className="text-lg">Dados do buffet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do buffet *</Label>
              <Input id="name" value={form.name} onChange={set('name')} required className="h-12 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resp">Responsável</Label>
                <Input id="resp" value={form.responsible_name} onChange={set('responsible_name')} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp / Telefone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc">CNPJ ou CPF</Label>
                <Input id="doc" value={form.document} onChange={set('document')} className="h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={form.city} onChange={set('city')} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <select id="uf" value={form.state} onChange={set('state')} className="h-12 w-full rounded-xl border border-border bg-white px-2">
                    <option value="">--</option>
                    {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">E-mail de acesso: {tenant.email}</p>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto min-h-[48px] gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </form>
    </div>
  );
}
