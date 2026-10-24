import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server-supabase';
import { computeAccess } from '@/lib/tenant';
import { rateLimited } from '@/lib/rate-limit';
import { GeminiError, geminiJson, type GeminiImage } from '@/lib/gemini';
import { SHOWCASE_BUCKET, SHOWCASE_LIMITS as L } from '@/lib/showcase';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_IMAGES = 12;

const RULES = `Regras:
- Escreva em português do Brasil, tom acolhedor, elegante e direto, sem exageros nem clichês em excesso.
- NÃO invente fatos: nada de anos de experiência, número de eventos, prêmios, nomes de pessoas ou endereços que não foram informados.
- Não use emojis, hashtags nem aspas no início/fim dos textos.`;

const GENERATE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    heroTitle: { type: 'STRING', description: 'Título curto da capa (até 60 caracteres)' },
    heroSubtitle: { type: 'STRING', description: 'Frase de apresentação da capa (até 160 caracteres)' },
    aboutText: { type: 'STRING', description: 'Texto "Quem somos", 2 a 3 parágrafos curtos separados por linha em branco' },
    contactText: { type: 'STRING', description: 'Chamada final convidando a pedir orçamento (até 200 caracteres)' },
    coverIndex: { type: 'INTEGER', description: 'Índice da foto mais bonita para a capa (de preferência horizontal)' },
    photos: {
      type: 'ARRAY',
      description: 'Todas as fotos da galeria, na ordem sugerida para exibir (as mais impactantes primeiro)',
      items: {
        type: 'OBJECT',
        properties: {
          index: { type: 'INTEGER' },
          caption: { type: 'STRING', description: 'Legenda curta e descritiva do que aparece na foto (até 70 caracteres)' },
        },
        required: ['index', 'caption'],
      },
    },
    events: {
      type: 'ARRAY',
      description: 'Até 4 tipos de evento que o buffet atende, com descrição curta',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, text: { type: 'STRING', description: 'Até 140 caracteres' } },
        required: ['title', 'text'],
      },
    },
  },
  required: ['heroTitle', 'heroSubtitle', 'aboutText', 'contactText', 'coverIndex', 'photos', 'events'],
};

const IMPROVE_SCHEMA = {
  type: 'OBJECT',
  properties: { text: { type: 'STRING' } },
  required: ['text'],
};

