import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminClient } from '@/lib/server-supabase';
import { computeAccess, safeColor } from '@/lib/tenant';
import { isValidSlug } from '@/lib/leads';
import { SHOWCASE_MENU_SELECT, SHOWCASE_MENU_SELECT_BASIC, normalizeShowcase, pickMenus, toShowcaseMenus, type ShowcaseMenu } from '@/lib/showcase';
import { libraryMenu } from '@/lib/menu-library';
import { ShowcaseView, type ShowcaseData } from '@/components/showcase/ShowcaseView';

export const dynamic = 'force-dynamic';

/** Carrega a vitrine publicada de um buffet ativo (null = 404). Compartilhado entre metadata e página. */
const loadShowcase = cache(async (slug: string): Promise<ShowcaseData | null> => {
  if (!isValidSlug(slug)) return null;
  const db = adminClient();
  const { data: t, error } = await db
    .from('tenants')
    .select('id, name, slug, logo_url, primary_color, phone, city, state, status, valid_until')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!t || computeAccess({ status: t.status, valid_until: t.valid_until }, false) !== 'ativo') return null;

  const { data: s, error: sErr } = await db.from('tenant_showcase').select('content, published').eq('tenant_id', t.id).maybeSingle();
  if (sErr) {
    if (sErr.code === 'PGRST205') return null; // migração 0008 ainda não executada
    throw sErr;
  }
  if (!s?.published) return null;

  const content = normalizeShowcase(s.content, t.name);
  let menus: ShowcaseMenu[] = [];
  if (content.sections.some((x) => x.key === 'menus' && x.enabled)) {
    const query = (cols: string) => db.from('menu_templates').select(cols).eq('tenant_id', t.id).order('name');
    let res = await query(SHOWCASE_MENU_SELECT);
    if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703')) res = await query(SHOWCASE_MENU_SELECT_BASIC); // migração 0009 pendente
    if (res.error) throw res.error;
    menus = pickMenus(toShowcaseMenus((res.data ?? []) as never[], (k) => libraryMenu(k)?.image ?? null), content.menuIds);
  }

  return {
    brand: { name: t.name, slug: t.slug, logoUrl: t.logo_url ?? null, color: safeColor(t.primary_color) },
    phone: t.phone ?? null,
    city: t.city ?? null,
    state: t.state ?? null,
    content,
    menus,
  };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadShowcase(slug);
  if (!data) return { title: 'Página indisponível', robots: { index: false } };
  const { brand, content } = data;
  const description = content.hero.subtitle || content.about.text.slice(0, 160) || `Conheça o ${brand.name}.`;
  // a foto de capa vira a prévia do link no WhatsApp/Instagram
  const image = content.hero.image || content.gallery[0]?.url || brand.logoUrl;
  return {
    title: brand.name,
    description,
    openGraph: {
      title: brand.name,
      description,
      type: 'website',
      locale: 'pt_BR',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: brand.name, description },
  };
}

export default async function ShowcasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadShowcase(slug);
  return data ? <ShowcaseView data={data} /> : notFound();
}
