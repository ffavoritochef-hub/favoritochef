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
  FileText, 
  Download, 
  MessageSquare,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch, openProtectedPdf } from '@/lib/api-client';
import Link from 'next/link';

const statusStyles: Record<string, string> = {
  'Orçamento enviado': 'bg-sky-600 text-white border-sky-600 rounded-full',
  'Aguardando aprovação': 'bg-warning text-white border-warning rounded-full',
  'Aprovado': 'bg-success text-white border-success rounded-full',
  'Em andamento': 'bg-highlight text-white border-highlight rounded-full',
  'Finalizado': 'bg-slate-500 text-white border-slate-500 rounded-full',
  'Cancelado': 'bg-destructive text-white border-destructive rounded-full',
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets();
  }, []);

  async function fetchBudgets() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budgets')
        .select('*, events(name, status, client:clients(name, whatsapp)), menu_templates(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar orçamentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleWhatsApp = async (eventId: string, _clientName?: string, _eventName?: string) => {
    // abre a aba já no clique (evita bloqueio de pop-up no celular)
    const w = window.open('', '_blank');
    try {
      const res = await authFetch(`/api/proposals/${eventId}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar proposta.');
      if (data.whatsappLink) {
        if (w) w.location.href = data.whatsappLink;
        else window.location.href = data.whatsappLink;
        toast.success('Proposta enviada! Finalize o envio no WhatsApp.');
      } else {
        w?.close();
        try { await navigator.clipboard.writeText(data.publicUrl); } catch {}
        toast.warning('Cliente sem WhatsApp/telefone. Link da proposta copiado.');
      }
      fetchBudgets();
    } catch (error: any) {
      w?.close();
      toast.error(error.message || 'Erro ao enviar proposta.');
    }
  };

  const handleDownloadPdf = (eventId: string) => {
    openProtectedPdf(`/api/proposals/${eventId}/pdf?download=true`, true, 'proposta.pdf').catch((e) => toast.error(e.message));
  };

  const handleViewPdf = (eventId: string) => {
    openProtectedPdf(`/api/proposals/${eventId}/pdf`).catch((e) => toast.error(e.message));
  };

  const proposalLabel: Record<string, { text: string; cls: string }> = {
    rascunho: { text: 'Rascunho', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    enviada: { text: 'Enviada', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    aceita: { text: 'Aceita', cls: 'bg-success/10 text-success border-success/30' },
    recusada: { text: 'Recusada', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  };
  const ProposalBadge = ({ status, validUntil }: { status?: string; validUntil?: string | null }) => {
    const key = status || 'rascunho';
    const text = proposalLabel[key]?.text ?? 'Rascunho';
    if (key === 'enviada' && validUntil && new Date(validUntil + 'T23:59:59') < new Date()) {
      return <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-full border font-semibold bg-warning/10 text-warning border-warning/40">Expirada</span>;
    }
    return <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${proposalLabel[key]?.cls ?? proposalLabel.rascunho.cls}`}>Proposta: {text}</span>;
  };

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Orçamentos</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base leading-relaxed">Gere e gerencie propostas comerciais para seus eventos.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold shadow-sm flex items-center gap-2 w-full md:w-auto px-5 text-base">
          <Link href="/dashboard/budgets/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Novo Orçamento
          </Link>
        </Button>
      </header>

      <div className="md:hidden space-y-3 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4 rounded-2xl border-border bg-white mx-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary"></div>
            <p className="text-sm font-medium">Carregando orçamentos...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-white text-slate-500 p-6 text-center mx-1">
            <FileText className="w-14 h-14 mb-4 shrink-0 text-primary/40" />
            <p className="text-base sm:text-lg font-semibold text-slate-900">Nenhum orçamento gerado.</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">Clique em &quot;Novo Orçamento&quot; para começar.</p>
          </div>
        ) : (
          budgets.map((budget) => (
            <div key={budget.id} className="bg-white border-border shadow-card rounded-2xl p-4 sm:p-5 hover:shadow-card-hover w-full transition-shadow">
              <div className="space-y-4 w-full">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-lg truncate">{budget.events?.name}</p>
                    <p className="text-sm text-slate-500 truncate font-medium">{budget.events?.client?.name}</p>
                  </div>
                  <span className={`text-[11px] px-3 py-1 border font-semibold uppercase tracking-tight shrink-0 ${
                    statusStyles[budget.events?.status] || 'bg-slate-500 text-white border-slate-500 rounded-full'
                  }`}>
                    {budget.events?.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 mt-3">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Cardápio</p>
                    <p className="text-sm sm:text-base text-slate-700 truncate font-semibold mt-0.5">{budget.menu_templates?.name || 'Personalizado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Criado em</p>
                    <p className="text-sm sm:text-base text-slate-700 font-semibold mt-0.5">{new Date(budget.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-3 mt-3 space-y-3">
                  <div>
                    <ProposalBadge status={budget.proposal_status} validUntil={budget.proposal_valid_until} />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-2">Valor Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary break-words">
                      R$ {Number(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button
                    className="w-full h-12 rounded-xl bg-success hover:bg-success/90 text-white font-semibold"
                    onClick={() => handleWhatsApp(budget.event_id, budget.events?.client?.name, budget.events?.name)}
                  >
                    <MessageSquare />
                    Enviar proposta no WhatsApp
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-11 rounded-xl font-semibold border-slate-200 text-slate-700" onClick={() => handleViewPdf(budget.event_id)}>
                      <Eye />
                      Ver proposta
                    </Button>
                    <Button variant="outline" className="h-11 rounded-xl font-semibold border-slate-200 text-slate-700" onClick={() => handleDownloadPdf(budget.event_id)}>
                      <Download />
                      Baixar PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block bg-white border-border shadow-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-600 font-semibold text-sm">Evento / Cliente</TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">Cardápio</TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">Data Criação</TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm text-right">Valor Total</TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm text-center">Status Evento</TableHead>
                <TableHead className="text-right text-slate-600 font-semibold text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium">Carregando orçamentos...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : budgets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic font-medium">
                  Nenhum orçamento gerado.
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((budget) => (
                <TableRow key={budget.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-bold text-slate-900 text-base">{budget.events?.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">{budget.events?.client?.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-700 text-sm font-semibold">
                      {budget.menu_templates?.name || 'Personalizado'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm font-semibold">
                    {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 text-base">
                    R$ {Number(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                     <span className={`text-[11px] px-3 py-1 border font-semibold uppercase tracking-tight ${
                        statusStyles[budget.events?.status] || 'bg-slate-500 text-white border-slate-500 rounded-full'
                      }`}>
                        {budget.events?.status}
                      </span>
                      <div className="mt-1.5"><ProposalBadge status={budget.proposal_status} validUntil={budget.proposal_valid_until} /></div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button
                        size="sm"
                        className="h-10 rounded-lg bg-success hover:bg-success/90 text-white font-semibold px-3.5"
                        onClick={() => handleWhatsApp(budget.event_id, budget.events?.client?.name, budget.events?.name)}
                        title="Enviar proposta por WhatsApp"
                      >
                        <MessageSquare />
                        Enviar
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="h-10 w-10 rounded-lg border-slate-200 text-slate-600 hover:text-primary hover:bg-primary/5"
                        onClick={() => handleViewPdf(budget.event_id)}
                        title="Ver proposta"
                        aria-label="Ver proposta"
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="h-10 w-10 rounded-lg border-slate-200 text-slate-600 hover:text-primary hover:bg-primary/5"
                        onClick={() => handleDownloadPdf(budget.event_id)}
                        title="Baixar PDF"
                        aria-label="Baixar PDF"
                      >
                        <Download />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
