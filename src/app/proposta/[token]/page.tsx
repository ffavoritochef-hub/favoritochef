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
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/buffet-rules';
import type { ProposalView } from '@/lib/proposal';
import { darken } from '@/lib/tenant';
import { formatCpf, isValidCpf } from '@/lib/cpf';
import { SignaturePad } from '@/components/SignaturePad';

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
  const [signer, setSigner] = useState({ name: '', document: '', email: '' });
  const [signature, setSignature] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/proposals/${token}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Proposta não encontrada.');
        setView(json);
        setSigner((s) => ({ ...s, name: s.name || json.clientName || '' }));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function validateSigner(): string | null {
    if (signer.name.trim().split(/\s+/).length < 2) return 'Informe seu nome completo.';
    if (!isValidCpf(signer.document)) return 'CPF inválido. Confira os números.';
    if (signer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email.trim())) return 'E-mail inválido.';
    if (!signature) return 'Desenhe sua assinatura no quadro.';
    if (!agree) return 'Marque que você leu e concorda com os termos.';
    return null;
  }

  async function respond(action: 'accept' | 'decline') {
    if (action === 'accept') {
      const msg = validateSigner();
      setFormError(msg);
      if (msg) return;
    }
    setBusy(true);
    setError(null);
    setFormError(null);
    try {
      const res = await fetch(`/api/public/proposals/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'accept' ? { action, note, signer: { ...signer, signature, agree } } : { action, note }
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Não foi possível registrar sua resposta.');
      setView(json);
      setMode('idle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      if (action === 'accept') setFormError(e.message);
      else setError(e.message);
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
    <div
      className="min-h-screen bg-slate-50 pb-40 sm:pb-16"
      style={{ ['--primary' as string]: view.brand.color, ['--primary-dark' as string]: darken(view.brand.color) } as React.CSSProperties}
    >
      <header className="bg-primary text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center gap-3">
          {view.brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.brand.logoUrl} alt={view.brand.name} className="size-14 rounded-xl bg-white object-contain p-1 shrink-0" />
          ) : (
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white/15">
              <UtensilsCrossed className="size-6" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Proposta comercial</p>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{view.brand.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 space-y-4 sm:space-y-5">
        {view.status === 'aceita' && (
          <Banner tone="success" icon={<CheckCircle2 className="size-5" />} title={view.signature ? 'Proposta assinada!' : 'Proposta aceita!'}>
            Obrigado, {(view.signature?.name || view.clientName).split(' ')[0]}! O buffet entrará em contato para combinar o pagamento do sinal e garantir a sua data.
            {view.signature && (
              <span className="block mt-2 text-xs text-slate-600">
                Assinado eletronicamente por {view.signature.name} (CPF {view.signature.document}) em{' '}
                {new Date(view.signature.signedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
                Código de verificação: <strong className="font-mono">{view.signature.code}</strong>
              </span>
            )}
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

        {view.terms.length > 0 && (
          <section className="bg-white rounded-2xl border border-border shadow-card p-5 sm:p-6">
            <h3 className="font-bold text-slate-900 mb-3">Termos e condições</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
              {view.terms.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        )}

        <Button asChild variant="outline" className="w-full h-12 rounded-xl border-primary/30 text-primary font-semibold">
          <a href={`/api/public/proposals/${token}/pdf?download=true`}>
            <FileDown className="size-5" /> {view.signature ? 'Baixar proposta assinada (PDF)' : 'Baixar PDF da proposta'}
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
                  Aceitar e assinar
                </Button>
              </div>
            )}
            {mode === 'decline' && (
              <>
                <p className="text-sm text-slate-700">Quer nos contar o motivo? (opcional)</p>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Motivo da recusa"
                  className="w-full rounded-xl border border-border px-3 py-2 text-[16px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                />
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <Button variant="outline" className="h-12 rounded-xl sm:flex-1" disabled={busy} onClick={() => setMode('idle')}>
                    Voltar
                  </Button>
                  <Button
                    className="h-12 rounded-xl sm:flex-[2] text-white font-bold bg-destructive hover:bg-destructive/90"
                    disabled={busy}
                    onClick={() => respond('decline')}
                  >
                    {busy ? 'Enviando...' : 'Confirmar recusa'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {canRespond && mode === 'accept' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="sign-title">
          <div
            className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="sign-title" className="font-bold text-slate-900">Aceitar e assinar</h2>
                <p className="text-xs text-slate-500">{view.event.name} · {formatBRL(view.total)}</p>
              </div>
              <button type="button" onClick={() => setMode('idle')} disabled={busy} className="p-2 -mr-2 text-slate-500 hover:text-slate-800" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <Field label="Nome completo">
                <input
                  value={signer.name}
                  onChange={(e) => setSigner({ ...signer, name: e.target.value })}
                  autoComplete="name"
                  maxLength={120}
                  className={inputCls}
                />
              </Field>
              <Field label="CPF">
                <input
                  value={signer.document}
                  onChange={(e) => setSigner({ ...signer, document: formatCpf(e.target.value) })}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className={inputCls}
                />
              </Field>
              <Field label="E-mail (opcional)">
                <input
                  type="email"
                  value={signer.email}
                  onChange={(e) => setSigner({ ...signer, email: e.target.value })}
                  autoComplete="email"
                  maxLength={160}
                  className={inputCls}
                />
              </Field>
              <Field label="Sua assinatura">
                <SignaturePad onChange={setSignature} />
              </Field>
              <Field label="Observação para o buffet (opcional)">
                <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
              </Field>

              <label className="flex items-start gap-3 rounded-xl bg-slate-50 border border-border p-3 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-5 accent-[var(--primary)] shrink-0" />
                <span>
                  Li e concordo com os valores, o cardápio e os <strong>termos e condições</strong> desta proposta, no valor total de{' '}
                  <strong>{formatBRL(view.total)}</strong>.
                </span>
              </label>

              {formError && (
                <p className="text-sm text-destructive font-medium" role="alert">
                  {formError}
                </p>
              )}

              <Button
                className="w-full h-12 rounded-xl bg-success hover:bg-success/90 text-white font-bold"
                disabled={busy}
                onClick={() => respond('accept')}
              >
                {busy ? 'Assinando...' : 'Assinar e aceitar proposta'}
              </Button>
              <p className="flex items-start gap-2 text-xs text-slate-500">
                <ShieldCheck className="size-4 shrink-0 mt-px" />
                Registramos data, hora, IP e dispositivo como prova do aceite. Você poderá baixar a proposta assinada em PDF.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-border px-3 py-2.5 text-[16px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {children}
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
