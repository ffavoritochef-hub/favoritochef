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
  Eye,
  MoreVertical,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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

  const handleWhatsApp = async (eventId: string, clientName: string, eventName: string) => {
    try {
      const response = await fetch(`/api/proposals/${eventId}/whatsapp`);
      const data = await response.json();
      if (data.link) {
        window.open(data.link, '_blank');
      } else {
        toast.error('WhatsApp do cliente não cadastrado.');
      }
    } catch (error) {
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
    <div className="space-y-5 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter neon-glow">Orçamentos</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Gere e gerencie propostas comerciais para seus eventos.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2 w-full md:w-auto min-h-[44px] sm:min-h-0">
          <Link href="/dashboard/budgets/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Novo Orçamento
          </Link>
        </Button>
      </header>

      {/* Cards para mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-sm">Carregando orçamentos...</span>
            </div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500 italic rounded-xl border border-dashed border-white/10 bg-white/5 text-sm">
            Nenhum orçamento gerado.
          </div>
        ) : (
          budgets.map((budget) => (
            <div key={budget.id} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{budget.events?.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{budget.events?.client?.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border shrink-0 ${
                    budget.events?.status === 'Aprovado' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {budget.events?.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Cardápio</p>
                    <p className="text-xs text-zinc-300 truncate">{budget.menu_templates?.name || 'Personalizado'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Criado em</p>
                    <p className="text-xs text-zinc-300">{new Date(budget.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                
                <div className="flex items-end justify-between pt-2 border-t border-white/5">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Valor Total</p>
                    <p className="text-lg font-bold text-primary neon-glow">
                      R$ {Number(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="text-zinc-400 hover:text-primary"
                      onClick={() => handleDownloadPdf(budget.event_id)}
                      title="Baixar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="text-zinc-400 hover:text-green-400"
                      onClick={() => handleWhatsApp(budget.event_id, budget.events?.client?.name, budget.events?.name)}
                      title="Enviar WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="text-zinc-400 hover:text-white"
                      onClick={() => handleViewPdf(budget.event_id)}
                      title="Visualizar Proposta"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tabela para desktop */}
      <div className="hidden md:block rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-400">Evento / Cliente</TableHead>
                <TableHead className="text-zinc-400">Cardápio</TableHead>
                <TableHead className="text-zinc-400">Data Criação</TableHead>
                <TableHead className="text-zinc-400 text-right">Valor Total</TableHead>
                <TableHead className="text-zinc-400 text-center">Status Evento</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  Carregando orçamentos...
                </TableCell>
              </TableRow>
            ) : budgets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500 italic">
                  Nenhum orçamento gerado.
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((budget) => (
                <TableRow key={budget.id} className="hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-bold text-white">{budget.events?.name}</p>
                      <p className="text-xs text-zinc-500">{budget.events?.client?.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-zinc-300 text-sm">
                      {budget.menu_templates?.name || 'Personalizado'}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    R$ {Number(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                        budget.events?.status === 'Aprovado' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {budget.events?.status}
                      </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-primary"
                        onClick={() => handleDownloadPdf(budget.event_id)}
                        title="Baixar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-green-400"
                        onClick={() => handleWhatsApp(budget.event_id, budget.events?.client?.name, budget.events?.name)}
                        title="Enviar WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-white"
                        onClick={() => handleViewPdf(budget.event_id)}
                        title="Visualizar Proposta"
                      >
                        <Eye className="w-4 h-4" />
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
