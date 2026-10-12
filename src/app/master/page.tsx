'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogOut, Search, ShieldCheck, Check, Ban, X, RefreshCw, CalendarClock, Phone, MapPin, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DURATION_PRESETS, Tenant, addDaysFrom, computeAccess, daysLeft, endOfDayISO } from '@/lib/tenant';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Tab = 'pendente' | 'ativo' | 'suspenso' | 'todos';
type Action = 'approve' | 'renew' | 'suspend' | 'refuse' | 'reactivate' | 'deadline';

const TITLES: Record<Action, string> = {
  approve: 'Aprovar buffet',
  renew: 'Renovar acesso',
  suspend: 'Suspender acesso',
  refuse: 'Recusar cadastro',
  reactivate: 'Reativar buffet',
  deadline: 'Alterar prazo',
};

function badge(t: Tenant) {
  const a = computeAccess(t, false);
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    ativo: { label: 'Ativo', cls: 'bg-green-50 text-green-700 border-green-200' },
    suspenso: { label: 'Suspenso', cls: 'bg-red-50 text-red-700 border-red-200' },
    recusado: { label: 'Recusado', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    expirado: { label: 'Vencido', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  };
  return map[a] ?? map.pendente;
}

export default function MasterPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isMaster, loading: tenantLoading } = useTenant();
  const router = useRouter();
  const [rows, setRows] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pendente');
  const [q, setQ] = useState('');
  const [dlg, setDlg] = useState<{ action: Action; tenant: Tenant } | null>(null);
  const [days, setDays] = useState<number | null>(30);
  const [customDate, setCustomDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || tenantLoading) return;
    if (!user) router.replace('/login');
    else if (!isMaster) router.replace('/dashboard');
  }, [user, isMaster, authLoading, tenantLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Tenant[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (isMaster) load(); }, [isMaster, load]);

  const counts = useMemo(() => ({
    pendente: rows.filter((r) => r.status === 'pendente').length,
    ativo: rows.filter((r) => r.status === 'ativo').length,
    suspenso: rows.filter((r) => r.status === 'suspenso' || r.status === 'recusado').length,
    todos: rows.length,
  }), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'pendente' && r.status !== 'pendente') return false;
      if (tab === 'ativo' && r.status !== 'ativo') return false;
      if (tab === 'suspenso' && r.status !== 'suspenso' && r.status !== 'recusado') return false;
      if (!term) return true;
      return [r.name, r.responsible_name, r.email, r.city, r.phone].some((v) => (v || '').toLowerCase().includes(term));
    });
  }, [rows, tab, q]);

  const open = (action: Action, tenant: Tenant) => {
    setDlg({ action, tenant });
    setDays(action === 'approve' || action === 'renew' ? 30 : null);
    setCustomDate('');
    setReason('');
  };

  const confirm = async () => {
    if (!dlg) return;
    const { action, tenant } = dlg;
    let patch: Partial<Tenant> = {};
    const customISO = customDate ? endOfDayISO(customDate) : null;

    if (action === 'approve' || action === 'reactivate' || action === 'deadline') {
      let valid: string | null;
      if (customISO) valid = customISO;
      else if (days === null) valid = null;
      else valid = addDaysFrom(null, days);
      if (customISO && new Date(customISO) <= new Date()) return toast.error('A data deve ser futura.');
      patch = { status: 'ativo', valid_until: valid, status_reason: null };
      if (action === 'deadline') patch = { valid_until: valid };
    } else if (action === 'renew') {
      if (customISO) {
        if (new Date(customISO) <= new Date()) return toast.error('A data deve ser futura.');
        patch = { status: 'ativo', valid_until: customISO, status_reason: null };
      } else if (days === null) {
        patch = { status: 'ativo', valid_until: null, status_reason: null };
      } else {
        patch = { status: 'ativo', valid_until: addDaysFrom(tenant.valid_until, days), status_reason: null };
      }
    } else if (action === 'suspend') {
      patch = { status: 'suspenso', status_reason: reason.trim() || null };
    } else if (action === 'refuse') {
      patch = { status: 'recusado', status_reason: reason.trim() || null };
    }

    setSaving(true);
    const { error } = await supabase.from('tenants').update(patch).eq('id', tenant.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Atualizado!');
    setDlg(null);
    load();
  };

  if (authLoading || tenantLoading || !isMaster) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const needsDuration = dlg && ['approve', 'renew', 'reactivate', 'deadline'].includes(dlg.action);
  const needsReason = dlg && ['suspend', 'refuse'].includes(dlg.action);

  return (
    <div className="min-h-screen bg-background text-slate-900">
      <header className="bg-primary text-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg leading-tight truncate">Painel Master</h1>
              <p className="text-xs text-white/80 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={load} className="text-white hover:bg-white/10 h-11 w-11" aria-label="Atualizar"><RefreshCw className="w-5 h-5" /></Button>
            <Button variant="ghost" onClick={() => signOut()} className="text-white hover:bg-white/10 h-11 gap-2"><LogOut className="w-5 h-5" /><span className="hidden sm:inline">Sair</span></Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([['pendente', 'Pendentes'], ['ativo', 'Ativos'], ['suspenso', 'Suspensos/Recusados'], ['todos', 'Todos']] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn('text-left rounded-xl border p-3 sm:p-4 bg-white transition min-h-[72px]', tab === k ? 'border-primary ring-2 ring-primary/20' : 'border-border')}>
              <p className="text-2xl font-bold">{counts[k]}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, responsável, e-mail ou cidade" className="pl-10 h-12 rounded-xl bg-white" />
        </div>

        {loading ? (
          <p className="text-center text-slate-500 py-10">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-xl border border-border text-slate-500">Nenhum buffet nesta lista.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((t) => {
              const b = badge(t);
              const left = daysLeft(t.valid_until);
              return (
                <div key={t.id} className="bg-white rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {t.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.logo_url} alt="" className="w-12 h-12 rounded-lg object-contain border border-border shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><UtensilsCrossed className="w-5 h-5 text-slate-400" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 leading-tight break-words">{t.name}</h3>
                        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full border shrink-0', b.cls)}>{b.label}</span>
                      </div>
                      <p className="text-sm text-slate-600 break-words">{t.responsible_name}</p>
                      <p className="text-xs text-slate-500 break-all">{t.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {t.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.phone}</span>}
                    {(t.city || t.state) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[t.city, t.state].filter(Boolean).join('/')}</span>}
                    <span>Cadastro: {new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {t.status === 'ativo' && (
                    <p className="text-sm flex items-center gap-1.5 text-slate-700">
                      <CalendarClock className="w-4 h-4 text-primary" />
                      {t.valid_until
                        ? `Até ${new Date(t.valid_until).toLocaleDateString('pt-BR')} (${left !== null && left > 0 ? `${left} dia${left === 1 ? '' : 's'}` : 'vencido'})`
                        : 'Sem prazo de validade'}
                    </p>
                  )}
                  {t.status_reason && <p className="text-xs text-slate-500">Motivo: {t.status_reason}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {t.status === 'pendente' && (<>
                      <Button onClick={() => open('approve', t)} className="min-h-[44px] gap-1.5"><Check className="w-4 h-4" />Aprovar</Button>
                      <Button variant="outline" onClick={() => open('refuse', t)} className="min-h-[44px] gap-1.5 text-destructive border-destructive/30"><X className="w-4 h-4" />Recusar</Button>
                    </>)}
                    {t.status === 'ativo' && (<>
                      <Button onClick={() => open('renew', t)} className="min-h-[44px]">Renovar</Button>
                      <Button variant="outline" onClick={() => open('deadline', t)} className="min-h-[44px]">Alterar prazo</Button>
                      <Button variant="outline" onClick={() => open('suspend', t)} className="min-h-[44px] gap-1.5 text-destructive border-destructive/30"><Ban className="w-4 h-4" />Suspender</Button>
                    </>)}
                    {(t.status === 'suspenso' || t.status === 'recusado') && (
                      <Button onClick={() => open(t.status === 'recusado' ? 'approve' : 'reactivate', t)} className="min-h-[44px]">
                        {t.status === 'recusado' ? 'Aprovar' : 'Reativar'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-w-md">
          {dlg && (<>
            <DialogHeader>
              <DialogTitle>{TITLES[dlg.action]}</DialogTitle>
              <DialogDescription>{dlg.tenant.name}</DialogDescription>
            </DialogHeader>
            {needsDuration && (
              <div className="space-y-3">
                <Label>{dlg.action === 'renew' ? 'Somar período' : 'Por quanto tempo?'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => { setDays(p.days); setCustomDate(''); }}
                      className={cn('min-h-[44px] rounded-lg border text-sm font-medium', !customDate && days === p.days ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cd">Ou escolha uma data final</Label>
                  <Input id="cd" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="h-11" />
                </div>
                {dlg.action === 'renew' && dlg.tenant.valid_until && (
                  <p className="text-xs text-slate-500">Prazo atual: {new Date(dlg.tenant.valid_until).toLocaleDateString('pt-BR')}. O período é somado a partir da data mais distante entre hoje e o prazo atual.</p>
                )}
              </div>
            )}
            {needsReason && (
              <div className="space-y-1.5">
                <Label htmlFor="rs">Motivo (o dono verá esta mensagem)</Label>
                <Input id="rs" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11" placeholder="Opcional" />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDlg(null)} className="min-h-[44px]">Cancelar</Button>
              <Button onClick={confirm} disabled={saving} className="min-h-[44px]">{saving ? 'Salvando...' : 'Confirmar'}</Button>
            </DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
