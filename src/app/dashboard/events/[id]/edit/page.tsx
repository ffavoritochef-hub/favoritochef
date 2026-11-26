'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ChevronLeft, Save, Calendar, MapPin, Users, Clock, DollarSign, Sparkles, ArrowLeftCircle, HardHat, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EVENT_STATUSES, allowedStatusOptions, validateStatusTransition } from '@/lib/buffet-rules';
import { useScheduleConflicts, checkScheduleConflicts, ScheduleConflictAlert, StaffSuggestionBox } from '@/components/EventRulesAlerts';
import {
  EVENT_LIMITS,
  buildEventPayload,
  errorMessage,
  formatDecimalInput,
  friendlyDbError,
  normalizeTime,
  parseDecimal,
  validateEventForm,
  type EventField,
  type EventFormData,
  type EventFormErrors,
} from '@/lib/event-form';
import { cn } from '@/lib/utils';

const eventTypes = [
  'Casamento',
  'Aniversário',
  'Corporativo',
  'Formatura',
  'Churrasco',
  'Batizado',
  'Outros'
];

type Employee = { id: string; name: string; role?: string | null };
type Client = { id: string; name: string; is_active?: boolean | null };
type StaffLink = { employee_id: string; specific_role: string };
type LinkRow = {
  employee_id: string;
  specific_role: string | null;
  employee: { name: string } | { name: string }[] | null;
};

/** Id de cada campo na tela (para levar o foco até o erro). */
const FIELD_ID: Record<EventField, string> = {
  client_id: 'client', name: 'name', type: 'type', status: 'status', agreed_value: 'agreed',
  date: 'date', start_time: 'start', end_time: 'end', address: 'address', guest_count: 'guests', observations: 'obs',
};

function focusField(field: EventField) {
  const el = document.getElementById(FIELD_ID[field]);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1.5 pl-1 text-xs font-medium text-destructive">{msg}</p>;
}