const FIELDS: Record<string, { label: string; max: number }> = {
  'hero.title': { label: 'título da capa da página', max: L.title },
  'hero.subtitle': { label: 'frase de apresentação da capa (uma frase)', max: L.subtitle },
  'about.text': { label: 'texto "Quem somos" (2 a 3 parágrafos curtos)', max: L.text },
  'contact.text': { label: 'chamada final convidando a pedir orçamento (uma ou duas frases)', max: L.shortText },
  'event.text': { label: 'descrição curta de um tipo de evento (uma frase)', max: L.shortText },
};

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function loadImages(urls: string[], prefix: string): Promise<{ url: string; image: GeminiImage }[]> {
  const out: { url: string; image: GeminiImage }[] = [];
  for (const url of urls) {
    // só fotos do próprio buffet no storage da vitrine (evita buscar URLs arbitrárias)
    if (typeof url !== 'string' || !url.startsWith(prefix)) continue;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;
      const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
      if (!mimeType.startsWith('image/')) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 6 * 1024 * 1024) continue;
      out.push({ url, image: { mimeType, data: buf.toString('base64') } });
    } catch {
      // foto inacessível: segue sem ela
    }
  }
  return out;
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Sessão expirada ou inválida. Saia e entre novamente.' }, { status: 401 });

  const { data: tenant } = await auth.db
    .from('tenants')
    .select('id, name, city, state, status, valid_until')
    .eq('owner_id', auth.user.id)
    .maybeSingle();
  if (!tenant || computeAccess(tenant, false) !== 'ativo') {
    return NextResponse.json({ error: 'Buffet sem acesso ativo.' }, { status: 403 });
  }
  if (rateLimited('showcase-ai', tenant.id, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Muitos pedidos à IA na última hora. Tente mais tarde.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const place = [tenant.city, tenant.state].filter(Boolean).join(' - ');
  const about = `Buffet: ${tenant.name}${place ? `\nCidade: ${place}` : ''}`;

  try {
    if (body.mode === 'improve') {
      const field = FIELDS[body.field as string];
      if (!field) return NextResponse.json({ error: 'Campo inválido.' }, { status: 400 });
      const current = clip(body.text, 2000);
      const context = clip(body.context, 300);
      const prompt = `Você escreve textos para a página de apresentação de um buffet de eventos.
${about}${context ? `\nContexto: ${context}` : ''}

Tarefa: ${current ? `reescreva e melhore o texto abaixo, mantendo as informações dele` : 'escreva'} o ${field.label}, com no máximo ${field.max} caracteres.
${current ? `\nTexto atual:\n${current}\n` : ''}
${RULES}`;
      const out = await geminiJson<{ text: string }>(prompt, IMPROVE_SCHEMA);
      const text = clip(out.text, field.max);
      if (!text) throw new GeminiError('A IA não conseguiu escrever esse texto. Tente de novo.', 502);
      return NextResponse.json({ text });
    }

    if (body.mode === 'generate') {
      const a = body.answers ?? {};
      const kind = clip(a.kind, 200);
      const highlight = clip(a.highlight, 300);
      const extra = clip(a.extra, 500);
      const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SHOWCASE_BUCKET}/${tenant.id}/`;
      const urls: string[] = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
      const imgs = await loadImages(urls, prefix);

      const prompt = `Você monta a página de apresentação (vitrine) de um buffet de eventos, que o dono vai mandar para clientes.
${about}
Tipo de buffet / eventos que atende: ${kind || 'não informado'}
Principal diferencial: ${highlight || 'não informado'}${extra ? `\nOutras informações: ${extra}` : ''}

${imgs.length ? `Seguem ${imgs.length} fotos do buffet, numeradas de 0 a ${imgs.length - 1} na ordem enviada. Olhe cada uma: escreva uma legenda descritiva para todas, sugira a melhor ordem e escolha a melhor foto de capa.` : 'Nenhuma foto foi enviada: devolva "photos" vazio e coverIndex -1.'}
Use o que você vê nas fotos (tipo de evento, decoração, pratos) para deixar os textos mais concretos.

${RULES}`;

      const out = await geminiJson<{
        heroTitle: string;
        heroSubtitle: string;
        aboutText: string;
        contactText: string;
        coverIndex: number;
        photos: { index: number; caption: string }[];
        events: { title: string; text: string }[];
      }>(prompt, GENERATE_SCHEMA, imgs.map((i) => i.image));

      const seen = new Set<number>();
      const photos = (Array.isArray(out.photos) ? out.photos : [])
        .filter((p) => Number.isInteger(p.index) && p.index >= 0 && p.index < imgs.length && !seen.has(p.index) && seen.add(p.index))
        .map((p) => ({ url: imgs[p.index].url, caption: clip(p.caption, L.caption) }));

      return NextResponse.json({
        heroTitle: clip(out.heroTitle, L.title),
        heroSubtitle: clip(out.heroSubtitle, L.subtitle),
        aboutText: clip(out.aboutText, L.text),
        contactText: clip(out.contactText, L.shortText),
        cover: Number.isInteger(out.coverIndex) && imgs[out.coverIndex] ? imgs[out.coverIndex].url : null,
        photos,
        events: (Array.isArray(out.events) ? out.events : [])
          .map((e) => ({ title: clip(e.title, L.title), text: clip(e.text, L.shortText) }))
          .filter((e) => e.title)
          .slice(0, L.events),
      });
    }

    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  } catch (e) {
    if (e instanceof GeminiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('showcase ai', e);
    return NextResponse.json({ error: 'Erro ao falar com a IA.' }, { status: 500 });
  }
}
