'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Send, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { darken } from '@/lib/tenant';
import { whatsappUrl } from '@/lib/leads';

export const dynamic = 'force-dynamic';

interface FormInfo {
  brand: { name: string; logoUrl: string | null; color: string };
  phone: string | null;
  eventTypes: string[];
}

const EMPTY = { name: '', phone: '', event_date: '', event_type: '', guests: '', notes: '', website: '' };

const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const fieldCls = 'h-12 rounded-xl bg-white';

export default function LeadFormPage() {
  const { slug } = useParams() as { slug: string };
  const [info, setInfo] = useState<FormInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/leads/${slug}`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        setInfo(await res.json());
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'phone' ? maskPhone(e.target.value) : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams(window.location.search);
      const res = await fetch(`/api/public/leads/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: qs.get('origem') || qs.get('utm_source') || 'link' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Não foi possível enviar. Tente novamente.');
      setSent(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center space-y-3">
          <AlertTriangle className="size-12 mx-auto text-warning" />
          <h1 className="text-xl font-bold text-slate-900">Página indisponível</h1>
          <p className="text-slate-500 text-sm">O link pode estar incorreto ou o buffet não está recebendo pedidos no momento.</p>
        </div>
      </div>
    );
  }

  const wa = whatsappUrl(info.phone, `Olá! Acabei de pedir um orçamento pelo site, sou ${form.name.split(' ')[0] || ''}.`);

  return (
    <div
      className="min-h-screen bg-slate-50 pb-16"
      style={{ ['--primary' as string]: info.brand.color, ['--primary-dark' as string]: darken(info.brand.color) } as React.CSSProperties}
    >
      <header className="bg-primary text-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 pt-8 pb-10 flex items-center gap-3">
          {info.brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.brand.logoUrl} alt={info.brand.name} className="size-14 rounded-xl bg-white object-contain p-1 shrink-0" />
          ) : (
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-white/15 shrink-0">
              <UtensilsCrossed className="size-6" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Peça seu orçamento</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{info.brand.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 -mt-5">
        {sent ? (
          <section className="bg-white rounded-2xl border border-border shadow-card p-6 sm:p-8 text-center space-y-4">
            <CheckCircle2 className="size-14 mx-auto text-success" />
            <h2 className="text-xl font-bold text-slate-900">Pedido enviado!</h2>
            <p className="text-slate-600">
              Obrigado{form.name ? `, ${form.name.split(' ')[0]}` : ''}! O {info.brand.name} recebeu seu pedido e entrará em contato pelo WhatsApp em breve.
            </p>
            {wa && (
              <Button asChild size="lg" className="w-full min-h-[48px] gap-2 bg-[#25D366] hover:bg-[#1EBE5A] text-white">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-5" /> Falar agora no WhatsApp
                </a>
              </Button>
            )}
          </section>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-border shadow-card p-5 sm:p-7 space-y-5">
            <p className="text-sm text-slate-500">Preencha os dados abaixo e receba sua proposta pelo WhatsApp.</p>

            <div className="field-group">
              <Label htmlFor="name">Seu nome *</Label>
              <Input id="name" value={form.name} onChange={set('name')} required minLength={2} maxLength={120} autoComplete="name" className={fieldCls} />
            </div>

            <div className="field-group">
              <Label htmlFor="phone">WhatsApp *</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={set('phone')}
                required
                autoComplete="tel"
                className={fieldCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="field-group">
                <Label htmlFor="event_date">Data do evento</Label>
                <Input id="event_date" type="date" min={todayIso()} value={form.event_date} onChange={set('event_date')} className={fieldCls} />
              </div>
              <div className="field-group">
                <Label htmlFor="guests">Nº de convidados</Label>
                <Input id="guests" type="number" inputMode="numeric" min={1} max={100000} value={form.guests} onChange={set('guests')} className={fieldCls} />
              </div>
            </div>

            <div className="field-group">
              <Label htmlFor="event_type">Tipo de evento</Label>
              <select
                id="event_type"
                value={form.event_type}
                onChange={set('event_type')}
                className="w-full h-12 rounded-xl border border-input bg-white px-3 text-base text-slate-900"
              >
                <option value="">Selecione</option>
                {info.eventTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={set('notes')}
                maxLength={1000}
                placeholder="Local, horário, cardápio de interesse..."
                className="w-full rounded-xl border border-input bg-white px-3 py-3 text-base text-slate-900"
              />
            </div>

            {/* campo isca para robôs: invisível para pessoas */}
            <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
              <label htmlFor="website">Site</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>

            {error && (
              <div className="text-sm bg-destructive/5 text-destructive p-3.5 rounded-xl border border-destructive/20 flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={busy} className="w-full min-h-[52px] gap-2 text-base">
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              {busy ? 'Enviando...' : 'Pedir orçamento'}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