const errCls = (msg?: string) => (msg ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15' : '');

export default function EditEventPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<StaffLink[]>([]);
  const [originalLinks, setOriginalLinks] = useState<string[]>([]);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [formData, setFormData] = useState<EventFormData>({
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
  /** Texto do campo de valor como digitado (aceita vírgula). */
  const [agreedText, setAgreedText] = useState('');

  const [originalStatus, setOriginalStatus] = useState<string>('');
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [depositPercent, setDepositPercent] = useState(30);
  const conflicts = useScheduleConflicts(formData.date, formData.start_time, formData.end_time, eventId);

  /** Altera um campo e limpa o erro dele. */
  function setField<K extends EventField>(field: K, value: EventFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  /** O Select às vezes dispara valor vazio sozinho (formulário/autopreenchimento): ignora. */
  const onSelect = (field: 'client_id' | 'type' | 'status') => (val: string) => {
    if (val) setField(field, val);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setFetching(true);
      try {
        const [eventRes, linksRes, clientsRes, employeesRes, payRes, budRes] = await Promise.all([
          supabase.from('events').select('*').eq('id', eventId).maybeSingle(),
          supabase
            .from('event_employees')
            .select('employee_id, specific_role, employee:employees(id, name)')
            .eq('event_id', eventId),
          supabase.from('clients').select('id, name, is_active').order('name'),
          supabase.from('employees').select('id, name, role').not('is_active', 'is', false).order('name'),
          supabase.from('event_payments').select('amount, status').eq('event_id', eventId),
          supabase.from('budgets').select('deposit_percent').eq('event_id', eventId).order('created_at', { ascending: false }).limit(1),
        ]);
        if (cancelled) return;

        for (const r of [eventRes, linksRes, clientsRes, employeesRes, payRes]) {
          if (r.error) throw r.error;
        }
        const ev = eventRes.data;
        if (!ev) {
          toast.error('Evento não encontrado. Ele pode ter sido excluído.');
          router.push('/dashboard/events');
          return;
        }

        const status = ev.status || 'Orçamento enviado';
        const agreed = Math.max(0, Number(ev.agreed_value) || 0);
        setFormData({
          name: ev.name || '',
          client_id: ev.client_id || '',
          type: ev.type || '',
          date: String(ev.date || '').slice(0, 10),
          start_time: normalizeTime(ev.start_time),
          end_time: normalizeTime(ev.end_time),
          address: ev.address || '',
          guest_count: Math.max(0, Math.floor(Number(ev.guest_count) || 0)),
          observations: ev.observations || '',
          status,
          agreed_value: agreed,
        });
        setAgreedText(formatDecimalInput(agreed));
        setOriginalStatus(status);

        setClients((clientsRes.data as Client[]) || []);

        // funcionários ativos + os que já estão escalados mas saíram da equipe (com o nome real)
        const active = (employeesRes.data as Employee[]) || [];
        const links = (linksRes.data as unknown as LinkRow[] | null) || [];
        const extra: Employee[] = links
          .filter((l) => !active.some((e) => e.id === l.employee_id))
          .map((l) => {
            const emp = Array.isArray(l.employee) ? l.employee[0] : l.employee;
            return {
              id: l.employee_id,
              name: emp?.name ? `${emp.name} (inativo)` : 'Funcionário removido',
              role: 'Fora da equipe ativa — mantido na escala deste evento',
            };
          });
        setEmployees([...active, ...extra]);
        setSelectedEmployees(links.map((l) => ({ employee_id: l.employee_id, specific_role: l.specific_role || '' })));
        setOriginalLinks(links.map((l) => l.employee_id));

        setReceivedTotal(
          ((payRes.data as { amount: number | string | null; status: string | null }[] | null) || [])
            .filter((p) => p.status === 'Recebido')
            .reduce((a, p) => a + (Number(p.amount) || 0), 0)
        );
        const dp = Number((budRes.data as { deposit_percent: number | null }[] | null)?.[0]?.deposit_percent);
        if (Number.isFinite(dp) && dp > 0) setDepositPercent(dp);
      } catch (error) {
        if (cancelled) return;
        toast.error('Erro ao carregar evento: ' + friendlyDbError(error));
        router.push('/dashboard/events');
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, router]);

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
        e.employee_id === empId ? { ...e, specific_role: value.slice(0, 80) } : e
      )
    );
  }

  const formatCurrency = (value: number) =>
    (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // cliente atual sempre aparece (mesmo inativo); tipo antigo continua na lista;
  // status só os permitidos a partir do atual
  const clientOptions = clients.filter((c) => c.is_active !== false || c.id === formData.client_id);
  const typeOptions = formData.type && !eventTypes.includes(formData.type) ? [formData.type, ...eventTypes] : eventTypes;
  const statusOptions = originalStatus ? allowedStatusOptions(originalStatus) : [...EVENT_STATUSES];
  const agreedValue = Number.isFinite(formData.agreed_value) ? formData.agreed_value : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || fetching) return;

    const v = validateEventForm(formData);
    if (!v.ok) {
      setErrors(v.errors);
      toast.error(v.firstMessage);
      if (v.firstField) focusField(v.firstField);
      return;
    }
    setErrors({});

    const tr = validateStatusTransition(originalStatus, formData.status, {
      agreedValue: agreedValue,
      receivedTotal,
      depositPercent,
    });
    if (!tr.allowed) {
      const field: EventField = /valor/i.test(tr.reason || '') ? 'agreed_value' : 'status';
      setErrors({ [field]: tr.reason });
      toast.error(tr.reason);
      focusField(field);
      return;
    }

    setLoading(true);
    try {
      // confere a agenda no banco agora (o aviso da tela pode estar desatualizado)
      if (formData.status !== 'Cancelado') {
        const fresh = await checkScheduleConflicts(formData.date, formData.start_time, formData.end_time, eventId);
        const hard = fresh.find((c) => c.kind === 'sobreposicao');
        if (hard) {
          setErrors({ start_time: hard.message });
          focusField('start_time');
          throw new Error('Há conflito de horário com outro evento nesta data. ' + hard.message);
        }
        if (fresh.length > 0) toast.warning('Atenção: intervalo curto até outro evento no mesmo dia.');
      }

      const { data: updated, error } = await supabase
        .from('events')
        .update(buildEventPayload(formData))
        .eq('id', eventId)
        .select('id');
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error('O evento não foi salvo: ele foi excluído ou você está sem permissão (verifique se o acesso do buffet está ativo).');
      }

      // Escala: remove quem foi desmarcado e grava/atualiza quem ficou.
      const keep = new Set(selectedEmployees.map((s) => s.employee_id));
      const removed = originalLinks.filter((id) => !keep.has(id));
      if (removed.length > 0) {
        const { error: deleteErr } = await supabase
          .from('event_employees')
          .delete()
          .eq('event_id', eventId)
          .in('employee_id', removed);
        if (deleteErr) throw new Error('Os dados do evento foram salvos, mas a equipe não: ' + friendlyDbError(deleteErr));
      }
      if (selectedEmployees.length > 0) {
        const links = selectedEmployees.map((se) => ({
          event_id: eventId,
          employee_id: se.employee_id,
          specific_role: se.specific_role.trim() || null,
        }));
        const { error: upsertErr } = await supabase
          .from('event_employees')
          .upsert(links, { onConflict: 'event_id,employee_id', ignoreDuplicates: false });
        if (upsertErr) throw new Error('Os dados do evento foram salvos, mas a equipe não: ' + friendlyDbError(upsertErr));
      }

      for (const w of v.warnings) toast.warning(w);
      if (tr.warning) toast.warning(tr.warning);
      if (agreedValue > 0 && receivedTotal > agreedValue + 0.005) {
        toast.warning(`O valor fechado (${formatCurrency(agreedValue)}) é menor que o já recebido (${formatCurrency(receivedTotal)}).`);
      }
      toast.success('Evento atualizado com sucesso!');
      router.push(`/dashboard/events/${eventId}`);
    } catch (error) {
      toast.error('Erro ao atualizar evento: ' + errorMessage(error));
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="ev-compact max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8 lg:space-y-5">
        <div className="animate-pulse space-y-6 sm:space-y-8 lg:space-y-5">
          <div className="h-12 bg-slate-200 rounded-2xl w-2/3 lg:h-10"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-compact max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8 lg:space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Button asChild variant="outline" size="icon" className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0">
            <Link href={`/dashboard/events/${eventId}`}>
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate lg:text-2xl">Editar Evento</h1>
            <p className="text-sm sm:text-base text-slate-500 truncate lg:text-sm">Atualize os dados do evento cadastrado.</p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-12 border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0 lg:h-10">
          <Link href={`/dashboard/events/${eventId}`}>
            <ArrowLeftCircle className="size-4 mr-2" />
            Voltar ao Detalhe
          </Link>
        </Button>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 sm:space-y-8 lg:space-y-5">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6 lg:px-5 lg:py-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900 lg:text-base">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary lg:size-8">
                    <Calendar className="size-5" />
                  </span>
                  Informações do Evento
                </CardTitle>
                <CardDescription className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px] lg:pl-[42px]">
                  Atualize as informações do evento abaixo.
                </CardDescription>
              </div>
              {agreedValue > 0 && (
                <div className="pl-0 sm:pl-6 pt-1 sm:pt-0 sm:border-l sm:border-border">
                  <p className="text-xs text-slate-500 mb-0.5">Valor Fechado</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap lg:text-xl">
                    {formatCurrency(agreedValue)}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 lg:px-5 lg:py-5 lg:space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-4">
              <div className="field-group lg:col-span-5 xl:col-span-4">
                <Label htmlFor="client">Cliente</Label>
                <Select value={formData.client_id} onValueChange={onSelect('client_id')}>
                  <SelectTrigger id="client" aria-invalid={!!errors.client_id} className={cn('h-12 rounded-xl lg:h-10', errCls(errors.client_id))}>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {clientOptions.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}{client.is_active === false ? ' (inativo)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.client_id} />
              </div>

              <div className="field-group lg:col-span-7 xl:col-span-8">
                <Label htmlFor="name">Nome do Evento</Label>
                <Input
                  id="name"
                  placeholder="Ex: Casamento João e Maria"
                  value={formData.name}
                  maxLength={EVENT_LIMITS.name}
                  aria-invalid={!!errors.name}
                  className={errCls(errors.name)}
                  onChange={(e) => setField('name', e.target.value)}
                />
                <FieldError msg={errors.name} />
              </div>

              <div className="field-group lg:col-span-5 xl:col-span-4">
                <Label htmlFor="type">Tipo de Evento <span className="text-slate-400 font-normal">(opcional)</span></Label>
                <Select value={formData.type} onValueChange={onSelect('type')}>
                  <SelectTrigger id="type" aria-invalid={!!errors.type} className={cn('h-12 rounded-xl lg:h-10', errCls(errors.type))}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {typeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.type} />
              </div>

              <div className="field-group lg:col-span-7 xl:col-span-4">
                <Label htmlFor="status">Status do Evento</Label>
                <Select value={formData.status} onValueChange={onSelect('status')}>
                  <SelectTrigger id="status" aria-invalid={!!errors.status} className={cn('h-12 rounded-xl lg:h-10', errCls(errors.status))}>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status ? (
                  <FieldError msg={errors.status} />
                ) : statusOptions.length <= 1 ? (
                  <p className="text-xs mt-1.5 pl-1 text-slate-500">Evento {originalStatus.toLowerCase()}: o status não muda mais.</p>
                ) : null}
              </div>

              <div className="field-group lg:col-span-12 xl:col-span-4">
                <Label htmlFor="agreed" className="flex items-center gap-1.5">
                  <DollarSign className="size-4 text-primary" />
                  Valor Fechado (R$)
                </Label>
                <Input
                  id="agreed"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={agreedText}
                  aria-invalid={!!errors.agreed_value}
                  className={errCls(errors.agreed_value)}
                  onChange={(e) => {
                    const txt = e.target.value.replace(/[^\d.,]/g, '').slice(0, 16);
                    setAgreedText(txt);
                    const n = parseDecimal(txt);
                    setField('agreed_value', txt === '' ? 0 : n);
                  }}
                />
                {errors.agreed_value ? (
                  <FieldError msg={errors.agreed_value} />
                ) : (
                  <p className="text-xs mt-2 pl-1 text-primary/80">
                    <Sparkles className="inline size-3.5 mr-1 -mt-0.5" />
                    Valor que você fechou com o cliente. Usado para calcular a rentabilidade do evento.
                  </p>
                )}
              </div>

              <div className="field-group lg:col-span-6 xl:col-span-4">
                <Label htmlFor="date" className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" />
                  Data do Evento
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={`${EVENT_LIMITS.minYear}-01-01`}
                  max={`${EVENT_LIMITS.maxYear}-12-31`}
                  value={formData.date}
                  aria-invalid={!!errors.date}
                  className={errCls(errors.date)}
                  onChange={(e) => setField('date', e.target.value)}
                />
                <FieldError msg={errors.date} />
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
                      aria-invalid={!!errors.start_time}
                      className={errCls(errors.start_time)}
                      onChange={(e) => setField('start_time', e.target.value)}
                    />
                    <FieldError msg={errors.start_time} />
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
                      aria-invalid={!!errors.end_time}
                      className={errCls(errors.end_time)}
                      onChange={(e) => setField('end_time', e.target.value)}
                    />
                    <FieldError msg={errors.end_time} />
                  </div>
                </div>
              </div>

              <div className="field-group lg:col-span-8 xl:col-span-8">
                <Label htmlFor="address" className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  Endereço Completo <span className="text-slate-400 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="address"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={formData.address}
                  maxLength={EVENT_LIMITS.address}
                  aria-invalid={!!errors.address}
                  className={errCls(errors.address)}
                  onChange={(e) => setField('address', e.target.value)}
                />
                <FieldError msg={errors.address} />
              </div>

              <div className="field-group lg:col-span-4 xl:col-span-4">
                <Label htmlFor="guests" className="flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  Qtd. Convidados <span className="text-slate-400 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="guests"
                  inputMode="numeric"
                  placeholder="0"
                  value={formData.guest_count || ''}
                  aria-invalid={!!errors.guest_count}
                  className={errCls(errors.guest_count)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setField('guest_count', digits ? Number(digits) : 0);
                  }}
                />
                <FieldError msg={errors.guest_count} />
              </div>

              <div className="field-group lg:col-span-12">
                <Label htmlFor="obs">Observações <span className="text-slate-400 font-normal">(opcional)</span></Label>
                <textarea
                  id="obs"
                  rows={5}
                  maxLength={EVENT_LIMITS.observations}
                  aria-invalid={!!errors.observations}
                  className={cn(
                    'w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:bg-muted/50 disabled:opacity-50 lg:text-sm',
                    errCls(errors.observations),
                  )}
                  placeholder="Detalhes adicionais do evento, preferências alimentares, itens inclusos, ponto de contato, etc..."
                  value={formData.observations}
                  onChange={(e) => setField('observations', e.target.value)}
                />
                <FieldError msg={errors.observations} />
              </div>
            </div>

            {(formData.guest_count > 0 || agreedValue > 0) && (
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.03] p-4 sm:p-6 lg:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-4">
                  {formData.guest_count > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Convidados</p>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 lg:text-2xl">
                        {formData.guest_count} pessoas
                      </p>
                    </div>
                  )}
                  {agreedValue > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Valor Total</p>
                      <p className="text-2xl sm:text-3xl font-bold text-primary lg:text-2xl">
                        {formatCurrency(agreedValue)}
                      </p>
                    </div>
                  )}
                  {formData.guest_count > 0 && agreedValue > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Média por Pessoa</p>
                      <p className="text-2xl sm:text-3xl font-bold text-violet-700 lg:text-2xl">
                        {formatCurrency(agreedValue / formData.guest_count)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          <ScheduleConflictAlert conflicts={formData.status === 'Cancelado' ? [] : conflicts} />
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:gap-4 lg:px-5 lg:py-3.5">
            <Button asChild variant="outline" className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50 lg:h-10">
              <Link href={`/dashboard/events/${eventId}`}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2 lg:h-10"
              disabled={loading}
            >
              <Save className="size-5" />
              {loading ? 'Atualizando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6 lg:px-5 lg:py-3.5">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900 lg:text-base">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-highlight/10 text-highlight lg:size-8">
                  <HardHat className="size-5" />
                </span>
                Equipe do Evento
              </CardTitle>
              <p className="mt-2 text-slate-500 text-sm pl-12 sm:pl-[52px] lg:pl-[42px]">
                Selecione os funcionários que irão trabalhar neste evento. A equipe é salva junto com o botão &quot;Salvar Alterações&quot;.
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-4 sm:space-y-5 lg:px-5 lg:py-5">
            <StaffSuggestionBox guests={Number(formData.guest_count)} allocated={selectedEmployees.length} />
            {employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border rounded-2xl bg-slate-50/40 text-slate-500 text-center lg:py-6">
                <HardHat className="w-12 h-12 mb-3 text-primary/40 lg:h-10 lg:w-10" />
                <p className="font-semibold text-slate-700">Nenhum funcionário cadastrado.</p>
                <p className="text-xs sm:text-sm mt-1">
                  Cadastre sua equipe em{' '}
                  <Link href="/dashboard/employees/new" className="text-primary font-semibold hover:underline">
                    Funcionários &rarr;
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {employees.map((emp) => {
                    const sel = selectedEmployees.find((s) => s.employee_id === emp.id);
                    const isSelected = !!sel;
                    return (
                      <div
                        key={emp.id}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => toggleEmployee(emp.id)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleEmployee(emp.id);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          isSelected
                            ? 'border-primary bg-primary/[0.04] shadow-sm ring-2 ring-primary/20'
                            : 'border-border bg-white hover:border-primary/40 hover:bg-primary/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-11 h-11 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center lg:size-9">
                              <HardHat
                                className={`w-5 h-5 ${ isSelected ? 'text-primary' : 'text-primary/70' } lg:w-4 lg:h-4`}
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
                            <Label htmlFor={`role-${emp.id}`} className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
                              Função específica neste evento (opcional)
                            </Label>
                            <Input
                              id={`role-${emp.id}`}
                              placeholder="Ex: Responsável pela carne, Chef executivo"
                              value={sel?.specific_role || ''}
                              maxLength={80}
                              onChange={(e) => updateSpecificRole(emp.id, e.target.value)}
                              className="h-11 rounded-xl text-sm lg:h-9"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
              </>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
