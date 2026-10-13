'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  BellRing,
  Calendar,
  ChevronRight,
  Copy,
  HandCoins,
  Inbox,
  Link2,
  MessageCircle,
  PartyPopper,
  Share2,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/buffet-rules';
import {
  LEAD_STATUS,
  LEAD_TEMPERATURE,
  OFFER_REACTION,
  followUpState,
  localTodayIso,
  whatsappUrl,
  type Lead,
  type LeadOffer,
  type LeadStatus,
  type LeadTemperature,
} from '@/lib/leads';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Filter = LeadStatus | 'todos';
type TempFilter = LeadTemperature | 'todas';
const FILTERS: Filter[] = ['novo', 'em_contato', 'convertido', 'perdido', 'todos'];

type OfferSummary = Pick<LeadOffer, 'price_per_person' | 'reaction' | 'created_at'>;
type LeadRow = Lead & { offers?: OfferSummary[] };

const lastOfferOf = (l: LeadRow): OfferSummary | null =>
  (l.offers ?? []).reduce<OfferSummary | null>((acc, o) => (!acc || o.created_at > acc.created_at ? o : acc), null);

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

const chipCls = (on: boolean) =>
  cn(
    'shrink-0 h-10 px-4 rounded-full border text-sm font-semibold transition-colors',
    on ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-border hover:bg-slate-50'
  );

