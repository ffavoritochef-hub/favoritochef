import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  console.log('PDF API called with eventId:', eventId);
  
  const searchParams = request.nextUrl.searchParams;
  const download = searchParams.get('download') === 'true';

  try {
    // Get event with client
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, client:clients(*)')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    // Get budget for event
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*, menu_templates(name, items:menu_template_items(custom_item_name, custom_quantity))')
      .eq('event_id', eventId)
      .single();

    if (budgetError) throw budgetError;

    // Generate PDF
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        if (download) {
          headers.set('Content-Disposition', `attachment; filename=proposta_${eventId}.pdf`);
        } else {
          headers.set('Content-Disposition', 'inline');
        }
        resolve(new NextResponse(pdfBuffer, { headers }));
      });

      // Header
      doc
        .fillColor('#bc13fe')
        .fontSize(24)
        .text('PROPOSTA COMERCIAL', { align: 'center', underline: true })
        .moveDown(1.5);

      const top = doc.y;

      // Client info
      doc
        .fillColor('#333333')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DADOS DO CLIENTE', 50, top)
        .moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Nome: ${event.client.name}`)
        .text(`CPF/CNPJ: ${event.client.document}`)
        .text(`Contato: ${event.client.whatsapp || event.client.phone || 'Não informado'}`)
        .moveDown();

      // Event info
      doc
        .fillColor('#333333')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DADOS DO EVENTO', 320, top)
        .moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Evento: ${event.name}`, 320)
        .text(`Data: ${new Date(event.date).toLocaleDateString('pt-BR')}`, 320)
        .text(`Local: ${event.address}`, 320)
        .text(`Convidados: ${event.guest_count}`, 320)
        .moveDown(2);

      // Menu
      doc.x = 50;
      doc
        .fillColor('#333333')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('CARDÁPIO CONTRATADO')
        .moveDown(0.5);

      doc
        .fillColor('#bc13fe')
        .fontSize(12)
        .text(budget.menu_templates?.name || 'Personalizado')
        .moveDown(0.3);

      const menuItems = budget.menu_templates?.items?.map(i =>
        `- ${i.custom_item_name} (${i.custom_quantity})`
      ).join('\n') || 'Nenhum item detalhado no cardápio.';

      doc
        .fillColor('#666666')
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text(menuItems)
        .moveDown(2);

      // Budget details
      doc
        .fillColor('#333333')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DETALHES DO ORÇAMENTO')
        .moveDown(0.5);

      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 400;

      // Table header
      doc.rect(50, tableTop - 5, 500, 20).fill('#eeeeee');
      doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10);
      doc.text('Descrição', col1 + 10, tableTop);
      doc.text('Valor', col2, tableTop);

      let rowY = tableTop + 25;
      const drawRow = (desc: string, value: string, isTotal = false) => {
        if (isTotal) {
          doc.fillColor('#bc13fe').font('Helvetica-Bold').fontSize(12);
        } else {
          doc.fillColor('#555555').font('Helvetica').fontSize(10);
        }
        doc.text(desc, col1 + 10, rowY);
        doc.text(value, col2, rowY);
        rowY += 20;
      };

      drawRow('Alimentos e Insumos', `R$ ${Number(budget.food_value).toFixed(2)}`);
      drawRow('Bebidas', `R$ ${Number(budget.drinks_value).toFixed(2)}`);
      drawRow('Equipe e Garçons', `R$ ${Number(budget.staff_value).toFixed(2)}`);
      drawRow('Locação e Estrutura', `R$ ${Number(budget.location_value).toFixed(2)}`);
      drawRow('Transporte e Logística', `R$ ${Number(budget.transport_value).toFixed(2)}`);

      doc.moveTo(50, rowY - 5).lineTo(550, rowY - 5).stroke('#dddddd');
      rowY += 5;
      drawRow('VALOR TOTAL DA PROPOSTA', `R$ ${Number(budget.total_value).toFixed(2)}`, true);

      // Payment conditions
      doc.moveDown(2);
      doc.x = 50;
      doc
        .fillColor('#333333')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('CONDIÇÕES DE PAGAMENTO')
        .moveDown(0.5);

      doc
        .fillColor('#555555')
        .fontSize(10)
        .font('Helvetica')
        .text(budget.payment_conditions || 'A combinar com a gerência do buffet.');

      // Footer
      doc
        .fontSize(8)
        .fillColor('#aaaaaa')
        .text(
          'Esta proposta tem validade de 7 dias. Agenda Buffet - Gestão de Eventos.',
          50,
          780,
          { align: 'center' }
        );

      doc.end();
    });
  } catch (error) {
    console.error('Error generating PDF (detailed):', error);
    console.error('Error stack:', (error as Error)?.stack);
    return NextResponse.json({ error: 'Error generating PDF', details: (error as Error)?.message }, { status: 500 });
  }
}
