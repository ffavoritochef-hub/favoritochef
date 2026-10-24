'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  BellRing,
  ChefHat,
  ChevronLeft,
  HandCoins,
  Loader2,
  MessageCircle,
  NotebookPen,
  PartyPopper,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBRL } from '@/lib/buffet-rules';
import {
  EVENT_TYPES,
  LEAD_STATUS,
  LEAD_TEMPERATURE,
  LOST_REASONS,
  NOTE_KIND,
  OFFER_REACTION,
  followUpState,
  localTodayIso,
  offerDelta,
  offerTotal,
  parseMoney,
  whatsappUrl,
  type Lead,
  type LeadNote,
  type LeadOffer,
  type LeadStatus,
  type LeadTemperature,
  type NoteKind,
  type OfferReaction,
} from '@/lib/leads';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Template {
  id: string;
  name: string;
  is_active: boolean | null;
}

const dateBR = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeBR = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localTodayIso(d);
};

const sectionCls = 'rounded-2xl border border-border bg-white shadow-card p-4 sm:p-5 space-y-4';
const selectCls = 'w-full h-11 rounded-xl border border-input bg-white px-3 text-base text-slate-900';
const textareaCls = 'w-full rounded-xl border border-input bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400';

function SectionTitle({ icon: Icon, children, aside }: { icon: React.ElementType; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <Icon className="size-5 text-primary shrink-0" /> {children}
      </h2>
      {aside}
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { tenant } = useTenant();

  const [lead, setLead] = useState<Lead | null>(null);
  const [offers, setOffers] = useState<LeadOffer[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // dados do evento (edição)
  const [eventForm, setEventForm] = useState({ event_date: '', event_type: '', guests: '', menu_template_id: '' });
  // nova oferta
  const [offerForm, setOfferForm] = useState({ price: '', guests: '', menu_template_id: '', description: '' });
  const [showOfferForm, setShowOfferForm] = useState(false);
  // nova anotação
  const [noteForm, setNoteForm] = useState<{ kind: NoteKind; body: string }>({ kind: 'nota', body: '' });

  const [contactForm, setContactForm] = useState<{ name: string; phone: string } | null>(null);
  const [toDelete, setToDelete] = useState<{ type: 'lead' | 'offer' | 'note'; id: string; label: string } | null>(null);

  const templateName = useCallback((tid: string | null) => templates.find((t) => t.id === tid)?.name ?? null, [templates]);

  const fillForms = (l: Lead, last?: LeadOffer) => {
    setEventForm({
      event_date: l.event_date ?? '',
      event_type: l.event_type ?? '',
      guests: l.guests ? String(l.guests) : '',
      menu_template_id: l.menu_template_id ?? '',
    });
    setOfferForm({
      price: last ? String(last.price_per_person).replace('.', ',') : '',
      guests: String(last?.guests ?? l.guests ?? ''),
      menu_template_id: last?.menu_template_id ?? l.menu_template_id ?? '',
      description: '',
    });
  };

  const load = useCallback(async () => {
    const [l, o, n, t] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).maybeSingle(),
      supabase.from('lead_offers').select('*').eq('lead_id', id).order('created_at'),
      supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase.from('menu_templates').select('id, name, is_active').order('name'),
    ]);
    const err = l.error || o.error || n.error;
    if (err) {
      toast.error('Erro ao carregar o lead: ' + err.message);
      setLoading(false);
      return;
    }
    if (!l.data) {
      toast.error('Lead não encontrado.');
      router.replace('/dashboard/leads');
      return;
    }
    const offersData = ((o.data as LeadOffer[]) || []).map((x) => ({ ...x, price_per_person: Number(x.price_per_person) }));
    setLead(l.data as Lead);
    setOffers(offersData);
    setNotes((n.data as LeadNote[]) || []);
    setTemplates((t.data as Template[]) || []);
    fillForms(l.data as Lead, offersData[offersData.length - 1]);
    setShowOfferForm(offersData.length === 0);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const today = localTodayIso();
  const lastOffer = offers[offers.length - 1];
  const activeTemplates = useMemo(
    () => templates.filter((t) => t.is_active !== false || t.id === eventForm.menu_template_id || t.id === offerForm.menu_template_id),
    [templates, eventForm.menu_template_id, offerForm.menu_template_id]
  );

  async function patchLead(patch: Partial<Lead>, okMsg?: string) {
    if (!lead) return false;
    const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setLead({ ...lead, ...patch });
    if (okMsg) toast.success(okMsg);
    return true;
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm) return;
    const name = contactForm.name.trim();
    const phone = contactForm.phone.trim();
    if (name.length < 2) return toast.error('Informe o nome.');
    if (phone.replace(/\D/g, '').length < 10) return toast.error('Telefone inválido (use DDD + número).');
    setSaving(true);
    const ok = await patchLead({ name, phone }, 'Contato atualizado.');
    setSaving(false);
    if (ok) setContactForm(null);
  }

  async function addNote(kind: NoteKind, body: string, silent = false) {
    if (!lead) return;
    const { data, error } = await supabase.from('lead_notes').insert([{ lead_id: lead.id, kind, body }]).select().single();
    if (error) return toast.error('Erro ao salvar anotação: ' + error.message);
    setNotes((ns) => [data as LeadNote, ...ns]);
    if (!silent) toast.success('Anotação salva.');
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    const guests = eventForm.guests ? Number(eventForm.guests) : null;
    if (guests !== null && (!Number.isInteger(guests) || guests < 1)) return toast.error('Número de convidados inválido.');
    setSaving(true);
    await patchLead(
      {
        event_date: eventForm.event_date || null,
        event_type: eventForm.event_type || null,
        guests,
        menu_template_id: eventForm.menu_template_id || null,
      },
      'Dados do evento salvos.'
    );
    setSaving(false);
  }

  async function saveOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    const price = parseMoney(offerForm.price);
    if (!(price > 0) || price >= 100000) return toast.error('Informe o valor por pessoa. Ex: 140,00');
    const guests = offerForm.guests ? Number(offerForm.guests) : null;
    if (guests !== null && (!Number.isInteger(guests) || guests < 1)) return toast.error('Número de convidados inválido.');
    setSaving(true);
    const { data, error } = await supabase
      .from('lead_offers')
      .insert([
        {
          lead_id: lead.id,
          price_per_person: Math.round(price * 100) / 100,
          guests,
          menu_template_id: offerForm.menu_template_id || null,
          description: offerForm.description.trim() || null,
        },
      ])
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error('Erro ao salvar oferta: ' + error.message);
    const offer = { ...(data as LeadOffer), price_per_person: Number(data.price_per_person) };
    setOffers((os) => [...os, offer]);
    setOfferForm((f) => ({ ...f, description: '' }));
    setShowOfferForm(false);
    if (lead.status === 'novo') patchLead({ status: 'em_contato' });
    toast.success(`Oferta ${offers.length + 1} registrada.`, {
      action: { label: 'Enviar no WhatsApp', onClick: () => sendOffer(offer, offers.length + 1) },
    });
  }

  async function setReaction(offer: LeadOffer, reaction: OfferReaction) {
    const next = offer.reaction === reaction ? null : reaction;
    const { error } = await supabase.from('lead_offers').update({ reaction: next }).eq('id', offer.id);
    if (error) return toast.error(error.message);
    setOffers((os) => os.map((o) => (o.id === offer.id ? { ...o, reaction: next } : o)));
  }

  function offerMessage(o: LeadOffer) {
    const first = lead!.name.split(' ')[0];
    const total = offerTotal(o);
    const menu = templateName(o.menu_template_id);
    const lines = [
      `Olá, ${first}! Aqui é do ${tenant?.name ?? 'buffet'} 😊`,
      `Segue nossa proposta${lead!.event_type ? ` para o seu ${lead!.event_type.toLowerCase()}` : ''}${lead!.event_date ? ` em ${dateBR(lead!.event_date)}` : ''}:`,
      '',
      menu ? `🍽️ Cardápio: ${menu}` : null,
      `💰 ${formatBRL(o.price_per_person)} por pessoa`,
      o.guests ? `👥 ${o.guests} convidados${total ? ` — total ${formatBRL(total)}` : ''}` : null,
      o.description ? `\n${o.description}` : null,
      '',
      'Qualquer dúvida estou à disposição!',
    ];
    return lines.filter((x) => x !== null).join('\n');
  }

  function sendOffer(o: LeadOffer, n: number) {
    if (!lead) return;
    const url = whatsappUrl(lead.phone, offerMessage(o));
    if (!url) return toast.error('Telefone inválido.');
    window.open(url, '_blank', 'noopener,noreferrer');
    addNote('whatsapp', `Enviou a oferta ${n} (${formatBRL(o.price_per_person)}/pessoa) pelo WhatsApp.`, true);
  }

  function openWhatsapp() {
    if (!lead) return;
    const url = whatsappUrl(lead.phone, `Olá, ${lead.name.split(' ')[0]}! Aqui é do ${tenant?.name ?? 'buffet'} 😊`);
    if (!url) return toast.error('Telefone inválido.');
    window.open(url, '_blank', 'noopener,noreferrer');
    if (lead.status === 'novo') patchLead({ status: 'em_contato' });
  }

  async function convert() {
    if (!lead) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ name: lead.name, whatsapp: lead.phone, phone: '', email: '', document: '' }])
        .select('id')
        .single();
      if (error) throw error;
      await patchLead({ status: 'convertido', client_id: data.id, next_contact_at: null });
      toast.success(`${lead.name} agora é um cliente!`, {
        action: { label: 'Criar evento', onClick: () => router.push('/dashboard/events/new') },
      });
    } catch (e) {
      toast.error('Erro ao converter: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setSaving(true);
    const table = toDelete.type === 'lead' ? 'leads' : toDelete.type === 'offer' ? 'lead_offers' : 'lead_notes';
    const { error } = await supabase.from(table).delete().eq('id', toDelete.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    if (toDelete.type === 'lead') {
      toast.success('Lead excluído.');
      router.replace('/dashboard/leads');
      return;
    }
    if (toDelete.type === 'offer') setOffers((os) => os.filter((o) => o.id !== toDelete.id));
    else setNotes((ns) => ns.filter((n) => n.id !== toDelete.id));
    setToDelete(null);
  }

  if (loading || !lead) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 gap-3">
        <Loader2 className="size-6 animate-spin text-primary" /> Carregando lead...
      </div>
    );
  }

  const st = LEAD_STATUS[lead.status];
  const fu = followUpState(lead.next_contact_at, today);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-8">
      {/* Cabeçalho */}
      <header className="flex items-start gap-3">
        <Button asChild variant="outline" size="icon" className="size-11 shrink-0 border-slate-200 text-slate-600">
          <Link href="/dashboard/leads" aria-label="Voltar">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{lead.name}</h1>
            <Badge className={cn('rounded-full border', st.className)}>{st.label}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {lead.phone} · recebido em {dateTimeBR(lead.created_at)} via {lead.source}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={openWhatsapp} className="gap-1.5 bg-[#25D366] hover:bg-[#1EBE5A] text-white">
          <MessageCircle className="size-4" /> WhatsApp
        </Button>
        {lead.client_id ? (
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={`/dashboard/clients/${lead.client_id}/edit`}>
              <UserPlus className="size-4" /> Ver cliente
            </Link>
          </Button>
        ) : (
          lead.status !== 'perdido' && (
            <Button type="button" variant="outline" disabled={saving} onClick={convert} className="gap-1.5">
              <UserPlus className="size-4" /> Virar cliente
            </Button>
          )
        )}
        <Button type="button" variant="outline" onClick={() => setContactForm({ name: lead.name, phone: lead.phone })} className="gap-1.5">
          <Pencil className="size-4" /> Editar contato
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setToDelete({ type: 'lead', id: lead.id, label: `o lead "${lead.name}"` })}
          className="ml-auto gap-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="size-4" /> Excluir
        </Button>
      </div>

      {/* Temperatura */}
      <section className={sectionCls}>
        <SectionTitle icon={TrendingUp}>Temperatura do lead</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LEAD_TEMPERATURE) as LeadTemperature[]).map((k) => {
            const t = LEAD_TEMPERATURE[k];
            const on = lead.temperature === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => patchLead({ temperature: on ? null : k })}
                aria-pressed={on}
                className={cn(
                  'rounded-xl border-2 p-2.5 sm:p-3 text-center transition-all',
                  on ? cn(t.className, 'border-current shadow-sm') : 'border-border bg-white text-slate-500 hover:bg-slate-50'
                )}
              >
                <span className="block text-2xl leading-none">{t.emoji}</span>
                <span className="block font-bold text-sm mt-1.5">{t.label}</span>
                <span className="hidden sm:block text-[11px] leading-tight mt-0.5 opacity-80">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Andamento */}
      <section className={sectionCls}>
        <SectionTitle icon={BellRing}>Andamento</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="field-group">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={lead.status}
              onChange={(e) => {
                const status = e.target.value as LeadStatus;
                patchLead(
                  { status, ...(status === 'perdido' || status === 'convertido' ? { next_contact_at: null } : {}), ...(status !== 'perdido' ? { lost_reason: null } : {}) },
                  'Status atualizado.'
                );
              }}
              className={selectCls}
            >
              {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{LEAD_STATUS[s].label}</option>
              ))}
            </select>
          </div>
          {lead.status === 'perdido' ? (
            <div className="field-group">
              <Label htmlFor="lost">Motivo da perda</Label>
              <select
                id="lost"
                value={lead.lost_reason ?? ''}
                onChange={(e) => patchLead({ lost_reason: e.target.value || null }, 'Motivo salvo.')}
                className={selectCls}
              >
                <option value="">Selecione</option>
                {LOST_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field-group">
              <Label htmlFor="next">Próximo contato</Label>
              <Input
                id="next"
                type="date"
                value={lead.next_contact_at ?? ''}
                onChange={(e) => patchLead({ next_contact_at: e.target.value || null }, e.target.value ? 'Retorno agendado.' : undefined)}
                className={cn('h-11', fu === 'atrasado' && 'border-destructive text-destructive', fu === 'hoje' && 'border-warning')}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  ['Amanhã', 1],
                  ['3 dias', 3],
                  ['1 semana', 7],
                ].map(([label, n]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => patchLead({ next_contact_at: addDays(n as number) }, 'Retorno agendado.')}
                    className="h-8 px-3 rounded-full border border-border text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {fu === 'atrasado' && <p className="text-xs text-destructive font-semibold mt-1.5">Retorno atrasado!</p>}
              {fu === 'hoje' && <p className="text-xs text-warning font-semibold mt-1.5">Retornar hoje.</p>}
            </div>
          )}
        </div>
      </section>

      {/* Evento */}
      <form onSubmit={saveEvent} className={sectionCls}>
        <SectionTitle icon={PartyPopper}>Evento e cardápio</SectionTitle>
        {lead.notes && (
          <div className="text-sm bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Mensagem do cliente</p>
            <p className="text-slate-700 whitespace-pre-line break-words">{lead.notes}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="field-group">
            <Label htmlFor="ev_date">Data</Label>
            <Input id="ev_date" type="date" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} className="h-11" />
          </div>
          <div className="field-group">
            <Label htmlFor="ev_type">Tipo</Label>
            <select id="ev_type" value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })} className={selectCls}>
              <option value="">Selecione</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <Label htmlFor="ev_guests">Convidados</Label>
            <Input id="ev_guests" type="number" inputMode="numeric" min={1} value={eventForm.guests} onChange={(e) => setEventForm({ ...eventForm, guests: e.target.value })} className="h-11" />
          </div>
        </div>
        <div className="field-group">
          <Label htmlFor="ev_menu">Cardápio de interesse (opcional)</Label>
          <select id="ev_menu" value={eventForm.menu_template_id} onChange={(e) => setEventForm({ ...eventForm, menu_template_id: e.target.value })} className={selectCls}>
            <option value="">Nenhum</option>
            {activeTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {templates.length === 0 && (
            <p className="text-xs text-slate-400 mt-1.5">
              Nenhum cardápio cadastrado. <Link href="/dashboard/menu/new" className="text-primary font-semibold">Criar cardápio</Link>
            </p>
          )}
        </div>
        <Button type="submit" variant="outline" disabled={saving} className="gap-1.5">
          <Save className="size-4" /> Salvar dados do evento
        </Button>
      </form>

      {/* Ofertas */}
      <section className={sectionCls}>
        <SectionTitle
          icon={HandCoins}
          aside={
            !showOfferForm && (
              <Button type="button" size="sm" onClick={() => setShowOfferForm(true)} className="gap-1.5">
                <Plus className="size-4" /> Nova oferta
              </Button>
            )
          }
        >
          Ofertas
        </SectionTitle>

        {offers.length === 0 && !showOfferForm && <p className="text-sm text-slate-500">Nenhuma oferta feita ainda.</p>}

        <ol className="space-y-3">
          {offers.map((o, i) => {
            const delta = offerDelta(offers[i - 1]?.price_per_person, o.price_per_person);
            const total = offerTotal(o);
            const menu = templateName(o.menu_template_id);
            return (
              <li key={o.id} className={cn('rounded-xl border p-3 sm:p-4 space-y-3', i === offers.length - 1 ? 'border-primary/30 bg-primary/[0.03]' : 'border-border')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Oferta {i + 1} · {dateTimeBR(o.created_at)}
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatBRL(o.price_per_person)} <span className="text-sm font-medium text-slate-500">por pessoa</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      {o.guests ? `${o.guests} convidados` : 'Convidados a definir'}
                      {total ? ` · total ${formatBRL(total)}` : ''}
                    </p>
                    {menu && (
                      <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <ChefHat className="size-4 text-primary shrink-0" /> {menu}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {delta && delta.diff !== 0 && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5',
                          delta.diff < 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                        )}
                      >
                        {delta.diff < 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                        {delta.diff > 0 ? '+' : ''}
                        {formatBRL(delta.diff)} ({delta.pct > 0 ? '+' : ''}
                        {delta.pct.toLocaleString('pt-BR')}%)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setToDelete({ type: 'offer', id: o.id, label: `a oferta ${i + 1}` })}
                      className="p-1.5 text-slate-300 hover:text-destructive"
                      aria-label="Excluir oferta"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                {o.description && <p className="text-sm text-slate-600 whitespace-pre-line break-words">{o.description}</p>}

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Como o cliente reagiu?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(OFFER_REACTION) as OfferReaction[]).map((r) => {
                      const rx = OFFER_REACTION[r];
                      const on = o.reaction === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReaction(o, r)}
                          aria-pressed={on}
                          className={cn(
                            'h-11 rounded-xl border text-sm font-semibold transition-all',
                            on ? rx.className : 'border-border bg-white text-slate-500 hover:bg-slate-50'
                          )}
                        >
                          <span className="mr-1">{rx.emoji}</span>
                          {rx.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button type="button" size="sm" variant="outline" onClick={() => sendOffer(o, i + 1)} className="gap-1.5 w-full sm:w-auto">
                  <Send className="size-4" /> Enviar oferta no WhatsApp
                </Button>
              </li>
            );
          })}
        </ol>

        {showOfferForm && (
          <form onSubmit={saveOffer} className="rounded-xl border-2 border-dashed border-primary/30 p-3 sm:p-4 space-y-4">
            <p className="font-semibold text-slate-900">
              Oferta {offers.length + 1}
              {lastOffer && <span className="font-normal text-slate-500 text-sm"> · anterior: {formatBRL(lastOffer.price_per_person)}/pessoa</span>}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="field-group">
                <Label htmlFor="of_price">Valor por pessoa (R$) *</Label>
                <Input
                  id="of_price"
                  inputMode="decimal"
                  placeholder="140,00"
                  value={offerForm.price}
                  onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })}
                  required
                  autoFocus={offers.length > 0}
                  className="h-11"
                />
              </div>
              <div className="field-group">
                <Label htmlFor="of_guests">Convidados</Label>
                <Input
                  id="of_guests"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={offerForm.guests}
                  onChange={(e) => setOfferForm({ ...offerForm, guests: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            {(() => {
              const p = parseMoney(offerForm.price);
              const g = Number(offerForm.guests);
              const d = p > 0 ? offerDelta(lastOffer?.price_per_person, p) : null;
              if (!(p > 0)) return null;
              return (
                <p className="text-sm text-slate-600 -mt-1">
                  {g > 0 && <>Total estimado: <strong>{formatBRL(p * g)}</strong></>}
                  {d && d.diff !== 0 && (
                    <span className={cn('ml-2 font-semibold', d.diff < 0 ? 'text-destructive' : 'text-success')}>
                      ({d.diff > 0 ? '+' : ''}{d.pct.toLocaleString('pt-BR')}% vs anterior)
                    </span>
                  )}
                </p>
              );
            })()}
            <div className="field-group">
              <Label htmlFor="of_menu">Cardápio (opcional)</Label>
              <select id="of_menu" value={offerForm.menu_template_id} onChange={(e) => setOfferForm({ ...offerForm, menu_template_id: e.target.value })} className={selectCls}>
                <option value="">Nenhum</option>
                {activeTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <Label htmlFor="of_desc">O que está incluso / condições</Label>
              <textarea
                id="of_desc"
                rows={3}
                maxLength={1000}
                placeholder="Ex: inclui bebidas e 4 garçons; 30% de entrada e restante até a data."
                value={offerForm.description}
                onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                className={textareaCls}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="gap-1.5 flex-1 sm:flex-none">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Registrar oferta
              </Button>
              {offers.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setShowOfferForm(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Histórico */}
      <section className={sectionCls}>
        <SectionTitle icon={NotebookPen}>Histórico e anotações</SectionTitle>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const body = noteForm.body.trim();
            if (!body) return;
            setSaving(true);
            await addNote(noteForm.kind, body);
            setSaving(false);
            setNoteForm((f) => ({ ...f, body: '' }));
          }}
          className="space-y-2"
        >
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(NOTE_KIND) as NoteKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setNoteForm({ ...noteForm, kind: k })}
                className={cn(
                  'h-8 px-3 rounded-full border text-xs font-semibold',
                  noteForm.kind === k ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-border hover:bg-slate-50'
                )}
              >
                {NOTE_KIND[k].emoji} {NOTE_KIND[k].label}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="Ex: Achou caro, vai conversar com o noivo e retorna sexta."
            value={noteForm.body}
            onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
            className={textareaCls}
          />
          <Button type="submit" size="sm" disabled={saving || !noteForm.body.trim()} className="gap-1.5">
            <Plus className="size-4" /> Adicionar
          </Button>
        </form>

        {notes.length > 0 && (
          <ul className="space-y-2 pt-2 border-t border-slate-100">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <span className="text-lg leading-none mt-0.5">{NOTE_KIND[n.kind]?.emoji ?? '📝'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 font-semibold">
                    {NOTE_KIND[n.kind]?.label} · {dateTimeBR(n.created_at)}
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-line break-words">{n.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToDelete({ type: 'note', id: n.id, label: 'esta anotação' })}
                  className="p-1 self-start text-slate-300 hover:text-destructive"
                  aria-label="Excluir anotação"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!contactForm} onOpenChange={(o) => !o && setContactForm(null)}>
        <DialogContent className="max-w-sm !rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar contato</DialogTitle>
            <DialogDescription>Corrija o nome ou o WhatsApp do lead.</DialogDescription>
          </DialogHeader>
          {contactForm && (
            <form onSubmit={saveContact} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Nome</Label>
                <Input id="lead-name" maxLength={120} value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">WhatsApp</Label>
                <Input id="lead-phone" inputMode="tel" maxLength={30} value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setContactForm(null)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && !saving && setToDelete(null)}
        title={`Excluir ${toDelete?.label ?? ''}?`}
        description={toDelete?.type === 'lead' ? 'O lead, as ofertas e as anotações serão removidos. Se ele já virou cliente, o cliente continua cadastrado.' : 'Essa ação não pode ser desfeita.'}
        variant="destructive"
        confirmText="Sim, excluir"
        onConfirm={confirmDelete}
        loading={saving}
      />
    </div>
  );
}
