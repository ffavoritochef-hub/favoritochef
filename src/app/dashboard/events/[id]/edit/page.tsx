'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ChevronLeft, Save, Calendar, MapPin, Users, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const eventTypes = [
  'Casamento',
  'Aniversário',
  'Corporativo',
  'Formatura',
  'Churrasco',
  'Batizado',
  'Outros'
];

const eventStatuses = [
  'Orçamento enviado',
  'Aguardando aprovação',
  'Aprovado',
  'Em andamento',
  'Finalizado',
  'Cancelado',
];

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    type: '',
    date: '',
    start_time: '',
    end_time: '',
    address: '',
    guest_count: 0,
    agreed_value: 0,
    observations: '',
    status: 'Orçamento enviado'
  });

  useEffect(() => {
    fetchInitialData();
  }, [eventId]);

  async function fetchInitialData() {
    try {
      setLoading(true);

      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      setClients(clientsData || []);

      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (eventData) {
        setFormData({
          name: eventData.name || '',
          client_id: eventData.client_id || '',
          type: eventData.type || '',
          date: eventData.date || '',
          start_time: eventData.start_time || '',
          end_time: eventData.end_time || '',
          address: eventData.address || '',
          guest_count: Number(eventData.guest_count) || 0,
          agreed_value: Number(eventData.agreed_value) || 0,
          observations: eventData.observations || '',
          status: eventData.status || 'Orçamento enviado',
        });
      }
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('events')
        .update(formData)
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Evento atualizado com sucesso!');
      router.push(`/dashboard/events/${eventId}`);
    } catch (error: any) {
      toast.error('Erro ao atualizar evento: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
        <header className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <Link href="/dashboard/events">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Editar Evento</h1>
            <p className="text-sm sm:text-base text-slate-500">Carregando...</p>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4 rounded-2xl border border-border bg-white">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm font-medium">Carregando evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <Link href={`/dashboard/events/${eventId}`}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Editar Evento</h1>
          <p className="text-sm sm:text-base text-slate-500">Atualize os dados do buffet.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="size-5" />
              </span>
              Informações do Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="field-group md:col-span-2">
                <Label>Cliente</Label>
                <Select value={formData.client_id} onValueChange={(val) => setFormData({ ...formData, client_id: val })}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="field-group">
                <Label htmlFor="name">Nome do Evento</Label>
                <Input
                  id="name"
                  placeholder="Ex: Casamento João e Maria"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <Label>Tipo de Evento</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="field-group">
                <Label>Status do Evento</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {eventStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="field-group">
                <Label htmlFor="date" className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" />
                  Data do Evento
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="field-group">
                  <Label htmlFor="start" className="flex items-center gap-1.5">
                    <Clock className="size-4 text-primary" />
                    Início
                  </Label>
                  <Input
                    id="start"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <Label htmlFor="end" className="flex items-center gap-1.5">
                    <Clock className="size-4 text-primary" />
                    Término
                  </Label>
                  <Input
                    id="end"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="field-group md:col-span-2">
                <Label htmlFor="address" className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  Endereço Completo
                </Label>
                <Input
                  id="address"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <Label htmlFor="guests" className="flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  Qtd. Convidados
                </Label>
                <Input
                  id="guests"
                  type="number"
                  value={formData.guest_count}
                  onChange={(e) => setFormData({ ...formData, guest_count: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="field-group">
                <Label htmlFor="agreed_value" className="flex items-center gap-1.5">
                  <DollarSign className="size-4 text-primary" />
                  Valor Acordado (R$)
                </Label>
                <Input
                  id="agreed_value"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.agreed_value}
                  onChange={(e) => setFormData({ ...formData, agreed_value: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="field-group md:col-span-2">
                <Label htmlFor="obs">Observações</Label>
                <textarea
                  id="obs"
                  rows={4}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:bg-muted/50 disabled:opacity-50"
                  placeholder="Detalhes adicionais do evento..."
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link href={`/dashboard/events/${eventId}`}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
              disabled={saving}
            >
              <Save className="size-5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
