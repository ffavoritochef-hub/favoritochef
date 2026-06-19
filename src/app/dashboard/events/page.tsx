'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users,
  MoreVertical,
  ChevronRight,
  BadgeCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  'Orçamento enviado': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Aguardando aprovação': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Aprovado': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Em andamento': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Finalizado': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'Cancelado': 'bg-red-500/10 text-red-400 border-red-500/20',
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
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Eventos</h1>
          <p className="text-zinc-400 mt-1">Acompanhe e gerencie todos os buffets agendados.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2">
          <Link href="/dashboard/events/new">
            <PlusCircle className="w-5 h-5" />
            Agendar Evento
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p>Carregando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-xl bg-white/5 text-zinc-500">
            <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
            <p className="italic">Nenhum evento agendado.</p>
          </div>
        ) : (
          events.map((event) => (
            <div 
              key={event.id} 
              className="group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/[0.08] transition-all hover:border-primary/30"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex gap-6">
                  <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <span className="text-2xl font-black">{new Date(event.date).getDate()}</span>
                    <span className="text-xs uppercase font-bold">
                      {new Date(event.date).toLocaleString('pt-BR', { month: 'short' })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{event.name}</h3>
                      <Badge className={`${statusColors[event.status] || 'bg-zinc-500/10'} border font-medium`}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-zinc-400 flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-primary/60" />
                      {event.client?.name}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary/40" />
                        {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                      </span>
                      <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary/40" />
                        {event.address}
                      </span>
                      <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary/40" />
                        {event.guest_count} convidados
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-center">
                  <Button variant="outline" size="sm" className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/10">
                    Detalhes
                  </Button>
                  <Button size="sm" className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all">
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
