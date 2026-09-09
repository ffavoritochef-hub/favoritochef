'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Save, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface FormState {
  name: string;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  address?: string;
}

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState<FormState>({
    name: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
  });

  useEffect(() => {
    if (!params?.id) return;
    fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function fetchClient() {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name ?? '',
          document: data.document ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          whatsapp: data.whatsapp ?? '',
          address: data.address ?? '',
        });
      }
    } catch (error: any) {
      toast.error('Erro ao carregar cliente: ' + error.message);
      router.push('/dashboard/clients');
    } finally {
      setFetching(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params?.id) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          document: formData.document || null,
          email: formData.email || null,
          phone: formData.phone || null,
          whatsapp: formData.whatsapp || null,
          address: formData.address || null,
        })
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Cliente atualizado com sucesso!');
      router.push('/dashboard/clients');
      router.refresh();
    } catch (error: any) {
      toast.error('Erro ao atualizar cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-16 sm:pb-8">
        <div className="flex flex-col items-center justify-center h-80 text-slate-500 gap-4 rounded-2xl border border-border bg-white">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Carregando cliente...</p>
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
          <Link href="/dashboard/clients">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Editar Cliente
          </h1>
          <p className="text-sm sm:text-base text-slate-500">
            Atualize os dados cadastrais do cliente.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <Card className="shadow-card border-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-border px-5 sm:px-8 py-5 sm:py-6">
            <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl text-slate-900">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="size-5" />
              </span>
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="field-group md:col-span-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Nome do cliente ou empresa"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <Label htmlFor="document">CPF ou CNPJ</Label>
                <Input
                  id="document"
                  placeholder="000.000.000-00"
                  value={formData.document}
                  onChange={(e) =>
                    setFormData({ ...formData, document: e.target.value })
                  }
                />
              </div>
              <div className="field-group">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@exemplo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="field-group">
                <Label htmlFor="phone">Telefone Fixo</Label>
                <Input
                  id="phone"
                  placeholder="(00) 0000-0000"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="field-group">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 90000-0000"
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: e.target.value })
                  }
                />
              </div>
              <div className="field-group md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Rua, Número, Bairro - Cidade"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
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
              <Link href="/dashboard/clients">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Save className="size-5" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
