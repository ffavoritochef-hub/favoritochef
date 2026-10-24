'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, MessageCircle, PartyPopper, Quote, Send, Star, UtensilsCrossed, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { darken } from '@/lib/tenant';
import { whatsappUrl } from '@/lib/leads';
import type { SectionKey, ShowcaseContent, ShowcaseMenu, ShowcaseTheme } from '@/lib/showcase';
import { playfair, poppins } from './fonts';

export interface ShowcaseData {
  brand: { name: string; slug: string; logoUrl: string | null; color: string };
  phone: string | null;
  city: string | null;
  state: string | null;
  content: ShowcaseContent;
  menus: ShowcaseMenu[];
}

/** Classes de cada estilo. A cor do buffet entra via --brand / --brand-dark. */
const THEME_STYLE: Record<
  ShowcaseTheme,
  { page: string; alt: string; heading: string; muted: string; card: string; radius: string; topbar: string }
> = {
  classico: {
    page: 'bg-[#FAF6EF] text-stone-800',
    alt: 'bg-white',
    heading: cn(playfair.className, 'font-semibold'),
    muted: 'text-stone-500',
    card: 'bg-white border border-stone-200/80 shadow-[0_10px_30px_-18px_rgba(68,64,60,0.35)]',
    radius: 'rounded-2xl',
    topbar: 'bg-[#FAF6EF]/85 border-stone-200/70',
  },
  moderno: {
    page: 'bg-white text-slate-800',
    alt: 'bg-slate-50',
    heading: 'font-extrabold tracking-tight',
    muted: 'text-slate-500',
    card: 'bg-white border border-slate-200',
    radius: 'rounded-xl',
    topbar: 'bg-white/85 border-slate-200',
  },
  festivo: {
    page: 'bg-[#FFF6F0] text-slate-800',
    alt: 'bg-white',
    heading: cn(poppins.className, 'font-bold'),
    muted: 'text-slate-500',
    card: 'bg-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]',
    radius: 'rounded-3xl',
    topbar: 'bg-white/80 border-orange-100',
  },
};

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShowcaseView({ data, preview = false }: { data: ShowcaseData; preview?: boolean }) {
  const { brand, content: c, menus } = data;
  const t = THEME_STYLE[c.theme];
  const [lightbox, setLightbox] = useState<number | null>(null);

  // conta a visita (1 por aba); a prévia do editor não conta
  useEffect(() => {
    if (preview) return;
    const key = `vitrine-view:${brand.slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    fetch(`/api/public/vitrine/${brand.slug}/view`, { method: 'POST', keepalive: true }).catch(() => {});
  }, [preview, brand.slug]);

  const quoteUrl = `/orcamento/${brand.slug}?origem=vitrine`;
  const wa = whatsappUrl(data.phone, `Olá! Vi a página do ${brand.name} e gostaria de saber mais.`);
  const place = [data.city, data.state].filter(Boolean).join(' - ');
  const linkTarget = preview ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const title = (key: SectionKey) => c.sections.find((s) => s.key === key)?.title ?? '';

  const hasContent: Record<SectionKey, boolean> = {
    about: !!(c.about.text || c.about.image),
    gallery: c.gallery.length > 0,
    events: c.events.length > 0,
    menus: menus.length > 0,
    testimonials: c.testimonials.length > 0,
    contact: true,
  };
  const visible = c.sections.filter((s) => s.enabled && hasContent[s.key]);

  const ctaPrimary = cn(
    'inline-flex items-center justify-center gap-2 min-h-[50px] px-6 font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition shadow-lg shadow-black/10',
    t.radius
  );
  const ctaWhats = cn(
    'inline-flex items-center justify-center gap-2 min-h-[50px] px-6 font-semibold text-white bg-[#25D366] hover:bg-[#1EBE5A] transition',
    t.radius
  );

  const renderSection = (key: SectionKey, i: number) => {
    const bg = i % 2 === 0 ? t.alt : '';
    switch (key) {
      case 'about':
        return (
          <section key={key} id="sobre" className={cn('py-16 sm:py-24', bg)}>
            <div className={cn('max-w-6xl mx-auto px-5 sm:px-8 grid gap-10 items-center', c.about.image && 'md:grid-cols-2 md:gap-16')}>
              <div className={cn(!c.about.image && 'max-w-3xl mx-auto text-center')}>
                <Eyebrow>Sobre nós</Eyebrow>
                <h2 className={cn('text-3xl sm:text-4xl mt-2', t.heading)}>{title('about')}</h2>
                {c.about.text && <p className={cn('mt-6 text-lg leading-relaxed whitespace-pre-line', t.muted)}>{c.about.text}</p>}
              </div>
              {c.about.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.about.image} alt={brand.name} loading="lazy" className={cn('w-full aspect-[4/5] object-cover', t.radius)} />
              )}
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section key={key} id="galeria" className={cn('py-16 sm:py-24', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Galeria" title={title('gallery')} heading={t.heading} />
              <div className="columns-2 md:columns-3 gap-3 sm:gap-4">
                {c.gallery.map((g, gi) => (
                  <button
                    key={g.url + gi}
                    type="button"
                    onClick={() => setLightbox(gi)}
                    className={cn('group relative mb-3 sm:mb-4 block w-full overflow-hidden break-inside-avoid', t.radius)}
                    aria-label={g.caption || `Foto ${gi + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt={g.caption || brand.name} loading="lazy" className="w-full h-auto transition duration-500 group-hover:scale-105" />
                    {g.caption && (
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-left text-sm text-white">
                        {g.caption}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        );

      case 'events':
        return (
          <section key={key} id="eventos" className={cn('py-16 sm:py-24', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Eventos" title={title('events')} heading={t.heading} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {c.events.map((e, ei) => (
                  <article key={ei} className={cn('overflow-hidden flex flex-col', t.card, t.radius)}>
                    {e.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.image} alt={e.title} loading="lazy" className="w-full aspect-[4/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white/90">
                        <PartyPopper className="size-12" />
                      </div>
                    )}
                    <div className="p-5 sm:p-6">
                      <h3 className={cn('text-xl', t.heading)}>{e.title}</h3>
                      {e.text && <p className={cn('mt-2 leading-relaxed', t.muted)}>{e.text}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'menus':
        return (
          <section key={key} id="cardapios" className={cn('py-16 sm:py-24', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Cardápios" title={title('menus')} heading={t.heading} />
              <div className="grid gap-5 md:grid-cols-2">
                {menus.map((m) => {
                  const shown = m.items.slice(0, 10);
                  return (
                    <article key={m.id} className={cn('p-6 sm:p-7 flex flex-col', t.card, t.radius)}>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                          <UtensilsCrossed className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className={cn('text-xl', t.heading)}>{m.name}</h3>
                          {m.description && <p className={cn('mt-1', t.muted)}>{m.description}</p>}
                        </div>
                      </div>
                      {shown.length > 0 && (
                        <ul className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          {shown.map((it, ii) => (
                            <li key={ii} className="flex items-start gap-2 text-[15px]">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.items.length > shown.length && (
                        <p className={cn('mt-3 text-sm', t.muted)}>e mais {m.items.length - shown.length} itens</p>
                      )}
                      <a href={quoteUrl} {...linkTarget} className="mt-6 self-start text-sm font-semibold text-[var(--brand)] hover:underline">
                        Quero um orçamento com este cardápio →
                      </a>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section key={key} id="depoimentos" className={cn('py-16 sm:py-24', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Depoimentos" title={title('testimonials')} heading={t.heading} />
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {c.testimonials.map((d, di) => (
                  <figure key={di} className={cn('p-6 sm:p-7 flex flex-col', t.card, t.radius)}>
                    <Quote className="size-8 text-[var(--brand)]/30" />
                    <div className="mt-2 flex gap-0.5 text-amber-400" aria-label="5 estrelas">
                      {Array.from({ length: 5 }).map((_, s) => <Star key={s} className="size-4 fill-current" />)}
                    </div>
                    <blockquote className="mt-4 flex-1 leading-relaxed whitespace-pre-line">“{d.text}”</blockquote>
                    <figcaption className="mt-5">
                      <p className="font-semibold">{d.name}</p>
                      {d.event && <p className={cn('text-sm', t.muted)}>{d.event}</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section key={key} id="contato" className="relative overflow-hidden bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] py-16 sm:py-24 text-white">
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-white/5" />
            <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
              <h2 className={cn('text-3xl sm:text-5xl text-white', t.heading)}>{title('contact')}</h2>
              {c.contact.text && <p className="mt-5 text-lg text-white/85 whitespace-pre-line">{c.contact.text}</p>}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={quoteUrl}
                  {...linkTarget}
                  className={cn('inline-flex items-center justify-center gap-2 min-h-[50px] px-6 font-semibold bg-white text-[var(--brand-dark)] hover:bg-white/90 transition shadow-lg shadow-black/10', t.radius)}
                >
                  <Send className="size-5" /> Pedir orçamento
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={ctaWhats}>
                    <MessageCircle className="size-5" /> WhatsApp
                  </a>
                )}
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/85">
                {place && (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {place}</span>
                )}
                {c.contact.instagram && (
                  <a href={`https://instagram.com/${c.contact.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                    <InstagramIcon className="size-4" /> @{c.contact.instagram}
                  </a>
                )}
              </div>
            </div>
          </section>
        );
    }
  };

  return (
    <div
      className={cn('min-h-screen', t.page)}
      style={{ ['--brand' as string]: brand.color, ['--brand-dark' as string]: darken(brand.color, 0.35) } as React.CSSProperties}
    >
      <header className={cn('sticky top-0 z-30 border-b backdrop-blur-md', t.topbar)}>
        <div className="max-w-6xl mx-auto h-16 px-5 sm:px-8 flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="size-10 rounded-lg object-contain bg-white" />
          ) : (
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
              <UtensilsCrossed className="size-5" />
            </span>
          )}
          <span className={cn('flex-1 min-w-0 truncate text-lg', t.heading)}>{brand.name}</span>
          <a href={quoteUrl} {...linkTarget} className={cn('inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition', t.radius)}>
            Orçamento
          </a>
        </div>
      </header>

      {/* Capa */}
      <section className="relative isolate overflow-hidden min-h-[min(78svh,860px)] flex items-end">
        {c.hero.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.hero.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
          </>
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)]">
            <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-white/10" />
            <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-white/5" />
          </div>
        )}
        <div className="w-full max-w-6xl mx-auto px-5 sm:px-8 pb-14 sm:pb-20 pt-24 text-white">
          {place && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur-sm">
              <MapPin className="size-4" /> {place}
            </p>
          )}
          <h1 className={cn('mt-4 max-w-3xl text-4xl sm:text-6xl leading-[1.05] text-white', t.heading)}>{c.hero.title || brand.name}</h1>
          {c.hero.subtitle && <p className="mt-5 max-w-2xl text-lg sm:text-xl text-white/85">{c.hero.subtitle}</p>}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href={quoteUrl} {...linkTarget} className={ctaPrimary}>
              <Send className="size-5" /> Pedir orçamento
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={ctaWhats}>
                <MessageCircle className="size-5" /> Falar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {visible.map((s, i) => renderSection(s.key, i))}

      <footer className={cn('py-8 text-center text-sm', t.muted)}>
        © {new Date().getFullYear()} {brand.name}
      </footer>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Conversar no WhatsApp"
          className="fixed bottom-5 right-5 z-40 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/25 transition hover:scale-105"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <MessageCircle className="size-7" />
        </a>
      )}

      {lightbox !== null && c.gallery[lightbox] && (
        <Lightbox images={c.gallery} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">{children}</p>;
}

function SectionHead({ eyebrow, title, heading }: { eyebrow: string; title: string; heading: string }) {
  return (
    <div className="mb-10 sm:mb-14 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className={cn('mt-2 text-3xl sm:text-4xl', heading)}>{title}</h2>
    </div>
  );
}

function Lightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: { url: string; caption: string }[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const go = useCallback((d: number) => onChange((index + d + images.length) % images.length), [index, images.length, onChange]);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const img = images[index];
  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}
    >
      <div className="flex items-center justify-between p-3 text-white/80 text-sm">
        <span className="pl-2">{index + 1} / {images.length}</span>
        <button type="button" onClick={onClose} className="size-11 rounded-full flex items-center justify-center hover:bg-white/10" aria-label="Fechar">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.caption} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        {images.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 hidden sm:flex size-12 rounded-full bg-white/10 text-white items-center justify-center hover:bg-white/20" aria-label="Anterior">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 hidden sm:flex size-12 rounded-full bg-white/10 text-white items-center justify-center hover:bg-white/20" aria-label="Próxima">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <p className="min-h-14 px-6 py-4 text-center text-white/85">{img.caption}</p>
    </div>
  );
}
