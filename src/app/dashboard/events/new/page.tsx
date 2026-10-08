'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ChevronLeft, Save, Calendar, MapPin, Users, Clock, DollarSign, Sparkles, HardHat, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useScheduleConflicts, ScheduleConflictAlert, StaffSuggestionBox } from '@/components/EventRulesAlerts';

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
  'Confirmado',
  'Em andamento',
  'Concluído',
  'Cancelado'
];

export default function NewEventPage() {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<{ employee_id: string; specific_role: string }[]>([]);
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
    status: 'Orçamento enviado',
    agreed_value: 0
  });
  const conflicts = useScheduleConflicts(formData.date, formData.start_time, formData.end_time);

  useEffect(() => {
    fetchClients();
    fetchEmployees();
  }, []);

  async function fetchClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setClients(data || []);
  }

  async function fetchEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, name, role')
      .eq('is_active', true)
      .order('name');
    setEmployees(data || []);
  }

  function toggleEmployee(empId: string) {
    setSelectedEmployees((prev) => {
      const exists = prev.find((e) => e.employee_id === empId);
      if (exists) return prev.filter((e) => e.employee_id !== empId);
      return [...prev, { employee_id: empId, specific_role: '' }];
    });
  }

  function updateSpecificRole(empId: string, value: string) {
    setSelectedEmployees((prev) =>
      prev.map((e) =>
        e.employee_id === empId ? { ...e, specific_role: value } : e
      )
    );
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (conflicts.some((c) => c.kind === 'sobreposicao')) {
        throw new Error('Há conflito de horário com outro evento nesta data.');
      }
      if (conflicts.length > 0) toast.warning('Atenção: intervalo curto entre eventos no mesmo dia.');

      const { data, error } = await supabase
        .from('events')
        .insert([formData])
        .select('id');

      if (error) throw error;

      if (selectedEmployees.length > 0 && data && data[0]?.id) {
        const eventId = data[0].id;
        const links = selectedEmployees.map((se) => ({
          event_id: eventId,
          employee_id: se.employee_id,
          specific_role: se.specific_role || null,
        }));
        const { error: linkErr } = await supabase
          .from('event_employees')
          .insert(links);
        if (linkErr) throw linkErr;
      }

      toast.success('Evento agendado com sucesso!');
      router.push('/dashboard/events');
    } catch (error: any) {
      toast.error('Erro ao agendar evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0">
            <Link href="/dashboard/events">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">Novo Evento</h1>
            <p className="text-sm sm:text-base text-slate-500 truncate">Agende um novo buffet e defina os detalhes.</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Calendar className="size-5" />
                  </span>
                  Informações do Evento
                </CardTitle>
                <CardDescription className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px]">
                  Preencha os dados para cadastrar um novo evento no sistema.
                </CardDescription>
              </div>
              {formData.agreed_value > 0 && (
                <div className="pl-0 sm:pl-6 pt-1 sm:pt-0 sm:border-l sm:border-border">
                  <p className="text-xs text-slate-500 mb-0.5">Valor Fechado</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap">
                    {formatCurrency(formData.agreed_value)}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              <div className="field-group lg:col-span-5 xl:col-span-4">
                <Label>Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(val) => setFormData({ ...formData, client_id: val })}
                >
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

              <div className="field-group lg:col-span-7 xl:col-span-8">
                <Label htmlFor="name">Nome do Evento</Label>
                <Input
                  id="name"
                  placeholder="Ex: Casamento João e Maria"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="field-group lg:col-span-5 xl:col-span-4">
                <Label>Tipo de Evento</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val })}
                >
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

              <div className="field-group lg:col-span-7 xl:col-span-4">
                <Label>Status do Evento</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {eventStatuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="field-group lg:col-span-12 xl:col-span-4">
                <Label htmlFor="agreed" className="flex items-center gap-1.5">
                  <DollarSign className="size-4 text-primary" />
                  Valor Fechado (R$)
                </Label>
                <Input
                  id="agreed"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.agreed_value || ''}
                  onChange={(e) => setFormData({ ...formData, agreed_value: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs mt-2 pl-1 text-primary/80">
                  <Sparkles className="inline size-3.5 mr-1 -mt-0.5" />
                  Valor que você fechou com o cliente. Usado para calcular a rentabilidade do evento.
                </p>
              </div>

              <div className="field-group lg:col-span-6 xl:col-span-4">
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

              <div className="lg:col-span-6 xl:col-span-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full">
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
              </div>

              <div className="field-group lg:col-span-8 xl:col-span-8">
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

              <div className="field-group lg:col-span-4 xl:col-span-4">
                <Label htmlFor="guests" className="flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  Qtd. Convidados
                </Label>
                <Input
                  id="guests"
                  type="number"
                  min="0"
                  value={formData.guest_count || ''}
                  onChange={(e) => setFormData({ ...formData, guest_count: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="field-group lg:col-span-12">
                <Label htmlFor="obs">Observações</Label>
                <textarea
                  id="obs"
                  rows={5}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:bg-muted/50 disabled:opacity-50"
                  placeholder="Detalhes adicionais do evento, preferências alimentares, itens inclusos, ponto de contato, etc..."
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                />
              </div>
            </div>

            {(formData.guest_count > 0 || formData.agreed_value > 0) && (
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.03] p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {formData.guest_count > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Convidados</p>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                        {formData.guest_count} pessoas
                      </p>
                    </div>
                  )}
                  {formData.agreed_value > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Valor Total</p>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {formatCurrency(formData.agreed_value)}
                      </p>
                    </div>
                  )}
                  {formData.guest_count > 0 && formData.agreed_value > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Média por Pessoa</p>
                      <p className="text-2xl sm:text-3xl font-bold text-violet-700">
                        {formatCurrency(formData.agreed_value / formData.guest_count)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          <ScheduleConflictAlert conflicts={conflicts} />
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link href="/dashboard/events">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Save className="size-5" />
              {loading ? 'Agendando...' : 'Salvar Evento'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-highlight/10 text-highlight">
                  <HardHat className="size-5" />
                </span>
                Equipe do Evento
              </CardTitle>
              <p className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px]">
                Selecione os funcionários que irão trabalhar neste evento.
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-4 sm:space-y-5">
            <StaffSuggestionBox guests={Number(formData.guest_count)} allocated={selectedEmployees.length} />
            {employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border rounded-2xl bg-slate-50/40 text-slate-500 text-center">
                <HardHat className="w-12 h-12 mb-3 text-primary/40" />
                <p className="font-semibold text-slate-700">Nenhum funcionário cadastrado.</p>
                <p className="text-xs sm:text-sm mt-1">
                  Cadastre sua equipe em{' '}
                  <Link href="/dashboard/employees/new" className="text-primary font-semibold hover:underline">
                    Funcionários &rarr;
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {employees.map((emp) => {
                  const isSelected = selectedEmployees.some(
                    (s) => s.employee_id === emp.id
                  );
                  const sel = selectedEmployees.find(
                    (s) => s.employee_id === emp.id
                  );
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployee(emp.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/[0.04] shadow-sm ring-2 ring-primary/20'
                          : 'border-border bg-white hover:border-primary/40 hover:bg-primary/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-11 h-11 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <HardHat
                              className={`w-5 h-5 ${
                                isSelected ? 'text-primary' : 'text-primary/70'
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 break-words">
                              {emp.name}
                            </p>
                            {emp.role && (
                              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                {emp.role}
                              </p>
                            )}
                          </div>
                        </div>
                        <div
                          className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary border-primary text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Plus className="w-4 h-4 rotate-45" />}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3.5 pt-3 border-t border-primary/20" onClick={(e) => e.stopPropagation()}>
                          <Label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
                            Função específica neste evento (opcional)
                          </Label>
                          <Input
                            placeholder="Ex: Responsável pela carne, Chef executivo"
                            value={sel?.specific_role || ''}
                            onChange={(e) => updateSpecificRole(emp.id, e.target.value)}
                            className="h-11 rounded-xl text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge className="rounded-full bg-highlight/10 text-highlight border-highlight/20 border px-3 py-1.5">
                  {selectedEmployees.length} funcionário(s) selecionado(s)
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmployees([])}
                  className="h-9 rounded-lg text-xs font-semibold text-slate-500 hover:text-destructive hover:bg-destructive/5"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Limpar seleção
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
