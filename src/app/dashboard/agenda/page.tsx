'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  MapPin, 
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Search,
  Info
} from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AgendaPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar agenda: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    
    // Filtro por Calendário (se uma data estiver selecionada e não houver filtro de período)
    if (date && !startDate && !endDate) {
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    }

    // Filtro por Período
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date(8640000000000000);
      return eventDate >= start && eventDate <= end;
    }

    return true;
  });

  const eventDays = events.map(event => new Date(event.date));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Agenda de Eventos</h1>
          <p className="text-zinc-400 mt-1">Visualize seus compromissos no calendário ou por período.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-sm">
          <div className="flex flex-col">
            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Início</label>
            <Input 
              type="date" 
              className="bg-transparent border-none text-xs h-8 text-white focus-visible:ring-0" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Fim</label>
            <Input 
              type="date" 
              className="bg-transparent border-none text-xs h-8 text-white focus-visible:ring-0" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-zinc-500 hover:text-white"
            >
              Limpar
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md overflow-hidden">
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setStartDate(''); setEndDate(''); }}
                locale={ptBR}
                className="text-white"
                modifiers={{ event: eventDays }}
                modifiersStyles={{
                  event: { fontWeight: 'bold', color: 'var(--primary)', textDecoration: 'underline' }
                }}
              />
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Resumo da Agenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">Total de Eventos</span>
                <span className="text-xl font-bold text-white">{events.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">Filtrados</span>
                <span className="text-xl font-bold text-primary neon-glow">{filteredEvents.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {startDate || endDate 
                ? `Período: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : '...'} até ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : '...'}`
                : date ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Selecione uma data'}
            </h2>
            <Badge variant="outline" className="border-primary/50 text-primary">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'Evento' : 'Eventos'}
            </Badge>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-zinc-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Carregando eventos...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-white/10 rounded-xl bg-white/5 text-zinc-500">
                <p className="italic text-sm">Nenhum evento encontrado para este critério.</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="group rounded-xl border border-white/10 bg-white/5 p-6 hover:border-primary/40 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{event.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter ${
                          event.status === 'Aprovado' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-primary/60" />
                          {event.client?.name}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                          <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                          {new Date(event.date).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary/60" />
                          {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary/60" />
                          {event.address}
                        </span>
                      </div>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedEvent(event)}
                          className="bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                        >
                          <Info className="w-4 h-4" />
                          Ver Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-primary/20 text-white max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold neon-glow text-white">{event.name}</DialogTitle>
                          <DialogDescription className="text-zinc-400">
                            Detalhes completos do evento e do cliente.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-widest border-b border-primary/20 pb-2">Informações do Evento</h4>
                            <div className="space-y-3">
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">Tipo:</span> <span className="text-white font-medium">{event.type}</span></p>
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">Data:</span> <span className="text-white font-medium">{new Date(event.date).toLocaleDateString('pt-BR')}</span></p>
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">Horário:</span> <span className="text-white font-medium">{event.start_time.slice(0, 5)} às {event.end_time.slice(0, 5)}</span></p>
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">Convidados:</span> <span className="text-white font-medium">{event.guest_count}</span></p>
                              <p className="text-sm flex flex-col gap-1"><span className="text-zinc-500">Endereço:</span> <span className="text-white font-medium">{event.address}</span></p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-widest border-b border-primary/20 pb-2">Dados do Cliente</h4>
                            <div className="space-y-3">
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">Nome:</span> <span className="text-white font-medium">{event.client?.name}</span></p>
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">CPF/CNPJ:</span> <span className="text-white font-medium">{event.client?.document}</span></p>
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">WhatsApp:</span> <span className="text-white font-medium">{event.client?.whatsapp || event.client?.phone}</span></p>
                              <p className="text-sm flex justify-between"><span className="text-zinc-500">E-mail:</span> <span className="text-white font-medium text-xs">{event.client?.email}</span></p>
                            </div>
                          </div>
                          <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Observações</h4>
                            <p className="text-sm text-zinc-300 bg-white/5 p-4 rounded-lg italic">
                              {event.observations || 'Nenhuma observação registrada para este evento.'}
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
