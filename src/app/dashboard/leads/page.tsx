'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Calendar,
  Copy,
  Inbox,
  Link2,
  MessageCircle,
  PartyPopper,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LEAD_STATUS, type Lead, type LeadStatus, whatsappUrl } from '@/lib/leads';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Filter = LeadStatus | 'todos';
const FILTERS: Filter[] = ['novo', 'em_contato', 'convertido', 'perdido', 'todos'];

const dateBR = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function receivedAt(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function LeadsPage() {
  const { tenant } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('novo');
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar leads: ' + error.message);
    else setLeads((data as Lead[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    const id = setInterval(fetchLeads, 30000);
    const onFocus = () => fetchLeads();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchLeads]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { novo: 0, em_contato: 0, convertido: 0, perdido: 0, todos: leads.length };
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);

  const visible = filter === 'todos' ? leads : leads.filter((l) => l.status === filter);

  const publicUrl = tenant?.slug && typeof window !== 'undefined' ? `${window.location.origin}/orcamento/${tenant.slug}` : '';
  const instagramUrl = publicUrl ? `${publicUrl}?origem=instagram` : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(instagramUrl);
      toast.success('Link copiado! Cole na bio do Instagram.');
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie o link manualmente.');
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Orçamento - ${tenant?.name ?? ''}`, url: instagramUrl });
      } catch {
        /* usuário cancelou */
      }
    } else {
      copyLink();
    }
  }

  async function updateLead(lead: Lead, patch: Partial<Lead>, okMsg?: string) {
    setBusyId(lead.id);
    const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, ...patch } : l)));
    if (okMsg) toast.success(okMsg);
  }

  function openWhatsapp(lead: Lead) {
    const first = lead.name.split(' ')[0];
    const url = whatsappUrl(lead.phone, `Olá, ${first}! Aqui é do ${tenant?.name ?? 'buffet'}. Recebemos seu pedido de orçamento 😊`);
    if (!url) return toast.error('Telefone inválido.');
    window.open(url, '_blank', 'noopener,noreferrer');
    if (lead.status === 'novo') updateLead(lead, { status: 'em_contato' });
  }

  async function convert(lead: Lead) {
    setBusyId(lead.id);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ name: lead.name, whatsapp: lead.phone, phone: '', email: '', document: '' }])
        .select('id')
        .single();
      if (error) throw error;
      const patch = { status: 'convertido' as const, client_id: data.id };
      const { error: upErr } = await supabase.from('leads').update(patch).eq('id', lead.id);
      if (upErr) throw upErr;
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, ...patch } : l)));
      toast.success(`${lead.name} agora é um cliente!`, {
        action: { label: 'Criar evento', onClick: () => (window.location.href = '/dashboard/events/new') },
      });
    } catch (e) {
      toast.error('Erro ao converter: ' + (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    const { error } = await supabase.from('leads').delete().eq('id', toDelete.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    setLeads((ls) => ls.filter((l) => l.id !== toDelete.id));
    setToDelete(null);
    toast.success('Lead excluído.');
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <header>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Leads</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-base">Pedidos de orçamento recebidos pelo seu link (Instagram, WhatsApp, site).</p>
      </header>

      <section className="rounded-2xl border border-border bg-white shadow-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-semibold">
          <Link2 className="size-5 text-primary shrink-0" /> Seu link de orçamento
        </div>
        <p className="text-sm text-slate-500">Coloque na bio do Instagram, nos Stories (adesivo de link) ou na resposta automática do Direct.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={instagramUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 h-11 rounded-xl border border-input bg-slate-50 px-3 text-sm text-slate-700 font-mono"
            aria-label="Link de orçamento"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={copyLink} disabled={!instagramUrl} className="flex-1 sm:flex-none gap-2">
              <Copy className="size-4" /> Copiar
            </Button>
            <Button type="button" variant="outline" onClick={shareLink} disabled={!instagramUrl} className="flex-1 sm:flex-none gap-2">
              <Share2 className="size-4" /> Compartilhar
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Quer mudar o endereço? <Link href="/dashboard/settings" className="text-primary font-semibold">Configurações</Link>
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 h-10 px-4 rounded-full border text-sm font-semibold transition-colors',
              filter === f ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-border hover:bg-slate-50'
            )}
          >
            {f === 'todos' ? 'Todos' : LEAD_STATUS[f].label} <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 rounded-2xl border border-border bg-white text-slate-500 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50" />
          <span className="text-sm font-medium">Carregando leads...</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-border bg-white rounded-2xl text-center p-6">
          <Inbox className="size-12 mb-3 text-primary/40" />
          <p className="font-semibold text-slate-900">Nenhum lead {filter === 'todos' ? 'ainda' : `com status "${LEAD_STATUS[filter as LeadStatus].label}"`}.</p>
          <p className="text-sm text-slate-500 mt-1">Divulgue seu link para começar a receber pedidos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {visible.map((lead) => {
            const st = LEAD_STATUS[lead.status];
            const busy = busyId === lead.id;
            return (
              <article key={lead.id} className="rounded-2xl border border-border bg-white shadow-card p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-lg truncate">{lead.name}</p>
                    <p className="text-sm text-slate-500">{lead.phone}</p>
                  </div>
                  <Badge className={cn('rounded-full border shrink-0', st.className)}>{st.label}</Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
                  {lead.event_type && (
                    <span className="inline-flex items-center gap-1.5"><PartyPopper className="size-4 text-primary" />{lead.event_type}</span>
                  )}
                  {lead.event_date && (
                    <span className="inline-flex items-center gap-1.5"><Calendar className="size-4 text-primary" />{dateBR(lead.event_date)}</span>
                  )}
                  {lead.guests && (
                    <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-primary" />{lead.guests} convidados</span>
                  )}
                </div>

                {lead.notes && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 whitespace-pre-line break-words">{lead.notes}</p>}

                <p className="text-xs text-slate-400">
                  Recebido {receivedAt(lead.created_at)} · via {lead.source === 'link' ? 'link' : lead.source}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openWhatsapp(lead)}
                    className="gap-1.5 bg-[#25D366] hover:bg-[#1EBE5A] text-white"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </Button>
                  {!lead.client_id && lead.status !== 'perdido' && (
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => convert(lead)} className="gap-1.5">
                      <UserPlus className="size-4" /> Virar cliente
                    </Button>
                  )}
                  <select
                    value={lead.status}
                    disabled={busy}
                    onChange={(e) => updateLead(lead, { status: e.target.value as LeadStatus }, 'Status atualizado.')}
                    className="h-10 rounded-lg border border-input bg-white px-2 text-sm text-slate-700"
                    aria-label="Status do lead"
                  >
                    {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>{LEAD_STATUS[s].label}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setToDelete(lead)}
                    className="ml-auto text-slate-400 hover:text-destructive hover:bg-destructive/5"
                    aria-label="Excluir lead"
                    title="Excluir"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && !busyId && setToDelete(null)}
        title={`Excluir o lead "${toDelete?.name ?? ''}"?`}
        description="O pedido será removido permanentemente. Se ele já virou cliente, o cliente continua cadastrado."
        variant="destructive"
        confirmText="Sim, excluir"
        onConfirm={confirmDelete}
        loading={!!busyId}
      />
    </div>
  );
}
