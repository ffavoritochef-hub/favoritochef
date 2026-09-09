'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  User as UserIcon,
  MoreVertical,
  Ban,
  Power,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type ClientRow = any;

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    id: string;
    kind: 'delete' | 'toggle';
    nextIsActive?: boolean;
    clientName?: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('is_active', { ascending: false })
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = useMemo(() => {
    const list = clients.filter((c) =>
      showInactive ? true : c.is_active !== false
    );
    if (!searchTerm.trim()) return list;
    const q = searchTerm.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.document?.includes(q) ||
        c.phone?.includes(q) ||
        c.whatsapp?.includes(q)
    );
  }, [clients, searchTerm, showInactive]);

  function openDelete(client: ClientRow) {
    setConfirmData({
      id: client.id,
      kind: 'delete',
      clientName: client.name,
    });
    setConfirmOpen(true);
  }

  function openToggle(client: ClientRow) {
    setConfirmData({
      id: client.id,
      kind: 'toggle',
      nextIsActive: client.is_active === false ? true : false,
      clientName: client.name,
    });
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmData) return;
    try {
      setConfirmLoading(true);

      if (confirmData.kind === 'delete') {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', confirmData.id);
        if (error) {
          if (
            /violates foreign key|fk_|foreign key constraint/i.test(
              error.message || ''
            ) ||
            error.code === '23503'
          ) {
            toast.error(
              'Cliente possui eventos vinculados. Prefira inativar ao invés de excluir.'
            );
            return;
          }
          throw error;
        }
        toast.success('Cliente excluído permanentemente.');
      } else if (confirmData.kind === 'toggle') {
        const nextIsActive = confirmData.nextIsActive === true;
        const { error } = await supabase
          .from('clients')
          .update({ is_active: nextIsActive })
          .eq('id', confirmData.id);
        if (error) throw error;
        toast.success(
          nextIsActive ? 'Cliente ativado com sucesso.' : 'Cliente inativado com sucesso.'
        );
      }

      setConfirmOpen(false);
      setConfirmData(null);
      await fetchClients();
    } catch (error: any) {
      toast.error(error.message || 'Falha na operação.');
    } finally {
      setConfirmLoading(false);
    }
  }

  function handleEdit(id: string) {
    router.push(`/dashboard/clients/${id}/edit`);
  }

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Clientes
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base leading-relaxed">
            Gerencie sua base de clientes e contatos.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
            className="h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
          >
            {showInactive ? (
              <>
                <Power className="w-4 h-4 mr-2 text-success" />
                Ocultar inativos
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-2 text-slate-400" />
                Mostrar inativos
              </>
            )}
          </Button>
          <Button
            asChild
            className="bg-primary hover:bg-primary-dark text-white rounded-xl h-12 font-semibold flex items-center gap-2 w-full md:w-auto px-5 text-base"
          >
            <Link href="/dashboard/clients/new">
              <PlusCircle className="w-5 h-5 shrink-0" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative px-1 sm:px-0">
        <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 shrink-0" />
        <Input
          placeholder="Buscar por nome, e-mail, documento ou telefone..."
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
            <p className="text-base sm:text-lg font-semibold text-slate-900">
              Nenhum cliente encontrado.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Tente buscar por outro termo ou cadastre um novo cliente.
            </p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const inactive = client.is_active === false;
            return (
              <div
                key={client.id}
                className={`group relative rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all w-full ${
                  inactive ? 'opacity-70' : ''
                }`}
              >
                {inactive ? (
                  <Badge
                    variant="secondary"
                    className="absolute top-3 right-3 rounded-full border-slate-200 bg-slate-100 text-slate-600"
                  >
                    Inativo
                  </Badge>
                ) : null}
                <div className="flex items-start gap-3 sm:gap-4 w-full pr-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <UserIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 w-full">
                      <p className="font-bold text-slate-900 text-lg truncate">
                        {client.name}
                      </p>
                    </div>
                    {client.document ? (
                      <p className="text-sm text-slate-500 font-mono mt-1">
                        {client.document}
                      </p>
                    ) : null}
                    <div className="mt-3 sm:mt-4 space-y-2">
                      {client.phone || client.whatsapp ? (
                        <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 font-medium">
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                          <span className="truncate">
                            {client.whatsapp || client.phone}
                          </span>
                        </div>
                      ) : null}
                      {client.email ? (
                        <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 font-medium">
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client.id)}
                          className="h-11 rounded-xl font-semibold px-4 border-primary/20 text-primary hover:bg-primary hover:text-white"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Editar
                        </Button>
                        {inactive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openToggle(client)}
                            className="h-11 rounded-xl font-semibold px-4 border-success/20 text-success hover:bg-success hover:text-white"
                          >
                            <Power className="w-4 h-4 mr-1.5" />
                            Ativar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openToggle(client)}
                            className="h-11 rounded-xl font-semibold px-4 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Ban className="w-4 h-4 mr-1.5" />
                            Inativar
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDelete(client)}
                        className="h-11 w-11 rounded-xl text-slate-400 hover:text-destructive hover:bg-destructive/5"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block bg-white border-border shadow-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[780px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-600 font-semibold text-sm">
                  Cliente
                </TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">
                  Status
                </TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">
                  Documento
                </TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">
                  Contato
                </TableHead>
                <TableHead className="text-right text-slate-600 font-semibold text-sm w-[140px]">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary/40 opacity-70"></div>
                      <span className="text-sm font-medium">
                        Carregando clientes...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <UserIcon className="w-10 h-10 text-primary/40 opacity-70" />
                      <p className="font-semibold text-slate-900">
                        Nenhum cliente encontrado.
                      </p>
                      <p className="text-sm">
                        Tente buscar por outro termo ou cadastre um novo cliente.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const inactive = client.is_active === false;
                  return (
                    <TableRow
                      key={client.id}
                      className={`hover:bg-slate-50/50 border-slate-100 transition-colors ${
                        inactive ? 'opacity-70' : ''
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <UserIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {client.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {client.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {inactive ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full border-slate-200 bg-slate-100 text-slate-600"
                          >
                            Inativo
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-success/10 text-success border-success/20 border">
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700 font-mono text-sm font-semibold">
                        {client.document}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            {client.whatsapp || client.phone}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                            {client.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                            >
                              <MoreVertical className="w-4.5 h-4.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl">
                            <DropdownMenuItem onClick={() => handleEdit(client.id)}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openToggle(client)}
                            >
                              {inactive ? (
                                <>
                                  <Power className="w-4 h-4 mr-2 text-success" />
                                  Ativar
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-2 text-slate-500" />
                                  Inativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDelete(client)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          if (confirmLoading) return;
          setConfirmOpen(v);
          if (!v) setConfirmData(null);
        }}
        title={
          confirmData?.kind === 'delete'
            ? `Excluir cliente ${confirmData.clientName ? `"${confirmData.clientName}"` : ''}?`
            : confirmData?.nextIsActive === true
            ? `Deseja ativar o cliente?`
            : `Deseja inativar o cliente?`
        }
        description={
          confirmData?.kind === 'delete'
            ? 'Este cliente será removido permanentemente. Não é possível desfazer.'
            : confirmData?.nextIsActive === true
            ? 'O cliente voltará a aparecer normalmente nos formulários.'
            : 'O cliente deixará de ser exibido por padrão, mas mantém o histórico de eventos.'
        }
        dangerLabel={
          confirmData?.kind === 'delete'
            ? 'Exclusão permanente: se houver eventos vinculados, a exclusão será bloqueada automaticamente.'
            : undefined
        }
        variant={confirmData?.kind === 'delete' ? 'destructive' : 'warning'}
        confirmText={
          confirmData?.kind === 'delete'
            ? 'Sim, excluir'
            : confirmData?.nextIsActive === true
            ? 'Confirmar ativação'
            : 'Confirmar inativação'
        }
        onConfirm={handleConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}

