'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { localTodayIso } from '@/lib/leads';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users,
  BadgeCheck,
  Eye,
  Pencil,
  FileText,
  Trash2
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteEvent } from '@/lib/events';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

const statusStyles: Record<string, string> = {
  'Orçamento enviado': 'bg-sky-600 text-white border-sky-600 rounded-full',
  'Aguardando aprovação': 'bg-warning text-white border-warning rounded-full',
  'Aprovado': 'bg-success text-white border-success rounded-full',
  'Em andamento': 'bg-highlight text-white border-highlight rounded-full',
  'Finalizado': 'bg-slate-500 text-white border-slate-500 rounded-full',
  'Cancelado': 'bg-destructive text-white border-destructive rounded-full',
};

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const todayIso = localTodayIso();

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
      // Próximos primeiro (do mais perto ao mais longe); os que já passaram vão para o fim.
      const today = localTodayIso();
      const list = data || [];
      const upcoming = list.filter((e) => e.date >= today);
      const past = list.filter((e) => e.date < today).reverse();
      setEvents([...upcoming, ...past]);
    } catch (error: any) {
      toast.error('Erro ao carregar eventos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteEvent(toDelete.id);
      toast.success('Evento excluído.');
      setToDelete(null);
      fetchEvents();
    } catch (error) {
      toast.error((error as Error).message || 'Falha ao excluir o evento.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0 lg:space-y-5">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight lg:text-2xl">Eventos</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base leading-relaxed lg:text-sm">Acompanhe e gerencie todos os buffets agendados.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold shadow-sm shadow-primary/15 flex items-center gap-2 w-full md:w-auto px-5 text-base lg:h-10 lg:text-sm lg:px-4">
          <Link href="/dashboard/events/new">
            <PlusCircle className="w-5 h-5 shrink-0 lg:w-4 lg:h-4" />
            Agendar Evento
          </Link>
        </Button>
      </header>

      {loading || events.length === 0 ? (
        <div className="grid grid-cols-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4 rounded-2xl border border-border bg-white mx-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary lg:size-9"></div>
            <p className="text-sm font-medium">Carregando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-border rounded-2xl bg-white text-slate-500 p-6 text-center mx-1">
            <CalendarIcon className="w-14 h-14 mb-4 shrink-0 text-primary/40 lg:w-12 lg:h-12" />
            <p className="text-base sm:text-lg font-semibold text-slate-900 lg:text-base">Nenhum evento agendado.</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">Clique em &quot;Agendar Evento&quot; para começar.</p>
          </div>
        ) : null}
        </div>
      ) : (
        <>
          {/* Desktop: tabela dentro de um card */}
          <div className="hidden lg:block bg-white border border-border shadow-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold w-[92px]">Data</th>
                  <th className="px-4 py-3 font-semibold">Evento / Cliente</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Horário</th>
                  <th className="px-4 py-3 font-semibold">Local</th>
                  <th className="px-4 py-3 font-semibold text-right">Convid.</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => {
                  const d = new Date(event.date + 'T12:00:00');
                  const past = event.date < todayIso;
                  return (
                    <tr
                      key={event.id}
                      onClick={() => router.push(`/dashboard/events/${event.id}`)}
                      className={`cursor-pointer transition-colors hover:bg-primary/5 ${past ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold leading-none text-slate-900">{d.getDate()}</span>
                          <span className="text-[11px] uppercase font-bold tracking-wider text-primary">
                            {d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} · {d.getFullYear()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[260px]">
                        <p className="font-semibold text-slate-900 truncate" title={event.name}>{event.name}</p>
                        <p className="text-xs text-slate-500 truncate">{event.client?.name || 'Sem cliente'}</p>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                        {event.start_time?.slice(0, 5)} – {event.end_time?.slice(0, 5)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-[220px]">
                        <span className="block truncate" title={event.address || ''}>{event.address || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{event.guest_count || 0}</td>
                      <td className="px-4 py-2.5">
                        <Badge className={`${statusStyles[event.status] || 'bg-slate-700 text-white border-slate-600 rounded-full'} border font-semibold text-[10px] px-2 py-0.5 uppercase tracking-tight whitespace-nowrap`}>
                          {event.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-primary" title="Detalhes" aria-label="Detalhes">
                            <Link href={`/dashboard/events/${event.id}`}><Eye className="size-4" /></Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-primary" title="Editar" aria-label="Editar">
                            <Link href={`/dashboard/events/${event.id}/edit`}><Pencil className="size-4" /></Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-primary" title="Orçamento" aria-label="Orçamento">
                            <Link href="/dashboard/budgets/new"><FileText className="size-4" /></Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-slate-400 hover:text-destructive hover:bg-destructive/5"
                            onClick={() => setToDelete(event)}
                            title="Excluir evento"
                            aria-label="Excluir evento"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Celular/tablet: cartões */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full lg:hidden">
            {events.map((event) => (
            <div 
              key={event.id} 
              className="group bg-white border-border shadow-card rounded-2xl p-4 sm:p-6 hover:shadow-card-hover transition-all w-full lg:p-4"
            >
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                  <div className="flex flex-row sm:flex-col items-center sm:justify-center gap-1 sm:gap-0 w-full sm:w-auto px-4 py-3.5 sm:px-0 sm:py-0 sm:w-24 sm:h-24 rounded-xl bg-primary/10 border-primary/20 shrink-0 lg:w-16 lg:h-16">
                    <span className="text-3xl sm:text-3xl font-bold leading-none text-slate-900 lg:text-2xl">{new Date(event.date + 'T12:00:00').getDate()}</span>
                    <span className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-primary">
                      {new Date(event.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </div>
                  <div className="space-y-2 sm:space-y-1.5 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-start gap-2 sm:gap-3 w-full">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 hover:text-primary transition-colors break-words lg:text-base">{event.name}</h3>
                      <Badge className={`${statusStyles[event.status] || 'bg-slate-700 text-white border-slate-600'} border font-semibold text-[11px] shrink-0 px-3 py-1 uppercase tracking-tight`}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-slate-600 flex items-center gap-2 text-sm sm:text-base font-medium lg:text-sm">
                      <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 lg:w-4 lg:h-4" />
                      <span className="truncate">{event.client?.name}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-3 sm:gap-x-5 gap-y-2 mt-2.5 sm:mt-3">
                      <span className="text-sm sm:text-base text-slate-600 flex items-center gap-2 font-medium lg:text-sm">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 lg:w-4 lg:h-4" />
                        {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                      </span>
                      <span className="text-sm sm:text-base text-slate-600 flex items-center gap-2 max-w-full font-medium lg:text-sm">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 lg:w-4 lg:h-4" />
                        <span className="truncate max-w-[220px] sm:max-w-none">{event.address}</span>
                      </span>
                      <span className="text-sm sm:text-base text-slate-600 flex items-center gap-2 font-medium lg:text-sm">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 lg:w-4 lg:h-4" />
                        {event.guest_count} convidados
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 sm:flex sm:justify-end gap-2 w-full pt-4 border-t border-border">
                  <Button asChild variant="outline" className="h-11 rounded-xl font-semibold px-2 sm:px-5 border-slate-200 text-slate-700 hover:bg-slate-50 lg:h-9">
                    <Link href={`/dashboard/events/${event.id}`}>
                      <Eye className="hidden sm:block" />
                      Detalhes
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-xl font-semibold px-2 sm:px-5 border-slate-200 text-slate-700 hover:bg-slate-50 lg:h-9">
                    <Link href={`/dashboard/events/${event.id}/edit`}>
                      <Pencil className="hidden sm:block" />
                      Editar
                    </Link>
                  </Button>
                  <Button asChild className="h-11 rounded-xl font-semibold px-2 sm:px-5 bg-primary hover:bg-primary-dark text-white lg:h-9">
                    <Link href="/dashboard/budgets/new">
                      <FileText className="hidden sm:block" />
                      Orçamento
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl px-2 sm:px-3 border-slate-200 text-slate-500 hover:text-destructive hover:bg-destructive/5 lg:h-9"
                    onClick={() => setToDelete(event)}
                    title="Excluir evento"
                    aria-label="Excluir evento"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !deleting && !o && setToDelete(null)}
        title="Excluir evento?"
        description={toDelete ? `"${toDelete.name}" será apagado junto com orçamentos, equipe escalada e pagamentos dele. Lançamentos do financeiro continuam. Se só não vai acontecer, prefira mudar o status para Cancelado.` : ''}
        variant="destructive"
        confirmText="Sim, excluir"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
