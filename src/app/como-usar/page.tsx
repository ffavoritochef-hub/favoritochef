'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';
import { PERFIS, TUTORIAIS, videoSource, type Perfil, type Tutorial } from '@/lib/tutoriais';
import { ArrowLeft, PlayCircle, Search, Clock, X, GraduationCap, Smartphone, ShieldCheck, UserRound, Crown } from 'lucide-react';

const TODAS = 'Todos';

const PERFIL_ICON: Record<Perfil, typeof UserRound> = { admin: ShieldCheck, usuario: UserRound, master: Crown };

function Player({ t }: { t: Tutorial }) {
  const src = videoSource(t.video);
  if (src.kind === 'none') {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
        <Clock className="size-8" />
        <p className="text-sm font-semibold">Vídeo em breve</p>
      </div>
    );
  }
  if (src.kind === 'file') {
    return <video src={src.src} controls autoPlay playsInline className="aspect-video w-full bg-black" />;
  }
  return (
    <iframe
      src={src.src}
      title={t.titulo}
      className="aspect-video w-full bg-black"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}

function Card({ t, onOpen }: { t: Tutorial; onOpen: () => void }) {
  const src = videoSource(t.video);
  const thumb = src.kind === 'embed' ? src.thumb : undefined;
  const soon = src.kind === 'none';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-white text-left transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/15 to-primary/5">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle
            className={cn(
              'size-12 drop-shadow transition group-hover:scale-110',
              thumb ? 'text-white' : 'text-primary',
              soon && 'opacity-40',
            )}
          />
        </div>
        {soon && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            Em breve
          </span>
        )}
        {t.duracao && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {t.duracao}
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{t.categoria}</p>
        <p className="font-semibold leading-snug text-slate-900">{t.titulo}</p>
        <p className="text-sm leading-relaxed text-slate-500">{t.descricao}</p>
      </div>
    </button>
  );
}

/** Central de vídeos "Como usar o sistema" — lista vem de src/lib/tutoriais.ts. */
export default function ComoUsarPage() {
  const { isMaster, role, loading } = useTenant();
  // aba Master só para quem é master; as demais ficam sempre visíveis (página também abre sem login)
  const perfis = useMemo(() => PERFIS.filter((p) => p.key !== 'master' || isMaster), [isMaster]);
  // abre na aba do usuário logado, até ele trocar manualmente
  const padrao: Perfil = loading ? 'admin' : isMaster ? 'master' : role === 'usuario' ? 'usuario' : 'admin';
  const [escolhido, setEscolhido] = useState<Perfil | null>(null);
  const perfil = escolhido ?? padrao;

  const doPerfil = useMemo(() => TUTORIAIS.filter((t) => t.perfis.includes(perfil)), [perfil]);
  const categorias = useMemo(() => [TODAS, ...Array.from(new Set(doPerfil.map((t) => t.categoria)))], [doPerfil]);
  const [cat, setCat] = useState(TODAS);
  const perfilAtual = PERFIS.find((p) => p.key === perfil)!;
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<Tutorial | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return doPerfil.filter(
      (t) =>
        (cat === TODAS || t.categoria === cat) &&
        (!q || `${t.titulo} ${t.descricao} ${t.categoria}`.toLowerCase().includes(q)),
    );
  }, [doPerfil, cat, busca]);

  const trocarPerfil = (p: Perfil) => {
    setEscolhido(p);
    setCat(TODAS);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/dashboard'))}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>

        <header className="space-y-3 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <GraduationCap className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Como usar o sistema</h1>
          <p className="mx-auto max-w-xl text-sm text-slate-500">
            Vídeos curtos mostrando passo a passo cada parte do Agenda Buffet. Escolha um assunto ou pesquise.
          </p>
        </header>

        <div role="tablist" aria-label="Tipo de usuário" className="mx-auto flex max-w-xl gap-1 rounded-2xl border border-border bg-white p-1">
          {perfis.map((p) => {
            const Icon = PERFIL_ICON[p.key];
            const ativo = p.key === perfil;
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => trocarPerfil(p.key)}
                className={cn(
                  'flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition',
                  ativo ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{p.label}</span>
              </button>
            );
          })}
        </div>
        <p className="-mt-3 text-center text-xs text-slate-500">{perfilAtual.descricao}</p>

        <div className="relative mx-auto max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar: orçamento, evento, financeiro..."
            className="min-h-[48px] w-full rounded-xl border border-border bg-white pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                'min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition',
                cat === c
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            {busca ? <>Nenhum vídeo encontrado para “{busca}”.</> : 'Nenhum vídeo nesta categoria.'}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((t) => (
              <Card key={t.id} t={t} onOpen={() => setAberto(t)} />
            ))}
          </div>
        )}

        <Link
          href="/instalar"
          className="mx-auto flex max-w-xl items-center justify-center gap-2 rounded-xl border border-border bg-white p-3.5 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          <Smartphone className="size-4" /> Como instalar o app no celular
        </Link>
      </div>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 sm:p-6"
          onClick={() => setAberto(null)}
          role="dialog"
          aria-modal="true"
          aria-label={aberto.titulo}
        >
          <div
            className="w-full max-w-4xl overflow-hidden bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Player t={aberto} />
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{aberto.categoria}</p>
                <p className="font-bold text-slate-900">{aberto.titulo}</p>
                <p className="mt-0.5 text-sm text-slate-500">{aberto.descricao}</p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(null)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
