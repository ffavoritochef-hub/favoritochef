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
  MoreVertical, 
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
      console.log('Iniciando busca de clientes...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro Supabase:', error);
        throw error;
      }
      
      console.log('Clientes retornados:', data);
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro na função fetchClients:', error);
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
    <div className="space-y-5 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter neon-glow">Clientes</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Gerencie sua base de clientes e contatos.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2 w-full md:w-auto">
          <Link href="/dashboard/clients/new">
            <PlusCircle className="w-5 h-5 shrink-0" />
            Novo Cliente
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 shrink-0" />
        <Input 
          placeholder="Buscar por nome, e-mail ou documento..." 
          className="pl-11 sm:pl-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-primary transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Cards para mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-sm">Carregando clientes...</span>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500 italic rounded-xl border border-dashed border-white/10 bg-white/5 text-sm">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <UserIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-white truncate">{client.name}</p>
                  </div>
                  {client.document && (
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{client.document}</p>
                  )}
                  <div className="mt-3 space-y-1.5">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate text-xs">{client.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">
                    <Button variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-primary hover:bg-primary/10">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10">
                      <Trash2 className="w-4 h-4" />
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
          <Table className="min-w-[700px]">
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-zinc-400">Cliente</TableHead>
                <TableHead className="text-zinc-400">Documento</TableHead>
                <TableHead className="text-zinc-400">Contato</TableHead>
                <TableHead className="text-right text-zinc-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-zinc-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Carregando clientes...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-zinc-500 italic">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{client.name}</p>
                        <p className="text-xs text-zinc-500">{client.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-mono text-sm">
                    {client.document}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Phone className="w-3 h-3 text-primary" />
                        {client.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Mail className="w-3 h-3 text-primary" />
                        {client.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-primary hover:bg-primary/10">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
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
