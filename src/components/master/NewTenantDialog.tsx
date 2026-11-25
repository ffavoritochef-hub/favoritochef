'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api-client';
import { DURATION_PRESETS } from '@/lib/tenant';
import { MIN_PASSWORD } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EMPTY = { buffet_name: '', responsible_name: '', email: '', password: '', phone: '', city: '', state: '' };

/** Master cria uma empresa nova, já aprovada, com o login do dono (administrador). */
export function NewTenantDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [days, setDays] = useState<number | null>(30);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < MIN_PASSWORD) {
      toast.error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/master/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, days }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erro ao criar a empresa.');
      toast.success(
        json.reused
          ? `Empresa criada. O e-mail ${form.email} já existia e agora é o administrador dela.`
          : `Empresa criada! ${form.responsible_name} já pode entrar com ${form.email}.`,
      );
      setForm(EMPTY);
      setDays(30);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>
            Cria um buffet separado, já aprovado, e o login do dono como administrador. Os dados não se misturam
            com nenhuma outra empresa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nt_name">Nome da empresa *</Label>
            <Input id="nt_name" value={form.buffet_name} onChange={set('buffet_name')} required className="h-11" placeholder="Ex.: Lê Bella Festas e Eventos" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt_resp">Responsável (dono) *</Label>
            <Input id="nt_resp" value={form.responsible_name} onChange={set('responsible_name')} required className="h-11" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nt_email">E-mail de acesso *</Label>
              <Input id="nt_email" type="email" value={form.email} onChange={set('email')} required className="h-11" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt_pass">Senha inicial *</Label>
              <Input id="nt_pass" type="text" value={form.password} onChange={set('password')} required minLength={MIN_PASSWORD} className="h-11" autoComplete="new-password" placeholder={`Mín. ${MIN_PASSWORD} caracteres`} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-3 sm:col-span-1">
              <Label htmlFor="nt_phone">Telefone <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input id="nt_phone" type="tel" value={form.phone} onChange={set('phone')} className="h-11" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="nt_city">Cidade <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input id="nt_city" value={form.city} onChange={set('city')} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt_uf">UF</Label>
              <Input id="nt_uf" value={form.state} onChange={set('state')} maxLength={2} className="h-11 uppercase" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Acesso liberado por</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDays(p.days)}
                  className={cn('min-h-[44px] rounded-lg border text-sm font-medium', days === p.days ? 'border-primary bg-primary/10 text-primary' : 'border-border')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">Cancelar</Button>
            <Button type="submit" disabled={saving} className="min-h-[44px]">{saving ? 'Criando...' : 'Criar empresa e login'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
