'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  MapPin, 
  User as UserIcon,
  Calendar as CalendarIcon,
  Info,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const statusStyles: Record<string, string> = {
  'Orçamento enviado': 'bg-sky-500 text-white border-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.4)]',
  'Aguardando aprovação': 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.45)]',
  'Aprovado': 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]',
  'Em andamento': 'bg-violet-500 text-white border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]',
  'Finalizado': 'bg-zinc-600 text-white border-zinc-500',
  'Cancelado': 'bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.45)]',
};

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [_selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*, client:clients(*)')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar agenda: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const groupEventsByMonth = (eventsList: any[]) => {
    const groups: Record<string, any[]> = {};

    eventsList.forEach((event) => {
      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => {
        const [year, month] = key.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthLabel = monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        return {
          key,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          events: items.sort((a, b) => {
            const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return a.start_time.localeCompare(b.start_time);
          }),
        };
      });
  };

  const groupedEvents = groupEventsByMonth(events);

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight neon-glow">Agenda de Eventos</h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-base leading-relaxed">Todos os eventos organizados por mês, automaticamente.</p>
        </div>
        <Badge variant="outline" className="border-primary/60 text-primary self-start md:self-center text-sm font-semibold px-4 py-2 w-full md:w-auto justify-center">
          {events.length} {events.length === 1 ? 'Evento' : 'Eventos'} no total
        </Badge>
      </header>

      <div className="w-full space-y-7 sm:space-y-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] mx-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary"></div>
            <p className="text-sm font-medium">Carregando agenda...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.03] text-zinc-400 p-6 text-center mx-1">
            <CalendarIcon className="w-14 h-14 mb-4 opacity-30 shrink-0 text-primary/50" />
            <p className="text-base sm:text-lg font-medium text-white/80">Nenhum evento agendado.</p>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2">Clique em &quot;Agendar Evento&quot; para começar.</p>
          </div>
        ) : (
          groupedEvents.map((group) => (
            <section key={group.key} className="space-y-3 sm:space-y-5 w-full">
              <div className="flex items-center gap-2 sm:gap-3 sticky top-[56px] sm:top-0 bg-zinc-950/98 backdrop-blur-md py-3 sm:py-4 -mx-1 px-1 sm:mx-0 sm:px-0 z-20 rounded-xl border-b border-primary/20 sm:border-none">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-primary via-primary/40 to-transparent rounded-full"></div>
                <h2 className="text-base sm:text-xl font-black text-primary uppercase tracking-wider shrink-0 whitespace-nowrap">
                  {group.monthLabel}
                </h2>
                <Badge className="bg-primary text-white border-none font-bold text-xs shrink-0 px-3 py-1">
                  {group.events.length}
                </Badge>
                <div className="h-[2px] flex-1 bg-gradient-to-l from-primary via-primary/40 to-transparent rounded-full"></div>
              </div>

              <div className="space-y-3 sm:space-y-4 w-full">
                {group.events.map((event) => (
                  <div 
                    key={event.id} 
                    className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 sm:p-6 hover:from-white/[0.09] hover:to-white/[0.04] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_25px_rgba(188,19,254,0.12)] w-full"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-5 w-full">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                        <div className="flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0 w-full sm:w-auto px-4 py-3.5 sm:px-0 sm:py-0 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/30 text-primary shrink-0">
                          <span className="text-3xl sm:text-3xl font-black leading-none text-white drop-shadow-[0_0_8px_rgba(188,19,254,0.4)]">{new Date(event.date).getDate()}</span>
                          <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-primary/90">
                            {new Date(event.date).toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '')}
                          </span>
                        </div>
                        <div className="space-y-2 sm:space-y-1.5 flex-1 min-w-0 w-full">
                          <div className="flex flex-wrap items-start gap-2 sm:gap-3 w-full">
                            <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary transition-colors break-words">{event.name}</h3>
                            <span className={`text-[11px] px-3 py-1 rounded-full border font-extrabold uppercase tracking-tight shrink-0 ${
                              statusStyles[event.status] || 'bg-zinc-700 text-white border-zinc-600'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                          <p className="text-zinc-300 flex items-center gap-2 text-sm sm:text-base font-medium">
                            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedEvent(event)}
                              className="flex-1 sm:flex-none border-primary/30 text-primary hover:text-white hover:bg-primary transition-all min-h-[48px] sm:min-h-[40px] flex items-center justify-center gap-2 text-sm font-bold px-5 sm:px-4 rounded-xl"
                            >
                              <Info className="w-4.5 h-4.5 shrink-0" />
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-zinc-900 border-primary/30 text-white max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-[0_0_40px_rgba(188,19,254,0.2)]">
                            <DialogHeader>
                              <DialogTitle className="text-2xl sm:text-3xl font-black neon-glow text-white break-words">{event.name}</DialogTitle>
                              <DialogDescription className="text-zinc-400 text-sm sm:text-base">
                                Detalhes completos do evento e do cliente.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 py-5 sm:py-6">
                              <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-xs sm:text-sm font-black text-primary uppercase tracking-widest border-b border-primary/30 pb-2">Informações do Evento</h4>
                                <div className="space-y-2.5 sm:space-y-3">
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">Tipo:</span> <span className="text-white font-bold text-right">{event.type}</span></p>
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">Data:</span> <span className="text-white font-bold text-right">{new Date(event.date).toLocaleDateString('pt-BR')}</span></p>
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">Horário:</span> <span className="text-white font-bold text-right">{event.start_time.slice(0, 5)} às {event.end_time.slice(0, 5)}</span></p>
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">Convidados:</span> <span className="text-white font-bold text-right">{event.guest_count}</span></p>
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">Status:</span> <span className={`font-black text-right px-2.5 py-0.5 rounded-full text-xs ${
                                    statusStyles[event.status] || ''
                                  }`}>{event.status}</span></p>
                                  <p className="text-sm sm:text-base flex flex-col gap-1.5"><span className="text-zinc-400 font-medium">Endereço:</span> <span className="text-white font-bold break-words leading-relaxed">{event.address}</span></p>
                                </div>
                              </div>
                              <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-xs sm:text-sm font-black text-primary uppercase tracking-widest border-b border-primary/30 pb-2">Dados do Cliente</h4>
                                <div className="space-y-2.5 sm:space-y-3">
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">Nome:</span> <span className="text-white font-bold text-right break-words max-w-[55%]">{event.client?.name}</span></p>
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">CPF/CNPJ:</span> <span className="text-white font-bold text-right">{event.client?.document}</span></p>
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">WhatsApp:</span> <span className="text-white font-bold text-right">{event.client?.whatsapp || event.client?.phone}</span></p>
                                  <p className="text-sm sm:text-base flex justify-between gap-2"><span className="text-zinc-400 shrink-0 font-medium">E-mail:</span> <span className="text-white font-bold text-right break-all max-w-[55%]">{event.client?.email}</span></p>
                                </div>
                              </div>
                              <div className="md:col-span-2 space-y-3 sm:space-y-4 pt-4 sm:pt-5 mt-2 sm:mt-0 border-t border-white/10">
                                <h4 className="text-xs sm:text-sm font-black text-zinc-500 uppercase tracking-widest">Observações</h4>
                                <p className="text-sm sm:text-base text-zinc-200 bg-white/[0.05] p-4 sm:p-5 rounded-xl leading-relaxed border border-white/5">
                                  {event.observations || 'Nenhuma observação registrada para este evento.'}
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
