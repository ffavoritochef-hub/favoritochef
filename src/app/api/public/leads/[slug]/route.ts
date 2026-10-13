import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server-supabase';
import { computeAccess, safeColor } from '@/lib/tenant';
import { EVENT_TYPES, isValidSlug, normalizeSource, parseLeadInput } from '@/lib/leads';

export const dynamic = 'force-dynamic';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const NOT_FOUND = { error: 'Buffet não encontrado.' };

async function loadTenant(slug: string) {
  if (!isValidSlug(slug)) return null;
  const { data, error } = await adminClient()
    .from('tenants')
    .select('id, name, logo_url, primary_color, phone, status, valid_until')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data || computeAccess({ status: data.status, valid_until: data.valid_until }, false) !== 'ativo') return null;
  return data;
}

// Limite simples por IP (processo único na VPS): 5 envios a cada 10 minutos.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const t = await loadTenant(slug);
    if (!t) return NextResponse.json(NOT_FOUND, { status: 404 });
    return NextResponse.json(
      {
        brand: { name: t.name, logoUrl: t.logo_url ?? null, color: safeColor(t.primary_color) },
        phone: t.phone ?? null,
        eventTypes: EVENT_TYPES,
      },
      noStore
    );
  } catch (e) {
    console.error('lead GET', e);
    return NextResponse.json({ error: 'Erro ao carregar o formulário.' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  // Campo invisível: robôs preenchem, pessoas não. Finge sucesso.
  if (String(body.website ?? '').trim()) return NextResponse.json({ ok: true }, noStore);

  const parsed = parseLeadInput(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Muitos envios seguidos. Tente novamente em alguns minutos.' }, { status: 429 });
  }

  try {
    const t = await loadTenant(slug);
    if (!t) return NextResponse.json(NOT_FOUND, { status: 404 });
    const { error } = await adminClient()
      .from('leads')
      .insert({ ...parsed.lead, tenant_id: t.id, source: normalizeSource(body.source) });
    if (error) throw error;
    return NextResponse.json({ ok: true }, noStore);
  } catch (e) {
    console.error('lead POST', e);
    return NextResponse.json({ error: 'Não foi possível enviar. Tente novamente.' }, { status: 500 });
  }
}
