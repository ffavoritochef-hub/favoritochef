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

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

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
    <div className="space-y-5 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter neon-glow">Agenda de Eventos</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Todos os eventos organizados por mês, automaticamente.</p>
        </div>
        <Badge variant="outline" className="border-primary/50 text-primary self-start md:self-center text-sm px-4 py-1.5">
          {events.length} {events.length === 1 ? 'Evento' : 'Eventos'} no total
        </Badge>
      </header>

      <div className="space-y-8 sm:space-y-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4 rounded-xl border border-white/10 bg-white/5">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm">Carregando agenda...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-xl bg-white/5 text-zinc-500 p-6 text-center">
            <CalendarIcon className="w-12 h-12 mb-4 opacity-20 shrink-0" />
            <p className="italic text-sm sm:text-base">Nenhum evento agendado.</p>
          </div>
        ) : (
          groupedEvents.map((group) => (
            <section key={group.key} className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3 sticky top-0 bg-zinc-950/95 backdrop-blur-sm py-3 -mx-2 sm:mx-0 px-2 sm:px-0 z-10 rounded-lg">
                <div className="h-px flex-1 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent"></div>
                <h2 className="text-lg sm:text-xl font-bold text-primary uppercase tracking-wider shrink-0">
                  {group.monthLabel}
                </h2>
                <Badge variant="outline" className="border-primary/30 text-primary/80 shrink-0">
                  {group.events.length}
                </Badge>
                <div className="h-px flex-1 bg-gradient-to-l from-primary/50 via-primary/20 to-transparent"></div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {group.events.map((event) => (
                  <div 
                    key={event.id} 
                    className="group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-6 hover:bg-white/[0.08] transition-all hover:border-primary/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="flex flex-row sm:flex-col items-center sm:justify-center gap-2 sm:gap-0 w-full sm:w-auto px-4 py-3 sm:px-0 sm:py-0 sm:w-20 sm:h-20 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                          <span className="text-2xl sm:text-2xl font-black leading-none">{new Date(event.date).getDate()}</span>
                          <span className="text-[10px] sm:text-xs uppercase font-bold">
                            {new Date(event.date).toLocaleString('pt-BR', { weekday: 'short' })}
                          </span>
                        </div>
                        <div className="space-y-1.5 sm:space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                            <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary transition-colors break-words">{event.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter shrink-0 ${
                              event.status === 'Aprovado' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              event.status === 'Cancelado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              event.status === 'Finalizado' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' :
                              'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                          <p className="text-zinc-400 flex items-center gap-2 text-sm">
                            <UserIcon className="w-4 h-4 text-primary/60 shrink-0" />
                            <span className="truncate">{event.client?.name}</span>
                          </p>
                          <div className="flex flex-wrap gap-3 sm:gap-4 mt-2 sm:mt-2">
                            <span className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/40 shrink-0" />
                              {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                            </span>
                            <span className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5 max-w-full">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/40 shrink-0" />
                              <span className="truncate max-w-[200px] sm:max-w-none">{event.address}</span>
                            </span>
                            <span className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/40 shrink-0" />
                              {event.guest_count} convidados
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-stretch sm:items-end gap-2 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 sm:border-0">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedEvent(event)}
                              className="flex-1 sm:flex-none border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-2"
                            >
                              <Info className="w-4 h-4 shrink-0" />
                              Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-zinc-900 border-primary/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-xl sm:text-2xl font-bold neon-glow text-white break-words">{event.name}</DialogTitle>
                              <DialogDescription className="text-zinc-400 text-sm">
                                Detalhes completos do evento e do cliente.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
                              <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-widest border-b border-primary/20 pb-2">Informações do Evento</h4>
                                <div className="space-y-2 sm:space-y-3">
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">Tipo:</span> <span className="text-white font-medium text-right">{event.type}</span></p>
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">Data:</span> <span className="text-white font-medium text-right">{new Date(event.date).toLocaleDateString('pt-BR')}</span></p>
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">Horário:</span> <span className="text-white font-medium text-right">{event.start_time.slice(0, 5)} às {event.end_time.slice(0, 5)}</span></p>
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">Convidados:</span> <span className="text-white font-medium text-right">{event.guest_count}</span></p>
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">Status:</span> <span className="text-white font-medium text-right">{event.status}</span></p>
                                  <p className="text-xs sm:text-sm flex flex-col gap-1"><span className="text-zinc-500">Endereço:</span> <span className="text-white font-medium break-words">{event.address}</span></p>
                                </div>
                              </div>
                              <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-widest border-b border-primary/20 pb-2">Dados do Cliente</h4>
                                <div className="space-y-2 sm:space-y-3">
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">Nome:</span> <span className="text-white font-medium text-right break-words max-w-[50%]">{event.client?.name}</span></p>
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">CPF/CNPJ:</span> <span className="text-white font-medium text-right">{event.client?.document}</span></p>
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">WhatsApp:</span> <span className="text-white font-medium text-right">{event.client?.whatsapp || event.client?.phone}</span></p>
                                  <p className="text-xs sm:text-sm flex justify-between gap-2"><span className="text-zinc-500 shrink-0">E-mail:</span> <span className="text-white font-medium text-xs text-right break-all max-w-[55%]">{event.client?.email}</span></p>
                                </div>
                              </div>
                              <div className="md:col-span-2 space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-white/5">
                                <h4 className="text-xs sm:text-sm font-bold text-zinc-500 uppercase tracking-widest">Observações</h4>
                                <p className="text-xs sm:text-sm text-zinc-300 bg-white/5 p-3 sm:p-4 rounded-lg italic leading-relaxed">
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
