import type { ProposalView } from '@/lib/proposal';

const BRAND = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const SOFT = '#F1F5F9';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBR = (d: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-');

/** Gera o PDF da proposta (A4). Retorna Buffer. */
export function buildProposalPdf(v: ProposalView, publicUrl?: string): Promise<Buffer> {
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
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24).text('Proposta Comercial', L, 36);
    doc.font('Helvetica').fontSize(11).fillColor('#DBEAFE').text('Agenda Buffet · Gestão de Eventos', L, 68);
    doc.font('Helvetica').fontSize(9).fillColor('#DBEAFE')
      .text(`Válida até ${v.validUntil ? dateBR(v.validUntil) : '—'}`, L, 40, { width: CW, align: 'right' });
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
    col(L + 16, 'Evento', v.event.name);
    col(L + CW / 2, 'Data e horário', `${dateBR(v.event.date)} · ${v.event.start} às ${v.event.end}`);
    const y2 = boxTop + 50;
    const col2 = (x: number, label: string, value: string) => {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label.toUpperCase(), x, y2, { width: CW / 2 - 20 });
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(value, x, doc.y + 1, { width: CW / 2 - 20, height: 30 });
    };
    col2(L + 16, 'Local', v.event.address || '-');
    col2(L + CW / 2, 'Convidados', String(v.event.guests));
    doc.y = boxTop + 96;

    // Cardápio
    section('Cardápio');
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(12).text(v.menu.name, L);
    doc.moveDown(0.3);
    if (v.menu.items.length === 0) {
      doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(10).text('Itens detalhados conforme combinado com a equipe do buffet.');
    } else {
      v.menu.items.forEach((i) => {
        ensure(18);
        doc.fillColor(DARK).font('Helvetica').fontSize(10).text(`•  ${i.name}`, L + 6, doc.y, { continued: true });
        doc.fillColor(MUTED).text(i.quantity ? `   ${i.quantity}` : '');
      });
    }

    // Investimento
    section('Investimento');
    v.lines.forEach((ln) => {
      ensure(24);
      const y = doc.y;
      doc.fillColor(DARK).font('Helvetica').fontSize(10).text(ln.label, L, y, { width: CW - 130 });
      doc.text(brl(ln.value), R - 120, y, { width: 120, align: 'right' });
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
    doc.fillColor(DARK).font('Helvetica').fontSize(10)
      .text(`Sinal de ${v.deposit.percent}% para confirmar a data: `, L, doc.y, { continued: true })
      .font('Helvetica-Bold').text(brl(v.deposit.amount), { continued: true })
      .font('Helvetica').text(`  ·  Saldo: ${brl(v.deposit.balance)}`);
    doc.moveDown(0.4);
    doc.fillColor(MUTED).fontSize(10).text(v.paymentConditions, L, doc.y, { width: CW });

    section('Termos');
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(
      [
        '• A data só é reservada após o pagamento do sinal.',
        '• Em caso de cancelamento, o sinal não é reembolsável.',
        '• O número final de convidados deve ser confirmado até 7 dias antes do evento.',
        `• Proposta válida até ${v.validUntil ? dateBR(v.validUntil) : 'a data informada pelo buffet'}.`,
      ].join('\n'),
      L, doc.y, { width: CW, lineGap: 3 }
    );

    if (publicUrl) {
      ensure(50);
      doc.moveDown(1);
      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10)
        .text('Aceitar ou recusar online:', L, doc.y, { continued: true })
        .font('Helvetica').text(`  ${publicUrl}`, { link: publicUrl, underline: true });
    }

    // Rodapé em todas as páginas
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // evita criar página nova ao escrever no rodapé
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(8).text(
        `Agenda Buffet · Documento gerado automaticamente · Página ${i + 1} de ${pages.count}`,
        L, doc.page.height - 36, { width: CW, align: 'center', lineBreak: false }
      );
    }

    doc.end();
  });
}
