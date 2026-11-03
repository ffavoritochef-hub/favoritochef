import type { ProposalView, SignatureEvidence } from '@/lib/proposal';
import { signatureCode } from '@/lib/proposal';
import { formatCpf } from '@/lib/cpf';

import { safeColor } from '@/lib/tenant';

const DARK = '#0F172A';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const SOFT = '#F1F5F9';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (d: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-');
const dateTimeBR = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' }) + ' (horário de Brasília)';

function pngFromDataUrl(v: string | null): Buffer | null {
  const prefix = 'data:image/png;base64,';
  if (!v || !v.startsWith(prefix)) return null;
  return Buffer.from(v.slice(prefix.length), 'base64');
}

/** Baixa uma imagem de um bucket público do próprio projeto (PNG/JPG). Falha => null. */
async function fetchImage(url: string | null | undefined, bucket: 'tenant-logos' | 'tenant-showcase'): Promise<Buffer | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !base || !url.startsWith(`${base}/storage/v1/object/public/${bucket}/`)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!/image\/(png|jpe?g)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length < 3 * 1024 * 1024 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Gera o PDF da proposta (A4) com a marca do buffet. Retorna Buffer.
 * Com `sig`, inclui o bloco de assinatura e a página de evidências do aceite.
 */
export async function buildProposalPdf(v: ProposalView, publicUrl?: string, sig?: SignatureEvidence | null): Promise<Buffer> {
  const [logo, ...photos] = await Promise.all([
    fetchImage(v.brand?.logoUrl, 'tenant-logos'),
    ...(v.brand?.gallery ?? []).map((url) => fetchImage(url, 'tenant-showcase')),
  ]);
  const gallery = photos.filter((x): x is Buffer => !!x);
  const BRAND = safeColor(v.brand?.color);
  const brandName = v.brand?.name || 'Buffet';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFKit = require('pdfkit');
  const PDFDocument = PDFKit.default || PDFKit;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true, info: { Title: `Proposta - ${v.event.name}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const L = 48;
    const R = W - 48;
    const CW = R - L;

    const ensure = (h: number) => {
      if (doc.y + h > doc.page.height - 80) doc.addPage();
    };
    const section = (title: string) => {
      ensure(60);
      doc.moveDown(0.8);
      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), L, doc.y, { characterSpacing: 1 });
      doc.moveTo(L, doc.y + 3).lineTo(R, doc.y + 3).lineWidth(1).strokeColor(LINE).stroke();
      doc.moveDown(0.7);
    };

    // Cabeçalho
    doc.rect(0, 0, W, 110).fill(BRAND);
    let tx = L;
    if (logo) {
      try {
        doc.roundedRect(L, 22, 66, 66, 8).fill('#FFFFFF');
        doc.image(logo, L + 4, 26, { fit: [58, 58], align: 'center', valign: 'center' });
        tx = L + 82;
      } catch {
        tx = L;
      }
    }
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24).text('Proposta Comercial', tx, 36, { width: CW - (tx - L) - 120, lineBreak: false });
    doc.font('Helvetica').fontSize(11).fillColor('#FFFFFF').text(brandName, tx, 66, { width: CW - (tx - L) - 120, lineBreak: false, ellipsis: true });
    const subline = [v.brand?.tagline, v.brand?.document ? `CNPJ/CPF ${v.brand.document}` : ''].filter(Boolean).join('  ·  ');
    if (subline) {
      doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF').opacity(0.85)
        .text(subline, tx, 84, { width: CW - (tx - L), lineBreak: false, ellipsis: true }).opacity(1);
    }
    if (sig) {
      doc.roundedRect(R - 96, 34, 96, 22, 11).fill('#FFFFFF');
      doc.fillColor('#15803D').font('Helvetica-Bold').fontSize(9).text('ASSINADA', R - 96, 41, { width: 96, align: 'center', characterSpacing: 1 });
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#FFFFFF')
        .text(`Válida até ${v.validUntil ? dateBR(v.validUntil) : '—'}`, L, 40, { width: CW, align: 'right' });
    }
    doc.y = 130;

    // Cliente e evento
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Preparada para', L, doc.y);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(16).text(v.clientName || 'Cliente', L, doc.y + 2);
    doc.moveDown(0.6);

    const boxTop = doc.y;
    doc.roundedRect(L, boxTop, CW, 96, 8).fill(SOFT);
    const col = (x: number, label: string, value: string) => {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label.toUpperCase(), x, boxTop + 12, { width: CW / 2 - 20 });
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(value, x, doc.y + 1, { width: CW / 2 - 20 });
    };
    col(L + 16, v.event.type ? `Evento · ${v.event.type}` : 'Evento', v.event.name);
    col(L + CW / 2, 'Data e horário', `${dateBR(v.event.date)} · ${v.event.start} às ${v.event.end}`);
    const y2 = boxTop + 50;
    const col2 = (x: number, label: string, value: string) => {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label.toUpperCase(), x, y2, { width: CW / 2 - 20 });
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(value, x, doc.y + 1, { width: CW / 2 - 20, height: 30 });
    };
    col2(L + 16, 'Local', v.event.address || '-');
    col2(L + CW / 2, 'Convidados', String(v.event.guests));
    doc.y = boxTop + 96;

    if (v.coverMessage) {
      section('Apresentação');
      doc.fillColor(DARK).font('Helvetica').fontSize(10).text(v.coverMessage, L, doc.y, { width: CW, lineGap: 2 });
    }

    // Cardápio
    section('Cardápio');
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(12).text(v.menu.name, L);
    doc.moveDown(0.3);
    if (v.menu.items.length === 0) {
      doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(10).text('Itens detalhados conforme combinado com a equipe do buffet.');
    } else {
      let current = '';
      v.menu.items.forEach((i) => {
        const group = i.section?.trim() || '';
        if (group && group !== current) {
          ensure(34);
          doc.moveDown(0.4);
          doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(9.5).text(group.toUpperCase(), L, doc.y, { characterSpacing: 0.5 });
          doc.moveDown(0.15);
        }
        current = group;
        ensure(18);
        const qty = String(i.quantity ?? '').trim();
        // text('') com continued não quebra a linha: sem quantidade, escreve direto
        doc.fillColor(DARK).font('Helvetica').fontSize(10).text(`•  ${i.name}`, L + 6, doc.y, { continued: !!qty, width: CW - 6 });
        if (qty) doc.fillColor(MUTED).text(`   ${qty}`);
      });
    }

    const bullets = (title: string, items: string[] | undefined) => {
      if (!items?.length) return;
      section(title);
      items.forEach((t) => {
        ensure(18);
        doc.fillColor(DARK).font('Helvetica').fontSize(10).text(`•  ${t}`, L + 6, doc.y, { width: CW - 6 });
      });
    };
    bullets('O que está incluso', v.included);

    // Investimento
    section('Investimento');
    v.lines.forEach((ln) => {
      ensure(24);
      const y = doc.y;
      doc.fillColor(DARK).font('Helvetica').fontSize(10).text(ln.label, L, y, { width: CW - 130 });
      doc.fillColor(ln.value < 0 ? '#15803D' : DARK).text(ln.value < 0 ? `- ${brl(-ln.value)}` : brl(ln.value), R - 120, y, { width: 120, align: 'right' });
      doc.moveTo(L, y + 16).lineTo(R, y + 16).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.y = y + 22;
    });
    ensure(60);
    const ty = doc.y + 4;
    doc.roundedRect(L, ty, CW, 40, 8).fill(BRAND);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('VALOR TOTAL DA PROPOSTA', L + 16, ty + 14);
    doc.fontSize(15).text(brl(v.total), R - 200, ty + 11, { width: 184, align: 'right' });
    doc.y = ty + 52;

    // Pagamento
    section('Condições de pagamento');
    if (v.installments?.length) {
      v.installments.forEach((i) => {
        ensure(24);
        const y = doc.y;
        const pct = i.percent ? `  ·  ${i.percent.toLocaleString('pt-BR')}%` : '';
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(i.description, L, y, { width: 200 });
        doc.font('Helvetica').fillColor(MUTED).text(`${dateBR(i.dueDate)}${pct}`, L + 210, y, { width: CW - 340 });
        doc.fillColor(DARK).font('Helvetica-Bold').text(brl(i.amount), R - 120, y, { width: 120, align: 'right' });
        doc.moveTo(L, y + 16).lineTo(R, y + 16).lineWidth(0.5).strokeColor(LINE).stroke();
        doc.y = y + 22;
      });
    } else {
      doc.fillColor(DARK).font('Helvetica').fontSize(10)
        .text(`Sinal de ${v.deposit.percent}% para confirmar a data: `, L, doc.y, { continued: true })
        .font('Helvetica-Bold').text(brl(v.deposit.amount), { continued: true })
        .font('Helvetica').text(`  ·  Saldo: ${brl(v.deposit.balance)}`);
    }
    doc.moveDown(0.4);
    doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(v.paymentConditions, L, doc.y, { width: CW });

    bullets('Observações', v.notes);

    section('Termos e condições');
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(
      v.terms.map((t) => `• ${t}`).join('\n'),
      L, doc.y, { width: CW, lineGap: 3 }
    );

    if (sig) {
      // Bloco de assinatura
      ensure(190); // título + assinatura sempre na mesma página
      section('Aceite e assinatura');
      const sy = doc.y;
      const img = pngFromDataUrl(sig.image);
      if (img) {
        try {
          doc.image(img, L, sy, { fit: [220, 70], valign: 'bottom' });
        } catch {
          // imagem inválida: segue só com os dados
        }
      }
      doc.moveTo(L, sy + 76).lineTo(L + 240, sy + 76).lineWidth(0.8).strokeColor(DARK).stroke();
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(sig.name, L, sy + 82, { width: 240 });
      doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`CPF ${formatCpf(sig.document)}`, L, doc.y + 1, { width: 240 });
      doc.fillColor(MUTED).fontSize(9).text(
        `Assinado eletronicamente em ${dateTimeBR(sig.signedAt)}.\nCódigo de verificação: ${signatureCode(sig.hash)}\nEvidências do aceite na última página.`,
        L + 270, sy + 20, { width: CW - 270, lineGap: 2 }
      );
      doc.y = sy + 120;
    } else if (publicUrl) {
      ensure(50);
      doc.moveDown(1);
      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10)
        .text('Aceitar ou recusar online:', L, doc.y, { continued: true })
        .font('Helvetica').text(`  ${publicUrl}`, { link: publicUrl, underline: true });
    }

    if (gallery.length > 0) galleryPage(doc, { L, CW, BRAND }, gallery);

    if (sig) evidencePage(doc, { L, R, CW, BRAND }, v, sig, publicUrl);

    // Rodapé em todas as páginas
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // evita criar página nova ao escrever no rodapé
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(8).text(
        [brandName, v.brand?.instagram ? `@${v.brand.instagram}` : '', v.brand?.phone || '', `Página ${i + 1} de ${pages.count}`]
          .filter(Boolean)
          .join(' · '),
        L, doc.page.height - 36, { width: CW, align: 'center', lineBreak: false }
      );
    }

    doc.end();
  });
}

/** Fotos da vitrine em grade 2 x 3. */
function galleryPage(doc: PDFKit.PDFDocument, g: { L: number; CW: number; BRAND: string }, photos: Buffer[]) {
  const { L, CW, BRAND } = g;
  doc.addPage();
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16).text('Nossos eventos', L, 56, { width: CW });
  const gap = 12;
  const w = (CW - gap) / 2;
  const h = w * 0.75;
  const top = doc.y + 14;
  photos.slice(0, 6).forEach((img, i) => {
    const x = L + (i % 2) * (w + gap);
    const y = top + Math.floor(i / 2) * (h + gap);
    try {
      doc.save();
      doc.roundedRect(x, y, w, h, 8).clip();
      doc.image(img, x, y, { cover: [w, h], align: 'center', valign: 'center' });
      doc.restore();
    } catch {
      doc.restore();
    }
  });
}

/** Página de evidências: quem, quando, de onde e o hash do conteúdo aceito. */
function evidencePage(
  doc: PDFKit.PDFDocument,
  g: { L: number; R: number; CW: number; BRAND: string },
  v: ProposalView,
  sig: SignatureEvidence,
  publicUrl?: string
) {
  const { L, CW, BRAND } = g;
  doc.addPage();
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16).text('Registro de assinatura eletrônica', L, 56, { width: CW });
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(
    `Proposta "${v.event.name}" · ${v.brand?.name || 'Buffet'} · Valor total ${brl(v.total)}`,
    L, doc.y + 4, { width: CW }
  );
  doc.moveDown(1.2);

  const rows: [string, string][] = [
    ['Assinante', sig.name],
    ['CPF', formatCpf(sig.document)],
    ['E-mail', sig.email || 'não informado'],
    ['Data e hora do aceite', dateTimeBR(sig.signedAt)],
    ['Endereço IP', sig.ip || 'não identificado'],
    ['Dispositivo / navegador', sig.userAgent || 'não identificado'],
    ['Link da proposta', publicUrl || '-'],
    ['Código de verificação', signatureCode(sig.hash)],
    ['Hash SHA-256 do aceite', sig.hash],
  ];
  rows.forEach(([label, value]) => {
    const y = doc.y;
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label.toUpperCase(), L, y, { width: 150 });
    doc.fillColor(DARK).font(label.startsWith('Hash') ? 'Courier' : 'Helvetica').fontSize(9.5).text(value, L + 160, y, { width: CW - 160 });
    const bottom = Math.max(doc.y, y + 12) + 6;
    doc.moveTo(L, bottom).lineTo(L + CW, bottom).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.y = bottom + 6;
  });

  const img = pngFromDataUrl(sig.image);
  if (img) {
    doc.moveDown(0.6);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('ASSINATURA DESENHADA PELO ASSINANTE', L, doc.y);
    const y = doc.y + 6;
    doc.roundedRect(L, y, 260, 90, 6).lineWidth(0.5).strokeColor(LINE).stroke();
    try {
      doc.image(img, L + 10, y + 8, { fit: [240, 74], align: 'center', valign: 'center' });
    } catch {
      // ignora imagem corrompida
    }
    doc.y = y + 104;
  }

  doc.moveDown(0.8);
  doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(
    'O assinante declarou ter lido e concordado com os termos e condições desta proposta, identificou-se com nome e CPF ' +
      'e desenhou sua assinatura no próprio dispositivo. O hash SHA-256 acima foi calculado no momento do aceite sobre o ' +
      'conteúdo integral da proposta, os dados do assinante, a assinatura e a data/hora, permitindo verificar que o ' +
      'documento não foi alterado. Assinatura eletrônica válida entre as partes nos termos da MP 2.200-2/2001 (art. 10, § 2º) ' +
      'e da Lei 14.063/2020.',
    L, doc.y, { width: CW, lineGap: 2, align: 'justify' }
  );
}
