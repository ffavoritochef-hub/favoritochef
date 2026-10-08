'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  UtensilsCrossed,
  FileDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/buffet-rules';
import type { ProposalView } from '@/lib/proposal';

export const dynamic = 'force-dynamic';

const dateBR = (d: string) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';

export default function PublicProposalPage() {
  const { token } = useParams() as { token: string };
  const [view, setView] = useState<ProposalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'idle' | 'accept' | 'decline'>('idle');
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/proposals/${token}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Proposta não encontrada.');
        setView(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function respond(action: 'accept' | 'decline') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/proposals/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Não foi possível registrar sua resposta.');
      setView(json);
      setMode('idle');
    } catch (e: any) {
      setError(e.message);
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

  if (!view) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center space-y-3">
          <AlertTriangle className="size-12 mx-auto text-warning" />
          <h1 className="text-xl font-bold text-slate-900">Proposta indisponível</h1>
          <p className="text-slate-500 text-sm">{error || 'O link pode estar incorreto ou a proposta foi removida.'}</p>
        </div>
      </div>
    );
  }

  const canRespond = view.status === 'enviada';

  return (
    <div className="min-h-screen bg-slate-50 pb-40 sm:pb-16">
      <header className="bg-primary text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white/15">
            <UtensilsCrossed className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Proposta comercial</p>
            <h1 className="text-xl sm:text-2xl font-bold truncate">Agenda Buffet</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 space-y-4 sm:space-y-5">
        {view.status === 'aceita' && (
          <Banner tone="success" icon={<CheckCircle2 className="size-5" />} title="Proposta aceita!">
            Obrigado, {view.clientName.split(' ')[0]}! O buffet entrará em contato para combinar o pagamento do sinal e garantir a sua data.
          </Banner>
        )}
        {view.status === 'recusada' && (
          <Banner tone="muted" icon={<XCircle className="size-5" />} title="Proposta recusada">
            Registramos sua resposta. Se mudar de ideia, fale com o buffet para receber uma nova proposta.
          </Banner>
        )}
        {view.status === 'expirada' && (
          <Banner tone="warning" icon={<AlertTriangle className="size-5" />} title="Proposta expirada">
            O prazo de validade terminou. Solicite uma nova proposta ao buffet.
          </Banner>
        )}
        {error && (
          <Banner tone="danger" icon={<AlertTriangle className="size-5" />} title="Ops">
            {error}
          </Banner>
        )}

        <section className="bg-white rounded-2xl border border-border shadow-card p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500">Preparada para</p>
            <p className="text-lg font-bold text-slate-900">{view.clientName}</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">{view.event.name}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Info icon={<Calendar className="size-4" />} text={dateBR(view.event.date)} />
            <Info icon={<Clock className="size-4" />} text={`${view.event.start} às ${view.event.end}`} />
            <Info icon={<MapPin className="size-4" />} text={view.event.address || '-'} />
            <Info icon={<Users className="size-4" />} text={`${view.event.guests} convidados`} />
          </dl>
        </section>

        <section className="bg-white rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h3 className="font-bold text-slate-900 mb-1">Cardápio</h3>
          <p className="text-primary font-semibold">{view.menu.name}</p>
          {view.menu.items.length > 0 && (
            <ul className="mt-3 divide-y divide-border text-sm">
              {view.menu.items.map((i, idx) => (
                <li key={idx} className="py-2 flex justify-between gap-3">
                  <span className="text-slate-800">{i.name}</span>
                  <span className="text-slate-500 shrink-0">{i.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h3 className="font-bold text-slate-900 mb-3">Investimento</h3>
          <ul className="divide-y divide-border text-sm">
            {view.lines.map((l, i) => (
              <li key={i} className="py-2.5 flex justify-between gap-3">
                <span className="text-slate-700">{l.label}</span>
                <span className="font-semibold text-slate-900 shrink-0">{formatBRL(l.value)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-primary text-white px-4 py-4 flex items-center justify-between gap-3">
            <span className="font-semibold text-sm uppercase tracking-wide">Total</span>
            <span className="text-2xl font-black">{formatBRL(view.total)}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 border border-border p-3">
              <p className="text-slate-500 text-xs">Sinal ({view.deposit.percent}%) para reservar a data</p>
              <p className="font-bold text-slate-900 text-lg">{formatBRL(view.deposit.amount)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-border p-3">
              <p className="text-slate-500 text-xs">Saldo restante</p>
              <p className="font-bold text-slate-900 text-lg">{formatBRL(view.deposit.balance)}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 whitespace-pre-line">{view.paymentConditions}</p>
          {view.validUntil && (
            <p className="mt-3 text-xs text-slate-500">
              Proposta válida até {new Date(view.validUntil + 'T12:00:00').toLocaleDateString('pt-BR')}.
            </p>
          )}
        </section>

        <Button asChild variant="outline" className="w-full h-12 rounded-xl border-primary/30 text-primary font-semibold">
          <a href={`/api/public/proposals/${token}/pdf?download=true`}>
            <FileDown className="size-5" /> Baixar PDF da proposta
          </a>
        </Button>
      </main>

      {canRespond && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-[0_-4px_12px_rgba(15,23,42,0.08)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 space-y-3">
            {mode === 'idle' && (
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <Button variant="outline" className="h-12 rounded-xl sm:flex-1" onClick={() => setMode('decline')}>
                  Recusar
                </Button>
                <Button className="h-12 rounded-xl sm:flex-[2] bg-success hover:bg-success/90 text-white font-bold" onClick={() => setMode('accept')}>
                  Aceitar proposta
                </Button>
              </div>
            )}
            {mode !== 'idle' && (
              <>
                <p className="text-sm text-slate-700">
                  {mode === 'accept'
                    ? `Confirmar aceite de ${formatBRL(view.total)}? O buffet entrará em contato para o sinal.`
                    : 'Quer nos contar o motivo? (opcional)'}
                </p>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={mode === 'accept' ? 'Observação para o buffet (opcional)' : 'Motivo da recusa'}
                  className="w-full rounded-xl border border-border px-3 py-2 text-[16px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                />
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <Button variant="outline" className="h-12 rounded-xl sm:flex-1" disabled={busy} onClick={() => setMode('idle')}>
                    Voltar
                  </Button>
                  <Button
                    className={`h-12 rounded-xl sm:flex-[2] text-white font-bold ${mode === 'accept' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}`}
                    disabled={busy}
                    onClick={() => respond(mode)}
                  >
                    {busy ? 'Enviando...' : mode === 'accept' ? 'Sim, aceitar' : 'Confirmar recusa'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-slate-700">
      <span className="text-primary mt-0.5 shrink-0">{icon}</span>
      <span className="break-words min-w-0">{text}</span>
    </div>
  );
}

function Banner({ tone, icon, title, children }: { tone: 'success' | 'warning' | 'danger' | 'muted'; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const styles = {
    success: 'border-success/30 bg-success/10 text-slate-800',
    warning: 'border-warning/40 bg-warning/10 text-slate-800',
    danger: 'border-destructive/30 bg-destructive/10 text-slate-800',
    muted: 'border-border bg-white text-slate-700',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 flex gap-3 ${styles}`} role="status">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="text-sm">
        <p className="font-bold">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}
