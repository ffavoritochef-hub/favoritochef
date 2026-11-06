'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, MapPin, MessageCircle, PartyPopper, Play, Quote, Send, Star, UtensilsCrossed, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { darken } from '@/lib/tenant';
import { whatsappUrl } from '@/lib/leads';
import { SECTION_META, type SectionKey, type ShowcaseContent, type ShowcaseMenu, type ShowcaseTheme } from '@/lib/showcase';
import { playfair, poppins } from './fonts';

export interface ShowcaseData {
  brand: { name: string; slug: string; logoUrl: string | null; color: string };
  phone: string | null;
  city: string | null;
  state: string | null;
  content: ShowcaseContent;
  menus: ShowcaseMenu[];
}

const SECTION_ID: Record<SectionKey, string> = {
  about: 'sobre',
  gallery: 'galeria',
  videos: 'videos',
  events: 'eventos',
  menus: 'cardapios',
  testimonials: 'depoimentos',
  contact: 'contato',
};

/** Classes de cada estilo. A cor do buffet entra via --brand / --brand-dark. */
const THEME_STYLE: Record<
  ShowcaseTheme,
  { page: string; alt: string; heading: string; muted: string; card: string; radius: string; topbar: string; dark: string }
> = {
  classico: {
    page: 'bg-[#FBF8F3] text-stone-800',
    alt: 'bg-white',
    heading: cn(playfair.className, 'font-medium tracking-[-0.01em] text-stone-900'),
    muted: 'text-stone-500',
    card: 'bg-white ring-1 ring-stone-200/70 shadow-[0_24px_48px_-32px_rgba(41,37,36,0.45)]',
    radius: 'rounded-xl',
    topbar: 'bg-[#FBF8F3]/90 border-stone-200/70 text-stone-800',
    dark: 'bg-stone-950',
  },
  moderno: {
    page: 'bg-white text-slate-800',
    alt: 'bg-slate-50',
    heading: 'font-extrabold tracking-tight text-slate-900',
    muted: 'text-slate-500',
    card: 'bg-white ring-1 ring-slate-200',
    radius: 'rounded-xl',
    topbar: 'bg-white/90 border-slate-200 text-slate-800',
    dark: 'bg-slate-950',
  },
  festivo: {
    page: 'bg-[#FFF6F0] text-slate-800',
    alt: 'bg-white',
    heading: cn(poppins.className, 'font-bold text-slate-900'),
    muted: 'text-slate-500',
    card: 'bg-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]',
    radius: 'rounded-3xl',
    topbar: 'bg-white/90 border-orange-100 text-slate-800',
    dark: 'bg-slate-900',
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
  const [videoOpen, setVideoOpen] = useState<number | null>(null);
  const heroImages = [c.hero.image, ...c.hero.slides].filter((u): u is string => !!u);
  const [heroSlide, setHeroIndex] = useState(0);
  const heroIndex = heroSlide < heroImages.length ? heroSlide : 0;
  const [scrolled, setScrolled] = useState(false);

  const heroVideo = c.hero.video;
  // capa em carrossel: troca a foto a cada 6 s (com vídeo de fundo, o vídeo manda)
  useEffect(() => {
    if (heroImages.length < 2 || heroVideo) return;
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % heroImages.length), 6000);
    return () => clearInterval(id);
  }, [heroImages.length, heroVideo]);

  // barra do topo: transparente sobre a capa, sólida ao rolar (na prévia fica sempre sólida)
  useEffect(() => {
    if (preview) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [preview]);
  const solidBar = preview || scrolled;

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
    videos: c.videos.length > 0,
    events: c.events.length > 0,
    menus: menus.length > 0,
    testimonials: c.testimonials.length > 0,
    contact: true,
  };
  const visible = c.sections.filter((s) => s.enabled && hasContent[s.key]);
  // a chamada final usa a capa como fundo; o "sobre" sem foto própria aproveita uma da galeria
  const aboutImage = c.about.image || c.gallery[0]?.url || null;
  const contactImage = heroImages[0] || c.gallery[0]?.url || null;

  const btn = cn('inline-flex items-center justify-center gap-2 min-h-[52px] px-7 text-[15px] font-semibold tracking-wide transition', t.radius);
  const ctaPrimary = cn(btn, 'text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] shadow-lg shadow-black/20');
  const ctaGhost = cn(btn, 'text-white ring-1 ring-inset ring-white/50 bg-white/5 backdrop-blur-sm hover:bg-white/15');

  const renderSection = (key: SectionKey, i: number) => {
    const bg = i % 2 === 0 ? t.alt : '';
    switch (key) {
      case 'about':
        return (
          <section key={key} id="sobre" className={cn('scroll-mt-16 py-20 sm:py-28', bg)}>
            <div className={cn('max-w-6xl mx-auto px-5 sm:px-8 grid gap-12 items-center', aboutImage && 'md:grid-cols-[1fr_1.1fr] md:gap-20')}>
              {aboutImage && (
                <div className="relative mx-auto w-full max-w-md md:max-w-none">
                  <div className={cn('absolute inset-0 translate-x-3 translate-y-3 sm:translate-x-5 sm:translate-y-5 border border-[var(--brand)]/40', t.radius)} aria-hidden="true" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aboutImage} alt={brand.name} loading="lazy" className={cn('relative w-full aspect-[4/5] object-cover shadow-2xl shadow-black/20', t.radius)} />
                </div>
              )}
              <div className={cn(!aboutImage && 'max-w-3xl mx-auto text-center')}>
                <Eyebrow>Sobre nós</Eyebrow>
                <h2 className={cn('text-3xl sm:text-5xl mt-3 leading-tight', t.heading)}>{title('about')}</h2>
                <Ornament className={cn('mt-6', !aboutImage && 'justify-center')} />
                {c.about.text && <AboutText text={c.about.text} muted={t.muted} />}
                <a href={quoteUrl} {...linkTarget} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)] hover:text-[var(--brand-dark)]">
                  Solicite uma proposta <ChevronRight className="size-4" />
                </a>
              </div>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section key={key} id="galeria" className={cn('scroll-mt-16 py-20 sm:py-28', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Galeria" title={title('gallery')} heading={t.heading} />
              {c.galleryLayout === 'carrossel' ? (
                <Carousel images={c.gallery} radius={t.radius} onOpen={setLightbox} />
              ) : c.galleryLayout === 'grade' ? (
                // blocos de 6 fotos: 1 grande (2x2) + 5 pequenas = 3 linhas cheias; a grande alterna de lado
                <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[160px] sm:auto-rows-[230px] grid-flow-dense gap-2 sm:gap-3">
                  {c.gallery.map((g, gi) => (
                    <GalleryTile
                      key={g.url + gi}
                      g={g}
                      alt={brand.name}
                      onOpen={() => setLightbox(gi)}
                      className={cn(
                        t.radius,
                        gi % 6 === 0 && 'col-span-2 row-span-2',
                        gi % 6 === 0 && Math.floor(gi / 6) % 2 === 1 && 'md:col-start-2'
                      )}
                      label={gi + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="columns-2 md:columns-3 gap-2 sm:gap-3">
                  {c.gallery.map((g, gi) => (
                    <button
                      key={g.url + gi}
                      type="button"
                      onClick={() => setLightbox(gi)}
                      className={cn('group relative mb-2 sm:mb-3 block w-full overflow-hidden break-inside-avoid', t.radius)}
                      aria-label={g.caption || `Foto ${gi + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.caption || brand.name} loading="lazy" className="w-full h-auto transition duration-700 group-hover:scale-[1.04]" />
                      <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                      {g.caption && (
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-left text-sm text-white">
                          {g.caption}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'videos':
        return (
          <section key={key} id="videos" className={cn('scroll-mt-16 py-20 sm:py-28', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Vídeos" title={title('videos')} heading={t.heading} />
              <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
                {c.videos.map((v, vi) => (
                  <button
                    key={v.url + vi}
                    type="button"
                    onClick={() => setVideoOpen(vi)}
                    className={cn(
                      'group relative isolate overflow-hidden aspect-[9/16] bg-black shadow-xl shadow-black/15',
                      'w-[calc(50%-0.375rem)] sm:w-[250px] lg:w-[270px]',
                      t.radius
                    )}
                    aria-label={v.caption || `Vídeo ${vi + 1}`}
                  >
                    <AutoVideo src={v.url} className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm opacity-80 transition group-hover:opacity-100">
                      <Play className="size-4 fill-current" />
                    </span>
                    {v.caption && <span className="absolute inset-x-0 bottom-0 p-4 text-left text-sm font-medium text-white">{v.caption}</span>}
                  </button>
                ))}
              </div>
            </div>
          </section>
        );

      case 'events':
        return (
          <section key={key} id="eventos" className={cn('scroll-mt-16 py-20 sm:py-28', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Eventos" title={title('events')} heading={t.heading} />
              <div className={cn('grid gap-4 sm:gap-5 sm:grid-cols-2', c.events.length % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                {c.events.map((e, ei) => (
                  <article key={ei} className={cn('group relative isolate overflow-hidden aspect-[4/5] flex flex-col justify-end text-white shadow-xl shadow-black/10', t.radius)}>
                    {e.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.image} alt={e.title} loading="lazy" className="absolute inset-0 -z-20 size-full object-cover transition duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 -z-20 flex items-center justify-center bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white/30">
                        <PartyPopper className="size-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-black/0" />
                    <div className="p-6">
                      <span className="block h-px w-10 bg-white/70 transition-all duration-500 group-hover:w-16" />
                      <h3 className={cn('mt-4 text-2xl text-white', t.heading, 'text-white')}>{e.title}</h3>
                      {e.text && <p className="mt-2 text-[15px] leading-relaxed text-white/80">{e.text}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'menus':
        return (
          <section key={key} id="cardapios" className={cn('scroll-mt-16 py-20 sm:py-28', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Cardápios" title={title('menus')} heading={t.heading} />
              <div className={cn('grid gap-6 sm:gap-8', menus.length > 1 && 'md:grid-cols-2')}>
                {menus.map((m) => {
                  const shown = m.items.slice(0, 12);
                  return (
                    <article key={m.id} className={cn('overflow-hidden flex flex-col', t.card, t.radius, menus.length === 1 && 'max-w-2xl w-full mx-auto')}>
                      {m.image && (
                        <div className="relative aspect-[16/9]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.image} alt={m.name} loading="lazy" className="absolute inset-0 size-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          {m.imageCredit && (
                            <span className="absolute bottom-1 right-2 text-[10px] text-white/80 drop-shadow">{m.imageCredit}</span>
                          )}
                        </div>
                      )}
                      <div className="p-7 sm:p-9 flex-1 flex flex-col text-center">
                        {!m.image && (
                          <span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                            <UtensilsCrossed className="size-5" />
                          </span>
                        )}
                        <h3 className={cn('text-2xl sm:text-[1.7rem]', t.heading)}>{m.name}</h3>
                        {m.description && <p className={cn('mt-2 mx-auto max-w-md leading-relaxed', t.muted)}>{m.description}</p>}
                        <Ornament className="mt-5 justify-center" />
                        {shown.length > 0 && (
                          <ul className="mt-5 grid gap-x-8 sm:grid-cols-2 text-left">
                            {shown.map((it, ii) => (
                              <li key={ii} className="flex items-baseline gap-3 border-b border-dashed border-current/10 py-2.5 text-[15px]">
                                <span className="size-1 shrink-0 translate-y-[-3px] rotate-45 bg-[var(--brand)]" />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {m.items.length > shown.length && (
                          <p className={cn('mt-4 text-sm italic', t.muted)}>e mais {m.items.length - shown.length} {m.items.length - shown.length === 1 ? 'item' : 'itens'}</p>
                        )}
                        <a
                          href={quoteUrl}
                          {...linkTarget}
                          className={cn('mt-auto pt-7 self-center inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand)] hover:text-[var(--brand-dark)]')}
                        >
                          Orçamento com este cardápio <ChevronRight className="size-4" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section key={key} id="depoimentos" className={cn('scroll-mt-16 py-20 sm:py-28', bg)}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <SectionHead eyebrow="Depoimentos" title={title('testimonials')} heading={t.heading} />
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {c.testimonials.map((d, di) => (
                  <figure key={di} className={cn('p-7 sm:p-8 flex flex-col', t.card, t.radius)}>
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
          <section key={key} id="contato" className={cn('scroll-mt-16 relative isolate overflow-hidden py-24 sm:py-32 text-white', t.dark)}>
            {c.contact.video ? (
              <>
                <AutoVideo src={c.contact.video} poster={contactImage} className="absolute inset-0 -z-20 size-full object-cover opacity-45" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/45 to-black/80" />
              </>
            ) : contactImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={contactImage} alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover opacity-40" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />
              </>
            ) : (
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)]" />
            )}
            <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
              <Eyebrow light>Orçamento sem compromisso</Eyebrow>
              <h2 className={cn('mt-3 text-3xl sm:text-5xl leading-tight', t.heading, 'text-white')}>{title('contact')}</h2>
              <Ornament light className="mt-6 justify-center" />
              {c.contact.text && <p className="mt-6 text-lg leading-relaxed text-white/80 whitespace-pre-line">{c.contact.text}</p>}
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <a href={quoteUrl} {...linkTarget} className={ctaPrimary}>
                  <Send className="size-5" /> Pedir orçamento
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={ctaGhost}>
                    <MessageCircle className="size-5" /> Falar no WhatsApp
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
      className={cn('min-h-screen antialiased', t.page)}
      style={{ ['--brand' as string]: brand.color, ['--brand-dark' as string]: darken(brand.color, 0.35) } as React.CSSProperties}
    >
      <header
        className={cn(
          'sticky top-0 z-30 border-b transition-colors duration-300',
          solidBar ? cn('backdrop-blur-md shadow-sm', t.topbar) : 'border-transparent bg-transparent text-white'
        )}
      >
        <div className="max-w-6xl mx-auto h-16 px-5 sm:px-8 flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="size-10 rounded-full object-cover bg-white ring-1 ring-black/5" />
          ) : (
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--brand)] text-white">
              <UtensilsCrossed className="size-5" />
            </span>
          )}
          <span className={cn('flex-1 min-w-0 truncate text-lg', t.heading, !solidBar && 'text-white')}>{brand.name}</span>
          <nav className="hidden lg:flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.14em]" aria-label="Seções">
            {visible
              .filter((s) => s.key !== 'contact')
              .map((s) => (
                <a
                  key={s.key}
                  href={`#${SECTION_ID[s.key]}`}
                  className={cn('px-3 py-2 transition', solidBar ? cn(t.muted, 'hover:text-[var(--brand)]') : 'text-white/80 hover:text-white')}
                >
                  {SECTION_META[s.key].label}
                </a>
              ))}
          </nav>
          <a
            href={quoteUrl}
            {...linkTarget}
            className={cn(
              'inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold transition',
              t.radius,
              solidBar ? 'text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)]' : 'text-white ring-1 ring-inset ring-white/60 hover:bg-white/15'
            )}
          >
            Orçamento
          </a>
        </div>
      </header>

      {/* Capa */}
      <section className={cn('relative isolate overflow-hidden min-h-[min(92svh,900px)] flex items-center', !preview && '-mt-16')}>
        {heroVideo ? (
          <>
            <AutoVideo src={heroVideo} poster={heroImages[0] ?? null} eager className="absolute inset-0 -z-20 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35),rgba(0,0,0,0.7))]" />
            <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/60 to-transparent" />
          </>
        ) : heroImages.length > 0 ? (
          <>
            {heroImages.map((src, hi) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src + hi}
                src={src}
                alt=""
                loading={hi === 0 ? 'eager' : 'lazy'}
                className={cn(
                  'absolute inset-0 -z-20 size-full object-cover transition-[opacity,transform] duration-[1500ms] ease-out',
                  hi === heroIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                )}
              />
            ))}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35),rgba(0,0,0,0.7))]" />
            <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/60 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)]">
            <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-white/10" />
            <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-white/5" />
          </div>
        )}
        <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 py-28 text-center text-white">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="mx-auto mb-7 size-24 sm:size-28 rounded-full object-cover bg-white shadow-2xl shadow-black/40 ring-4 ring-white/20" />
          )}
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.32em] text-white/80">
            Buffet &amp; Gastronomia{place && <span className="hidden sm:inline"> · {place}</span>}
          </p>
          <h1 className={cn('mt-5 text-[2.6rem] sm:text-7xl leading-[1.04]', t.heading, 'text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]')}>
            {c.hero.title || brand.name}
          </h1>
          <Ornament light className="mt-7 justify-center" />
          {c.hero.subtitle && <p className="mt-7 mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed text-white/85">{c.hero.subtitle}</p>}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href={quoteUrl} {...linkTarget} className={ctaPrimary}>
              <Send className="size-5" /> Pedir orçamento
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={ctaGhost}>
                <MessageCircle className="size-5" /> Falar no WhatsApp
              </a>
            )}
          </div>
          {place && (
            <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/70 sm:hidden">
              <MapPin className="size-4" /> {place}
            </p>
          )}
        </div>
        {heroImages.length > 1 && !heroVideo && (
          <div className="absolute bottom-6 inset-x-0 z-10 flex justify-center gap-2">
            {heroImages.map((_, hi) => (
              <button
                key={hi}
                type="button"
                onClick={() => setHeroIndex(hi)}
                className={cn('h-1 rounded-full transition-all duration-500', hi === heroIndex ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/70')}
                aria-label={`Foto ${hi + 1} da capa`}
              />
            ))}
          </div>
        )}
        {visible.length > 1 && (
          <a href={`#${SECTION_ID[visible[0].key]}`} aria-label="Rolar para o conteúdo" className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden sm:block text-white/60 hover:text-white animate-bounce">
            <ChevronDown className="size-6" />
          </a>
        )}
      </section>

      {c.events.length > 0 && (
        <div className={cn('border-b border-current/5', t.alt)}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-6 gap-y-2 text-xs sm:text-[13px] font-medium uppercase tracking-[0.2em]">
            {c.events.map((e, ei) => (
              <span key={ei} className="inline-flex items-center gap-5 sm:gap-6">
                {ei > 0 && <span className="hidden sm:block size-1 rotate-45 bg-[var(--brand)]" aria-hidden="true" />}
                <span className={t.muted}>{e.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {visible.map((s, i) => renderSection(s.key, i))}

      <footer className={cn('text-white/70', t.dark)}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid gap-8 sm:grid-cols-[1.5fr_1fr_1fr] text-sm">
          <div>
            <div className="flex items-center gap-3">
              {brand.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt="" className="size-11 rounded-full object-cover bg-white" />
              )}
              <span className={cn('text-xl', t.heading, 'text-white')}>{brand.name}</span>
            </div>
            {c.hero.subtitle && <p className="mt-4 max-w-sm leading-relaxed text-white/60">{c.hero.subtitle}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">Navegue</p>
            <ul className="mt-4 space-y-2">
              {visible
                .filter((s) => s.key !== 'contact')
                .map((s) => (
                  <li key={s.key}>
                    <a href={`#${SECTION_ID[s.key]}`} className="hover:text-white">{SECTION_META[s.key].label}</a>
                  </li>
                ))}
              <li>
                <a href={quoteUrl} {...linkTarget} className="hover:text-white">Pedir orçamento</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">Contato</p>
            <ul className="mt-4 space-y-2">
              {place && (
                <li className="inline-flex items-center gap-2"><MapPin className="size-4" /> {place}</li>
              )}
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </li>
              )}
              {c.contact.instagram && (
                <li>
                  <a href={`https://instagram.com/${c.contact.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                    <InstagramIcon className="size-4" /> @{c.contact.instagram}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {brand.name}. Todos os direitos reservados.
        </div>
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

      {videoOpen !== null && c.videos[videoOpen] && (
        <VideoLightbox videos={c.videos} index={videoOpen} onChange={setVideoOpen} onClose={() => setVideoOpen(null)} />
      )}

      {lightbox !== null && c.gallery[lightbox] && (
        <Lightbox images={c.gallery} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

/**
 * Vídeo sempre sem som, em loop, que só toca quando aparece na tela (economiza dados no celular).
 * Com "reduzir movimento" ligado no aparelho, fica parado no primeiro quadro.
 */
function AutoVideo({ src, poster = null, eager = false, className }: { src: string; poster?: string | null; eager?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true; // garante o mudo mesmo se o atributo for ignorado
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  return (
    <video
      ref={ref}
      // #t=0.1 mostra o primeiro quadro antes de tocar (Safari não gera prévia sem isso)
      src={poster ? src : `${src}#t=0.1`}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      disablePictureInPicture
      preload={eager ? 'auto' : 'metadata'}
      aria-hidden="true"
      tabIndex={-1}
      className={cn('pointer-events-none', className)}
    />
  );
}

function VideoLightbox({
  videos,
  index,
  onChange,
  onClose,
}: {
  videos: { url: string; caption: string }[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const go = useCallback((d: number) => onChange((index + d + videos.length) % videos.length), [index, videos.length, onChange]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);
  const v = videos[index];
  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-3 text-white/80 text-sm">
        <span className="pl-2">{index + 1} / {videos.length}</span>
        <button type="button" onClick={onClose} className="size-11 rounded-full flex items-center justify-center hover:bg-white/10" aria-label="Fechar">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2" onClick={onClose}>
        <video
          key={v.url}
          src={v.url}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          className="max-h-full max-w-full rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
        {videos.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 flex size-12 rounded-full bg-white/10 text-white items-center justify-center hover:bg-white/20" aria-label="Vídeo anterior">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 flex size-12 rounded-full bg-white/10 text-white items-center justify-center hover:bg-white/20" aria-label="Próximo vídeo">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <p className="min-h-14 px-6 py-4 text-center text-white/85">{v.caption}</p>
    </div>
  );
}

/** Texto do "sobre" com o primeiro parágrafo em destaque. */
function AboutText({ text, muted }: { text: string; muted: string }) {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // texto corrido (sem parágrafos): destaca a primeira frase
  const [lead, rest] =
    parts.length > 1
      ? [parts[0], parts.slice(1)]
      : (() => {
          const m = text.match(/^(.{40,260}?[.!?])\s+([\s\S]+)$/);
          return m ? [m[1], [m[2]]] : [text, []];
        })();
  return (
    <div className="mt-7 space-y-4">
      <p className="text-xl sm:text-[1.35rem] leading-relaxed text-current">{lead}</p>
      {rest.map((p, i) => (
        <p key={i} className={cn('text-[17px] leading-relaxed whitespace-pre-line', muted)}>{p}</p>
      ))}
    </div>
  );
}

function GalleryTile({
  g,
  alt,
  onOpen,
  className,
  label,
}: {
  g: { url: string; caption: string };
  alt: string;
  onOpen: () => void;
  className?: string;
  label: number;
}) {
  return (
    <button type="button" onClick={onOpen} className={cn('group relative block overflow-hidden', className)} aria-label={g.caption || `Foto ${label}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={g.url} alt={g.caption || alt} loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.06]" />
      {g.caption && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-left text-xs sm:text-sm text-white">
          {g.caption}
        </span>
      )}
    </button>
  );
}

function Carousel({
  images,
  radius,
  onOpen,
}: {
  images: { url: string; caption: string }[];
  radius: string;
  onOpen: (i: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollTo = (i: number) => {
    const el = track.current?.children[i] as HTMLElement | undefined;
    if (el && track.current) track.current.scrollTo({ left: el.offsetLeft - track.current.offsetLeft, behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + 16 : 1;
    setActive(Math.max(0, Math.min(images.length - 1, Math.round(el.scrollLeft / step))));
  };

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((g, gi) => (
          <button
            key={g.url + gi}
            type="button"
            onClick={() => onOpen(gi)}
            className={cn('group relative shrink-0 snap-center w-[78%] sm:w-[44%] lg:w-[32%] aspect-[3/4] overflow-hidden', radius)}
            aria-label={g.caption || `Foto ${gi + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.url} alt={g.caption} loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
            {g.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10 text-left text-white">{g.caption}</span>
            )}
          </button>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollTo(Math.max(0, active - 1))}
            className="absolute left-2 top-[calc(50%-1rem)] -translate-y-1/2 hidden sm:flex size-12 rounded-full bg-white/90 text-slate-800 shadow-lg items-center justify-center hover:bg-white disabled:opacity-0"
            disabled={active === 0}
            aria-label="Foto anterior"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(images.length - 1, active + 1))}
            className="absolute right-2 top-[calc(50%-1rem)] -translate-y-1/2 hidden sm:flex size-12 rounded-full bg-white/90 text-slate-800 shadow-lg items-center justify-center hover:bg-white disabled:opacity-0"
            disabled={active === images.length - 1}
            aria-label="Próxima foto"
          >
            <ChevronRight className="size-6" />
          </button>
          <div className="mt-5 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                className={cn('h-1 rounded-full transition-all', i === active ? 'w-8 bg-[var(--brand)]' : 'w-4 bg-[var(--brand)]/25')}
                aria-label={`Ir para a foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={cn('text-xs sm:text-[13px] font-semibold uppercase tracking-[0.28em]', light ? 'text-white/75' : 'text-[var(--brand)]')}>{children}</p>
  );
}

/** Filete decorativo: linha — losango — linha. */
function Ornament({ className, light = false }: { className?: string; light?: boolean }) {
  const line = light ? 'bg-white/50' : 'bg-[var(--brand)]/40';
  return (
    <div className={cn('flex items-center gap-3', className)} aria-hidden="true">
      <span className={cn('h-px w-12', line)} />
      <span className={cn('size-1.5 rotate-45', light ? 'bg-white/80' : 'bg-[var(--brand)]')} />
      <span className={cn('h-px w-12', line)} />
    </div>
  );
}

function SectionHead({ eyebrow, title, heading }: { eyebrow: string; title: string; heading: string }) {
  return (
    <div className="mb-12 sm:mb-16 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className={cn('mt-3 text-3xl sm:text-5xl leading-tight', heading)}>{title}</h2>
      <Ornament className="mt-6 justify-center" />
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
