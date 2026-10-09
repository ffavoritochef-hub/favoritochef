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
  HardHat,
  Ban,
  Power,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type EmployeeRow = any;

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    id: string;
    kind: 'delete' | 'toggle';
    nextIsActive?: boolean;
    employeeName?: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('is_active', { ascending: false })
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar funcionários: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredEmployees = useMemo(() => {
    const list = employees.filter((e) =>
      showInactive ? true : e.is_active !== false
    );
    if (!searchTerm.trim()) return list;
    const q = searchTerm.trim().toLowerCase();
    return list.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
    );
  }, [employees, searchTerm, showInactive]);

  function openDelete(employee: EmployeeRow) {
    setConfirmData({
      id: employee.id,
      kind: 'delete',
      employeeName: employee.name,
    });
    setConfirmOpen(true);
  }

  function openToggle(employee: EmployeeRow) {
    setConfirmData({
      id: employee.id,
      kind: 'toggle',
      nextIsActive: employee.is_active === false ? true : false,
      employeeName: employee.name,
    });
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmData) return;
    try {
      setConfirmLoading(true);

      if (confirmData.kind === 'delete') {
        const { error } = await supabase
          .from('employees')
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
              'Funcionário possui eventos vinculados. Prefira inativar ao invés de excluir.'
            );
            return;
          }
          throw error;
        }
        toast.success('Funcionário excluído permanentemente.');
      } else if (confirmData.kind === 'toggle') {
        const nextIsActive = confirmData.nextIsActive === true;
        const { error } = await supabase
          .from('employees')
          .update({ is_active: nextIsActive })
          .eq('id', confirmData.id);
        if (error) throw error;
        toast.success(
          nextIsActive
            ? 'Funcionário ativado com sucesso.'
            : 'Funcionário inativado com sucesso.'
        );
      }

      setConfirmOpen(false);
      setConfirmData(null);
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Falha na operação.');
    } finally {
      setConfirmLoading(false);
    }
  }

  function handleEdit(id: string) {
    router.push(`/dashboard/employees/${id}/edit`);
  }

  return (
    <div className="w-full space-y-4 sm:space-y-8 -mx-1 px-1 sm:mx-0 sm:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="w-full">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Funcionários
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-base leading-relaxed">
            Gerencie sua equipe e aloque nos eventos.
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
            <Link href="/dashboard/employees/new">
              <PlusCircle className="w-5 h-5 shrink-0" />
              Novo Funcionário
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative px-1 sm:px-0">
        <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 shrink-0" />
        <Input
          placeholder="Buscar por nome, cargo, e-mail ou telefone..."
          className="bg-white border-border rounded-2xl pl-12 sm:pl-14 h-12 text-slate-900 placeholder:text-slate-400 text-base border focus:border-primary transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="md:hidden space-y-3 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4 rounded-2xl border border-border bg-white mx-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-[3px] border-primary/40 opacity-70"></div>
            <p className="text-sm font-medium">Carregando funcionários...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border bg-white rounded-2xl text-slate-500 p-6 text-center mx-1">
            <HardHat className="w-14 h-14 mb-4 text-primary/40 opacity-70 shrink-0" />
            <p className="text-base sm:text-lg font-semibold text-slate-900">
              Nenhum funcionário encontrado.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Tente buscar por outro termo ou cadastre sua equipe.
            </p>
          </div>
        ) : (
          filteredEmployees.map((employee) => {
            const inactive = employee.is_active === false;
            return (
              <div
                key={employee.id}
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
                <div className="flex items-start gap-3 sm:gap-4 w-full">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <HardHat className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 w-full">
                      <p className="font-bold text-slate-900 text-lg truncate">
                        {employee.name}
                      </p>
                    </div>
                    {employee.role ? (
                      <Badge className="mt-1 rounded-full bg-highlight/10 border-highlight/20 border text-highlight">
                        {employee.role}
                      </Badge>
                    ) : null}
                    <div className="mt-3 sm:mt-4 space-y-2">
                      {employee.phone ? (
                        <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 font-medium">
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                          <span className="truncate">{employee.phone}</span>
                        </div>
                      ) : null}
                      {employee.email ? (
                        <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 font-medium">
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(employee.id)}
                        className="h-11 rounded-xl font-semibold px-4 border-primary/20 text-primary hover:bg-primary hover:text-white flex-1 sm:flex-none"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Editar
                      </Button>
                      {inactive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openToggle(employee)}
                          className="h-11 rounded-xl font-semibold px-4 border-success/20 text-success hover:bg-success hover:text-white flex-1 sm:flex-none"
                        >
                          <Power className="w-4 h-4 mr-1.5" />
                          Ativar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openToggle(employee)}
                          className="h-11 rounded-xl font-semibold px-4 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex-1 sm:flex-none"
                        >
                          <Ban className="w-4 h-4 mr-1.5" />
                          Inativar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDelete(employee)}
                        className="size-11 shrink-0 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white" aria-label="Excluir"
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
                  Funcionário
                </TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">
                  Cargo
                </TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">
                  Status
                </TableHead>
                <TableHead className="text-slate-600 font-semibold text-sm">
                  Contato
                </TableHead>
                <TableHead className="text-right text-slate-600 font-semibold text-sm w-[220px]">
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
                        Carregando funcionários...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <HardHat className="w-10 h-10 text-primary/40 opacity-70" />
                      <p className="font-semibold text-slate-900">
                        Nenhum funcionário encontrado.
                      </p>
                      <p className="text-sm">
                        Tente buscar por outro termo ou cadastre um novo.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  const inactive = employee.is_active === false;
                  return (
                    <TableRow
                      key={employee.id}
                      className={`hover:bg-slate-50/50 border-slate-100 transition-colors ${
                        inactive ? 'opacity-70' : ''
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <HardHat className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {employee.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {employee.email || 'Sem e-mail'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.role ? (
                          <Badge className="rounded-full bg-highlight/10 border-highlight/20 border text-highlight">
                            {employee.role}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
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
                      <TableCell>
                        <div className="space-y-1.5">
                          {employee.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                              <Phone className="w-3.5 h-3.5 text-primary" />
                              {employee.phone}
                            </div>
                          )}
                          {employee.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                              <Mail className="w-3.5 h-3.5 text-primary" />
                              {employee.email}
                            </div>
                          )}
                          {!employee.phone && !employee.email && (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(employee.id)}
                            className="rounded-lg font-semibold border-primary/20 text-primary hover:bg-primary hover:text-white"
                          >
                            <Edit className="mr-1" />
                            Editar
                          </Button>
                          {inactive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openToggle(employee)}
                              className="rounded-lg font-semibold border-success/20 text-success hover:bg-success hover:text-white"
                              title="Ativar"
                            >
                              <Power />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openToggle(employee)}
                              className="rounded-lg font-semibold border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              title="Inativar"
                            >
                              <Ban />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDelete(employee)}
                            className="rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5"
                            title="Excluir"
                          >
                            <Trash2 />
                          </Button>
                        </div>
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
            ? `Excluir funcionário ${
                confirmData.employeeName
                  ? `"${confirmData.employeeName}"`
                  : ''
              }?`
            : confirmData?.nextIsActive === true
            ? `Deseja ativar o funcionário?`
            : `Deseja inativar o funcionário?`
        }
        description={
          confirmData?.kind === 'delete'
            ? 'Este funcionário será removido permanentemente. Não é possível desfazer.'
            : confirmData?.nextIsActive === true
            ? 'O funcionário voltará a aparecer normalmente nos formulários.'
            : 'O funcionário deixará de ser exibido por padrão, mas mantém o histórico de eventos.'
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
