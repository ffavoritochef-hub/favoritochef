// Regras puras da Vitrine (sem dependências de React/Supabase) — testáveis em Node.

export const SHOWCASE_BUCKET = 'tenant-showcase';

export type ShowcaseTheme = 'classico' | 'moderno' | 'festivo';

export const SHOWCASE_THEMES: Record<ShowcaseTheme, { label: string; hint: string }> = {
  classico: { label: 'Clássico', hint: 'Fundo creme e títulos elegantes' },
  moderno: { label: 'Moderno', hint: 'Branco, limpo e direto' },
  festivo: { label: 'Festivo', hint: 'Colorido e descontraído' },
};

export type SectionKey = 'about' | 'gallery' | 'events' | 'menus' | 'testimonials' | 'contact';

export const SECTION_META: Record<SectionKey, { label: string; defaultTitle: string; hint: string }> = {
  about: { label: 'Sobre', defaultTitle: 'Quem somos', hint: 'A história e os diferenciais do buffet' },
  gallery: { label: 'Galeria', defaultTitle: 'Nossos eventos', hint: 'Fotos de eventos, mesas e pratos' },
  events: { label: 'Tipos de evento', defaultTitle: 'Eventos que realizamos', hint: 'Casamento, aniversário, corporativo...' },
  menus: { label: 'Cardápios', defaultTitle: 'Nossos cardápios', hint: 'Puxados do seu cadastro de cardápios' },
  testimonials: { label: 'Depoimentos', defaultTitle: 'O que dizem nossos clientes', hint: 'Elogios de quem já fez evento' },
  contact: { label: 'Contato', defaultTitle: 'Vamos fazer seu evento?', hint: 'Chamada final com orçamento e WhatsApp' },
};

export const SECTION_KEYS = Object.keys(SECTION_META) as SectionKey[];

export const SHOWCASE_LIMITS = {
  gallery: 30,
  events: 8,
  testimonials: 10,
  title: 80,
  subtitle: 200,
  caption: 120,
  text: 1500,
  shortText: 400,
};

export interface ShowcaseImage {
  url: string;
  caption: string;
}

export interface ShowcaseEventType {
  title: string;
  text: string;
  image: string | null;
}

export interface ShowcaseTestimonial {
  name: string;
  event: string;
  text: string;
}

export interface ShowcaseSection {
  key: SectionKey;
  enabled: boolean;
  title: string;
}

export interface ShowcaseContent {
  theme: ShowcaseTheme;
  hero: { title: string; subtitle: string; image: string | null };
  about: { text: string; image: string | null };
  gallery: ShowcaseImage[];
  events: ShowcaseEventType[];
  /** Cardápios exibidos. Vazio = todos os ativos. */
  menuIds: string[];
  testimonials: ShowcaseTestimonial[];
  contact: { text: string; instagram: string };
  sections: ShowcaseSection[];
}

/** Cardápio como aparece na vitrine. */
export interface ShowcaseMenu {
  id: string;
  name: string;
  description: string | null;
  items: string[];
}

export function defaultShowcase(name = ''): ShowcaseContent {
  return {
    theme: 'classico',
    hero: {
      title: name,
      subtitle: 'Buffet completo para casamentos, aniversários e eventos corporativos.',
      image: null,
    },
    about: { text: '', image: null },
    gallery: [],
    events: [],
    menuIds: [],
    testimonials: [],
    contact: { text: 'Conte como você imagina o seu evento e receba uma proposta personalizada.', instagram: '' },
    sections: SECTION_KEYS.map((key) => ({ key, enabled: key !== 'testimonials', title: SECTION_META[key].defaultTitle })),
  };
}

// ---------- Normalização (o conteúdo vem de um JSONB editável) ----------

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const isImageUrl = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 500 && /^https:\/\/[^\s"'<>]+$/.test(v);

const img = (v: unknown): string | null => (isImageUrl(v) ? v : null);

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** "@Buffet.X", "instagram.com/buffet.x/" → "buffet.x" */
export function normalizeInstagram(v: unknown): string {
  const s = str(v, 120)
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : '';
}

export function normalizeShowcase(raw: unknown, name = ''): ShowcaseContent {
  const base = defaultShowcase(name);
  if (!isObj(raw)) return base;
  const L = SHOWCASE_LIMITS;
  const hero = isObj(raw.hero) ? raw.hero : {};
  const about = isObj(raw.about) ? raw.about : {};
  const contact = isObj(raw.contact) ? raw.contact : {};

  const seen = new Set<SectionKey>();
  const sections: ShowcaseSection[] = [];
  for (const s of arr(raw.sections)) {
    if (!isObj(s) || !SECTION_KEYS.includes(s.key as SectionKey) || seen.has(s.key as SectionKey)) continue;
    const key = s.key as SectionKey;
    seen.add(key);
    sections.push({ key, enabled: s.enabled !== false, title: str(s.title, L.title) || SECTION_META[key].defaultTitle });
  }
  for (const s of base.sections) if (!seen.has(s.key)) sections.push(s);

  return {
    theme: typeof raw.theme === 'string' && raw.theme in SHOWCASE_THEMES ? (raw.theme as ShowcaseTheme) : base.theme,
    hero: {
      title: str(hero.title, L.title) || base.hero.title,
      subtitle: typeof hero.subtitle === 'string' ? str(hero.subtitle, L.subtitle) : base.hero.subtitle,
      image: img(hero.image),
    },
    about: { text: str(about.text, L.text), image: img(about.image) },
    gallery: arr(raw.gallery)
      .filter(isObj)
      .filter((g) => isImageUrl(g.url))
      .slice(0, L.gallery)
      .map((g) => ({ url: g.url as string, caption: str(g.caption, L.caption) })),
    events: arr(raw.events)
      .filter(isObj)
      .map((e) => ({ title: str(e.title, L.title), text: str(e.text, L.shortText), image: img(e.image) }))
      .filter((e) => e.title)
      .slice(0, L.events),
    menuIds: arr(raw.menuIds).filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(0, 50),
    testimonials: arr(raw.testimonials)
      .filter(isObj)
      .map((t) => ({ name: str(t.name, L.title), event: str(t.event, L.title), text: str(t.text, L.shortText) }))
      .filter((t) => t.name && t.text)
      .slice(0, L.testimonials),
    contact: {
      text: typeof contact.text === 'string' ? str(contact.text, L.shortText) : base.contact.text,
      instagram: normalizeInstagram(contact.instagram),
    },
    sections,
  };
}

/** Todas as fotos usadas no conteúdo (para apagar do storage as que saíram). */
export function showcaseImageUrls(c: ShowcaseContent): string[] {
  return [c.hero.image, c.about.image, ...c.gallery.map((g) => g.url), ...c.events.map((e) => e.image)].filter(
    (u): u is string => !!u
  );
}

/** Caminho dentro do bucket a partir da URL pública (null se não for do bucket da vitrine). */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${SHOWCASE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

/** Cardápios que a vitrine mostra: os escolhidos (na ordem do cadastro) ou todos. */
export function pickMenus<T extends { id: string }>(menus: T[], ids: string[]): T[] {
  if (!ids.length) return menus;
  const wanted = new Set(ids);
  return menus.filter((m) => wanted.has(m.id));
}
