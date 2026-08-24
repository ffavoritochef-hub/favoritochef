'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users,
  BadgeCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

const statusStyles: Record<string, string> = {
  'Orçamento enviado': 'bg-sky-500 text-white border-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.4)]',
  'Aguardando aprovação': 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.45)]',
  'Aprovado': 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]',
  'Em andamento': 'bg-violet-500 text-white border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]',
  'Finalizado': 'bg-zinc-600 text-white border-zinc-500',
  'Cancelado': 'bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.45)]',
};

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*, client:clients(name)')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar eventos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight neon-glow">Eventos</h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-base leading-relaxed">Acompanhe e gerencie todos os buffets agendados.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/85 text-white font-extrabold transition-all shadow-[0_0_20px_rgba(188,19,254,0.35)] flex items-center gap-2 w-full md:w-auto min-h-[48px] px-5 rounded-xl text-base">
          <Link href="/dashboard/events/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Agendar Evento
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] mx-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary"></div>
            <p className="text-sm font-medium">Carregando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.03] text-zinc-400 p-6 text-center mx-1">
            <CalendarIcon className="w-14 h-14 mb-4 opacity-30 shrink-0 text-primary/50" />
            <p className="text-base sm:text-lg font-medium text-white/80">Nenhum evento agendado.</p>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2">Clique em &quot;Agendar Evento&quot; para começar.</p>
          </div>
        ) : (
          events.map((event) => (
            <div 
              key={event.id} 
              className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 sm:p-6 hover:from-white/[0.09] hover:to-white/[0.04] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_25px_rgba(188,19,254,0.12)] w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-5 w-full">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                  <div className="flex flex-row sm:flex-col items-center sm:justify-center gap-1 sm:gap-0 w-full sm:w-auto px-4 py-3.5 sm:px-0 sm:py-0 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/30 text-primary shrink-0">
                    <span className="text-3xl sm:text-3xl font-black leading-none text-white drop-shadow-[0_0_8px_rgba(188,19,254,0.4)]">{new Date(event.date).getDate()}</span>
                    <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-primary/90">
                      {new Date(event.date).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </div>
                  <div className="space-y-2 sm:space-y-1.5 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-start gap-2 sm:gap-3 w-full">
                      <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary transition-colors break-words">{event.name}</h3>
                      <Badge className={`${statusStyles[event.status] || 'bg-zinc-700 text-white border-zinc-600'} border font-extrabold text-[11px] shrink-0 px-3 py-1 uppercase tracking-tight`}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-zinc-300 flex items-center gap-2 text-sm sm:text-base font-medium">
                      <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                      <span className="truncate">{event.client?.name}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-3 sm:gap-x-5 gap-y-2 mt-2.5 sm:mt-3">
                      <span className="text-sm sm:text-base text-zinc-300 flex items-center gap-2 font-medium">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                      </span>
                      <span className="text-sm sm:text-base text-zinc-300 flex items-center gap-2 max-w-full font-medium">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <span className="truncate max-w-[220px] sm:max-w-none">{event.address}</span>
                      </span>
                      <span className="text-sm sm:text-base text-zinc-300 flex items-center gap-2 font-medium">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        {event.guest_count} convidados
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col items-stretch sm:items-end gap-2 sm:gap-3 w-full sm:w-auto pt-3 sm:pt-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-white/10 sm:border-0">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none border-primary/30 text-primary hover:text-white hover:bg-primary transition-all min-h-[48px] sm:min-h-[40px] text-sm font-bold px-5 rounded-xl">
                    Detalhes
                  </Button>
                  <Button size="sm" className="flex-1 sm:flex-none bg-primary/25 text-primary border border-primary/40 hover:bg-primary hover:text-white transition-all min-h-[48px] sm:min-h-[40px] text-sm font-bold px-5 rounded-xl">
                    Orçamento
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