export default function LeadsPage() {
  const { tenant } = useTenant();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('novo');
  const [temp, setTemp] = useState<TempFilter>('todas');
  const [onlyFollowUp, setOnlyFollowUp] = useState(false);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*, offers:lead_offers(price_per_person, reaction, created_at)')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar leads: ' + error.message);
    else setLeads((data as LeadRow[]) || []);
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

  const today = localTodayIso();
  const isDue = useCallback(
    (l: Lead) => {
      const s = followUpState(l.next_contact_at, today);
      return (s === 'hoje' || s === 'atrasado') && l.status !== 'convertido' && l.status !== 'perdido';
    },
    [today]
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { novo: 0, em_contato: 0, convertido: 0, perdido: 0, todos: leads.length };
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);
  const dueCount = useMemo(() => leads.filter(isDue).length, [leads, isDue]);

  const visible = onlyFollowUp
    ? leads.filter(isDue).sort((a, b) => (a.next_contact_at! < b.next_contact_at! ? -1 : 1))
    : leads.filter((l) => (filter === 'todos' || l.status === filter) && (temp === 'todas' || l.temperature === temp));

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

  async function openWhatsapp(lead: Lead) {
    const first = lead.name.split(' ')[0];
    const url = whatsappUrl(lead.phone, `Olá, ${first}! Aqui é do ${tenant?.name ?? 'buffet'}. Recebemos seu pedido de orçamento 😊`);
    if (!url) return toast.error('Telefone inválido.');
    window.open(url, '_blank', 'noopener,noreferrer');
    if (lead.status === 'novo') {
      const { error } = await supabase.from('leads').update({ status: 'em_contato' }).eq('id', lead.id);
      if (!error) setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: 'em_contato' } : l)));
    }
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

      {dueCount > 0 && (
        <button
          type="button"
          onClick={() => setOnlyFollowUp((v) => !v)}
          className={cn(
            'w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
            onlyFollowUp ? 'bg-warning text-white border-warning' : 'bg-warning/10 border-warning/30 text-slate-900 hover:bg-warning/15'
          )}
        >
          <BellRing className={cn('size-6 shrink-0', onlyFollowUp ? 'text-white' : 'text-warning')} />
          <span className="flex-1 min-w-0">
            <span className="block font-bold">
              {dueCount} {dueCount === 1 ? 'lead para retornar' : 'leads para retornar'} hoje
            </span>
            <span className={cn('block text-sm', onlyFollowUp ? 'text-white/90' : 'text-slate-500')}>
              {onlyFollowUp ? 'Toque para ver todos os leads' : 'Toque para ver só os retornos (inclui atrasados)'}
            </span>
          </span>
        </button>
      )}

      {!onlyFollowUp && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={chipCls(filter === f)}>
                {f === 'todos' ? 'Todos' : LEAD_STATUS[f].label} <span className="opacity-70">({counts[f]})</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button type="button" onClick={() => setTemp('todas')} className={chipCls(temp === 'todas')}>
              Todas temperaturas
            </button>
            {(Object.keys(LEAD_TEMPERATURE) as LeadTemperature[]).map((t) => (
              <button key={t} type="button" onClick={() => setTemp(t)} className={chipCls(temp === t)}>
                {LEAD_TEMPERATURE[t].emoji} {LEAD_TEMPERATURE[t].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 rounded-2xl border border-border bg-white text-slate-500 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50" />
          <span className="text-sm font-medium">Carregando leads...</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-border bg-white rounded-2xl text-center p-6">
          <Inbox className="size-12 mb-3 text-primary/40" />
          <p className="font-semibold text-slate-900">Nenhum lead encontrado com esses filtros.</p>
          <p className="text-sm text-slate-500 mt-1">Divulgue seu link para receber mais pedidos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {visible.map((lead) => {
            const st = LEAD_STATUS[lead.status];
            const tp = lead.temperature ? LEAD_TEMPERATURE[lead.temperature] : null;
            const last = lastOfferOf(lead);
            const nOffers = lead.offers?.length ?? 0;
            const fu = lead.status === 'convertido' || lead.status === 'perdido' ? null : followUpState(lead.next_contact_at, today);
            return (
              <article key={lead.id} className="rounded-2xl border border-border bg-white shadow-card hover:shadow-card-hover transition-shadow">
                <Link href={`/dashboard/leads/${lead.id}`} className="block p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-lg truncate">{lead.name}</p>
                      <p className="text-sm text-slate-500">{lead.phone}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                      {tp && (
                        <Badge className={cn('rounded-full border', tp.className)}>
                          {tp.emoji} {tp.label}
                        </Badge>
                      )}
                      <Badge className={cn('rounded-full border', st.className)}>{st.label}</Badge>
                    </div>
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

                  {last && (
                    <div className="flex flex-wrap items-center gap-2 text-sm bg-slate-50 rounded-xl px-3 py-2">
                      <HandCoins className="size-4 text-primary shrink-0" />
                      <span className="text-slate-700">
                        {nOffers > 1 ? `${nOffers} ofertas · última ` : 'Oferta '}
                        <strong>{formatBRL(Number(last.price_per_person))}</strong>/pessoa
                      </span>
                      {last.reaction && (
                        <span className={cn('text-xs font-semibold rounded-full border px-2 py-0.5', OFFER_REACTION[last.reaction].className)}>
                          {OFFER_REACTION[last.reaction].emoji} {OFFER_REACTION[last.reaction].label}
                        </span>
                      )}
                    </div>
                  )}

                  {!last && lead.notes && (
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 whitespace-pre-line break-words line-clamp-3">{lead.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-slate-400">
                      Recebido {receivedAt(lead.created_at)} · via {lead.source}
                    </span>
                    {fu && lead.next_contact_at && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold',
                          fu === 'atrasado' ? 'text-destructive' : fu === 'hoje' ? 'text-warning' : 'text-slate-500'
                        )}
                      >
                        <BellRing className="size-3.5" />
                        {fu === 'atrasado' ? 'Retorno atrasado' : fu === 'hoje' ? 'Retornar hoje' : `Retorno ${dateBR(lead.next_contact_at)}`}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-t border-slate-100">
                  <Button type="button" size="sm" onClick={() => openWhatsapp(lead)} className="gap-1.5 bg-[#25D366] hover:bg-[#1EBE5A] text-white">
                    <MessageCircle className="size-4" /> WhatsApp
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1 ml-auto">
                    <Link href={`/dashboard/leads/${lead.id}`}>
                      Trabalhar lead <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
