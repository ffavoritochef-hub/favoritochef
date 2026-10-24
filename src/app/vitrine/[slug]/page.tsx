import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminClient } from '@/lib/server-supabase';
import { computeAccess, safeColor } from '@/lib/tenant';
import { isValidSlug } from '@/lib/leads';
import { normalizeShowcase, pickMenus, type ShowcaseMenu } from '@/lib/showcase';
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
    const { data: m, error: mErr } = await db
      .from('menu_templates')
      .select('id, name, description, is_active, items:menu_template_items(custom_item_name)')
      .eq('tenant_id', t.id)
      .order('name');
    if (mErr) throw mErr;
    menus = pickMenus(
      (m ?? [])
        .filter((x) => x.is_active !== false)
        .map((x) => ({
          id: String(x.id),
          name: x.name,
          description: x.description || null,
          items: ((x.items as { custom_item_name: string | null }[] | null) ?? [])
            .map((i) => i.custom_item_name?.trim())
            .filter((n): n is string => !!n),
        })),
      content.menuIds
    );
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
