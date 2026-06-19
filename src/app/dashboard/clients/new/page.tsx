'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewClientPage() {
  console.log('NewClientPage component is rendering!');
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setLoading(true);

    try {
      console.log('Inserting client...');
      const { data, error } = await supabase
        .from('clients')
        .insert([formData])
        .select();

      console.log('Supabase response:', { data, error });

      if (error) throw error;

      toast.success('Cliente cadastrado com sucesso!');
      router.push('/dashboard/clients');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erro ao cadastrar cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5">
          <Link href="/dashboard/clients">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Novo Cliente</h1>
          <p className="text-zinc-400">Preencha os dados básicos para cadastro.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10 p-6">
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-primary" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name" className="text-zinc-300">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Nome do cliente ou empresa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document" className="text-zinc-300">CPF ou CNPJ</Label>
                <Input
                  id="document"
                  placeholder="000.000.000-00"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-zinc-300">Telefone Fixo</Label>
                <Input
                  id="phone"
                  placeholder="(00) 0000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-white/5 border-white/10 text-white focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-zinc-300">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 90000-0000"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="bg-white/5 border-white/10 text-white focus:border-primary transition-all border-primary/30"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/10 p-6 flex justify-end gap-4">
            <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
              <Link href="/dashboard/clients">Cancelar</Link>
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
