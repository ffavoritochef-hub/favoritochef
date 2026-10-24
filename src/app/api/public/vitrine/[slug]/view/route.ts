import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server-supabase';
import { isValidSlug } from '@/lib/leads';
import { clientIp, rateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless/i;

/** Conta 1 visita na vitrine. Mesma pessoa conta no máximo 1 vez a cada 30 min. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug) || BOT.test(req.headers.get('user-agent') || '')) return new NextResponse(null, { status: 204 });
  if (rateLimited('vitrine-view', `${clientIp(req)}:${slug}`, 1, 30 * 60 * 1000)) return new NextResponse(null, { status: 204 });
  try {
    const db = adminClient();
    const { data: t } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (t) {
      const { error } = await db.rpc('showcase_track_view', { tid: t.id });
      if (error) throw error;
    }
  } catch (e) {
    console.error('vitrine view', e);
  }
  return new NextResponse(null, { status: 204 });
}
