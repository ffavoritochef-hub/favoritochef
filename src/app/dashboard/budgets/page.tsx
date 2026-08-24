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
import Link from 'next/link';

const statusStyles: Record<string, string> = {
  'Orçamento enviado': 'bg-sky-500 text-white border-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.4)]',
  'Aguardando aprovação': 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.45)]',
  'Aprovado': 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]',
  'Em andamento': 'bg-violet-500 text-white border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]',
  'Finalizado': 'bg-zinc-600 text-white border-zinc-500',
  'Cancelado': 'bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.45)]',
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

  const handleWhatsApp = async (eventId: string, _clientName: string, _eventName: string) => {
    try {
      const response = await fetch(`/api/proposals/${eventId}/whatsapp`);
      const data = await response.json();
      if (data.link) {
        window.open(data.link, '_blank');
      } else {
        toast.error('WhatsApp do cliente não cadastrado.');
      }
    } catch (_error) {
      toast.error('Erro ao gerar link do WhatsApp.');
    }
  };

  const handleDownloadPdf = (eventId: string) => {
    window.open(`/api/proposals/${eventId}/pdf?download=true`, '_blank');
  };

  const handleViewPdf = (eventId: string) => {
    window.open(`/api/proposals/${eventId}/pdf?download=false`, '_blank');
  };

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight neon-glow">Orçamentos</h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-base leading-relaxed">Gere e gerencie propostas comerciais para seus eventos.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/85 text-white font-extrabold transition-all shadow-[0_0_20px_rgba(188,19,254,0.35)] flex items-center gap-2 w-full md:w-auto min-h-[48px] px-5 rounded-xl text-base">
          <Link href="/dashboard/budgets/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Novo Orçamento
          </Link>
        </Button>
      </header>

      <div className="md:hidden space-y-3 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] mx-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary"></div>
            <p className="text-sm font-medium">Carregando orçamentos...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.03] text-zinc-400 p-6 text-center mx-1">
            <FileText className="w-14 h-14 mb-4 opacity-30 shrink-0 text-primary/50" />
            <p className="text-base sm:text-lg font-medium text-white/80">Nenhum orçamento gerado.</p>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2">Clique em &quot;Novo Orçamento&quot; para começar.</p>
          </div>
        ) : (
          budgets.map((budget) => (
            <div key={budget.id} className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 sm:p-5 hover:from-white/[0.09] hover:to-white/[0.04] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_25px_rgba(188,19,254,0.12)] w-full">
              <div className="space-y-4 w-full">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-lg sm:text-xl truncate">{budget.events?.name}</p>
                    <p className="text-xs sm:text-sm text-zinc-400 truncate font-medium">{budget.events?.client?.name}</p>
                  </div>
                  <span className={`text-[11px] px-3 py-1 rounded-full border font-extrabold uppercase tracking-tight shrink-0 ${
                    statusStyles[budget.events?.status] || 'bg-zinc-700 text-white border-zinc-600'
                  }`}>
                    {budget.events?.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Cardápio</p>
                    <p className="text-sm sm:text-base text-zinc-200 truncate font-semibold mt-0.5">{budget.menu_templates?.name || 'Personalizado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Criado em</p>
                    <p className="text-sm sm:text-base text-zinc-200 font-semibold mt-0.5">{new Date(budget.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                
                <div className="flex items-end justify-between pt-3 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Valor Total</p>
                    <p className="text-xl sm:text-2xl font-black text-primary neon-glow break-all">
                      R$ {Number(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-primary border-primary/30 hover:bg-primary hover:text-white h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl"
                      onClick={() => handleDownloadPdf(budget.event_id)}
                      title="Baixar PDF"
                    >
                      <Download className="w-4.5 h-4.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-emerald-400 border-emerald-400/30 hover:bg-emerald-500 hover:text-white h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl"
                      onClick={() => handleWhatsApp(budget.event_id, budget.events?.client?.name, budget.events?.name)}
                      title="Enviar WhatsApp"
                    >
                      <MessageSquare className="w-4.5 h-4.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-zinc-300 border-white/20 hover:bg-white/10 hover:text-white h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl"
                      onClick={() => handleViewPdf(budget.event_id)}
                      title="Visualizar Proposta"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-white/[0.05]">
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-300 font-bold text-sm">Evento / Cliente</TableHead>
                <TableHead className="text-zinc-300 font-bold text-sm">Cardápio</TableHead>
                <TableHead className="text-zinc-300 font-bold text-sm">Data Criação</TableHead>
                <TableHead className="text-zinc-300 font-bold text-sm text-right">Valor Total</TableHead>
                <TableHead className="text-zinc-300 font-bold text-sm text-center">Status Evento</TableHead>
                <TableHead className="text-right text-zinc-300 font-bold text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-400">
                  <div className="flex items-center justify-center gap-2 text-zinc-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium">Carregando orçamentos...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : budgets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-400 italic font-medium">
                  Nenhum orçamento gerado.
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((budget) => (
                <TableRow key={budget.id} className="hover:bg-white/[0.05] border-white/5 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-bold text-white text-base">{budget.events?.name}</p>
                      <p className="text-xs sm:text-sm text-zinc-400 font-medium">{budget.events?.client?.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-zinc-200 text-sm font-semibold">
                      {budget.menu_templates?.name || 'Personalizado'}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-300 text-sm font-semibold">
                    {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right font-black text-white text-base">
                    R$ {Number(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                     <span className={`text-[11px] px-3 py-1 rounded-full border font-extrabold uppercase tracking-tight ${
                        statusStyles[budget.events?.status] || 'bg-zinc-700 text-white border-zinc-600'
                      }`}>
                        {budget.events?.status}
                      </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-primary hover:bg-primary/10 h-10 w-10"
                        onClick={() => handleDownloadPdf(budget.event_id)}
                        title="Baixar PDF"
                      >
                        <Download className="w-4.5 h-4.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 h-10 w-10"
                        onClick={() => handleWhatsApp(budget.event_id, budget.events?.client?.name, budget.events?.name)}
                        title="Enviar WhatsApp"
                      >
                        <MessageSquare className="w-4.5 h-4.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-white hover:bg-white/10 h-10 w-10"
                        onClick={() => handleViewPdf(budget.event_id)}
                        title="Visualizar Proposta"
                      >
                        <Eye className="w-4.5 h-4.5" />
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
