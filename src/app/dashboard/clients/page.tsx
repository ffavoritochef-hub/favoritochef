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
  Search, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document?.includes(searchTerm)
  );

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base leading-relaxed">Gerencie sua base de clientes e contatos.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold flex items-center gap-2 w-full md:w-auto px-5 text-base">
          <Link href="/dashboard/clients/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Novo Cliente
          </Link>
        </Button>
      </header>

      <div className="relative px-1 sm:px-0">
        <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 shrink-0" />
        <Input 
          placeholder="Buscar por nome, e-mail ou documento..." 
          className="bg-white border-border rounded-2xl pl-12 sm:pl-14 h-12 text-slate-900 placeholder:text-slate-400 text-base border focus:border-primary transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="md:hidden space-y-3 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4 rounded-2xl border border-border bg-white mx-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary/40 opacity-70"></div>
            <p className="text-sm font-medium">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border bg-white rounded-2xl text-slate-500 p-6 text-center mx-1">
            <UserIcon className="w-14 h-14 mb-4 text-primary/40 opacity-70 shrink-0" />
            <p className="text-base sm:text-lg font-semibold text-slate-900">Nenhum cliente encontrado.</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">Tente buscar por outro termo ou cadastre um novo cliente.</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="group relative rounded-2xl bg-white border-border shadow-card p-4 sm:p-5 hover:shadow-card-hover transition-all duration-200 w-full">
              <div className="flex items-start gap-3 sm:gap-4 w-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <UserIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 w-full">
                    <p className="font-bold text-slate-900 text-lg truncate">{client.name}</p>
                  </div>
                  {client.document && (
                    <p className="text-sm text-slate-500 font-mono mt-1">{client.document}</p>
                  )}
                  <div className="mt-3 sm:mt-4 space-y-2">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 font-medium">
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 font-medium">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="h-11 rounded-xl font-semibold px-4 border-primary/20 text-primary hover:bg-primary hover:text-white">
                      <Edit className="w-4 h-4 mr-1.5" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="h-11 rounded-xl font-semibold px-4 border-destructive/20 text-destructive hover:bg-destructive hover:text-white">
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Excluir
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
          <Table className="min-w-[700px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-600 font-semibold text-sm">Cliente</TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">Documento</TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">Contato</TableHead>
                <TableHead className="text-right text-slate-600 font-semibold text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary/40 opacity-70"></div>
                    <span className="text-sm font-medium">Carregando clientes...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                    <UserIcon className="w-10 h-10 text-primary/40 opacity-70" />
                    <p className="font-semibold text-slate-900">Nenhum cliente encontrado.</p>
                    <p className="text-sm">Tente buscar por outro termo ou cadastre um novo cliente.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700 font-mono text-sm font-semibold">
                    {client.document}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        {client.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        {client.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5">
                        <Edit className="w-4.5 h-4.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5">
                        <Trash2 className="w-4.5 h-4.5" />
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
