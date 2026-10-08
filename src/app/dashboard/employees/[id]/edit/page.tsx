'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, Save, HardHat } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function EditEmployeePage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    observations: '',
    is_active: true,
  });

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  async function fetchEmployee() {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name || '',
          role: data.role || '',
          phone: data.phone || '',
          email: data.email || '',
          observations: data.observations || '',
          is_active: data.is_active !== false,
        });
      }
    } catch (error: any) {
      toast.error('Erro ao carregar funcionário: ' + error.message);
      router.push('/dashboard/employees');
    } finally {
      setFetching(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Informe o nome do funcionário.');
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update(formData)
        .eq('id', employeeId);

      if (error) throw error;

      toast.success('Funcionário atualizado com sucesso!');
      router.push('/dashboard/employees');
    } catch (error: any) {
      toast.error('Erro ao atualizar funcionário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
        <div className="animate-pulse space-y-6 sm:space-y-8">
          <div className="h-12 bg-slate-200 rounded-2xl w-2/3"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-8">
      <header className="flex items-center gap-4">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-11 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <Link href="/dashboard/employees">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Editar Funcionário
          </h1>
          <p className="text-sm sm:text-base text-slate-500">
            Atualize os dados do membro da equipe.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HardHat className="size-5" />
              </span>
              Dados do Funcionário
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="field-group md:col-span-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Nome do funcionário"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <Label htmlFor="role">Cargo / Função</Label>
                <Input
                  id="role"
                  placeholder="Ex: Churrasqueiro, Garçom, Chef"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                />
              </div>
              <div className="field-group">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.is_active ? 'ativo' : 'inativo'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, is_active: v === 'ativo' })
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-slate-900">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field-group">
                <Label htmlFor="phone">Telefone / Celular</Label>
                <Input
                  id="phone"
                  placeholder="(00) 90000-0000"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="field-group">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="funcionario@exemplo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="field-group md:col-span-2">
                <Label htmlFor="obs">Observações</Label>
                <textarea
                  id="obs"
                  rows={4}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:bg-muted/50 disabled:opacity-50"
                  placeholder="Observações adicionais sobre o funcionário..."
                  value={formData.observations}
                  onChange={(e) =>
                    setFormData({ ...formData, observations: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/60 border-t border-border px-5 sm:px-8 py-5 sm:py-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end sm:gap-4">
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto h-12 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Link href="/dashboard/employees">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Save className="size-5" />
              {loading ? 'Atualizando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
