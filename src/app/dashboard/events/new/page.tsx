'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { ChevronLeft, Save, Calendar, MapPin, Users, Clock } from 'lucide-react';
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

export default function NewEventPage() {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    type: '',
    date: '',
    start_time: '',
    end_time: '',
    address: '',
    guest_count: 0,
    observations: '',
    status: 'Orçamento enviado'
  });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setClients(data || []);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('events')
        .insert([formData]);

      if (error) throw error;

      toast.success('Evento agendado com sucesso!');
      router.push('/dashboard/events');
    } catch (error: any) {
      toast.error('Erro ao agendar evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <header className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5">
          <Link href="/dashboard/events">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Novo Evento</h1>
          <p className="text-zinc-400">Agende um novo buffet e defina os detalhes.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md">
          <CardHeader className="bg-white/5 border-b border-white/10 p-6">
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="w-5 h-5 text-primary" />
              Informações do Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-zinc-300">Cliente</Label>
                <Select onValueChange={(val) => setFormData({ ...formData, client_id: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-primary">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="hover:bg-primary/20 transition-colors">
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Nome do Evento</Label>
                <Input
                  id="name"
                  placeholder="Ex: Casamento João e Maria"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Tipo de Evento</Label>
                <Select onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-primary">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-zinc-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Data do Evento
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start" className="text-zinc-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Início
                  </Label>
                  <Input
                    id="start"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                    className="bg-white/5 border-white/10 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end" className="text-zinc-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Término
                  </Label>
                  <Input
                    id="end"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                    className="bg-white/5 border-white/10 text-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-zinc-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Endereço Completo
                </Label>
                <Input
                  id="address"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests" className="text-zinc-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Qtd. Convidados
                </Label>
                <Input
                  id="guests"
                  type="number"
                  value={formData.guest_count}
                  onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="obs" className="text-zinc-300">Observações</Label>
                <textarea
                  id="obs"
                  rows={4}
                  className="w-full rounded-md bg-white/5 border border-white/10 text-white p-3 focus:border-primary outline-none transition-all"
                  placeholder="Detalhes adicionais do evento..."
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/10 p-6 flex justify-end gap-4">
            <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
              <Link href="/dashboard/events">Cancelar</Link>
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-5 h-5" />
              {loading ? 'Agendando...' : 'Salvar Evento'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
