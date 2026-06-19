import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  try {
    // Get event with client
    const { data: event, error } = await supabase
      .from('events')
      .select('*, client:clients(*)')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    if (!event || !event.client) return NextResponse.json({ link: null });

    const phone = event.client.whatsapp || event.client.phone;
    if (!phone) return NextResponse.json({ link: null });

    let cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone) return NextResponse.json({ link: null });

    if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }

    const message = encodeURIComponent(`Olá ${event.client.name}, sua proposta para o evento ${event.name} foi criada. Clique no link abaixo para visualizar e aprovar.`);
    const link = `https://wa.me/${cleanPhone}?text=${message}`;

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error getting WhatsApp link:', error);
    return NextResponse.json({ link: null, error: 'Error getting WhatsApp link' }, { status: 500 });
  }
}
