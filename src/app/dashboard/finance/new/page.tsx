'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ChevronLeft, Save, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewTransactionPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'receivable',
    date: new Date().toISOString().split('T')[0],
    status: 'pago'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('finance_transactions')
        .insert([formData]);

      if (error) throw error;

      toast.success('Transação registrada com sucesso!');
      router.push('/dashboard/finance');
    } catch (error: any) {
      toast.error('Erro ao registrar transação: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5">
          <Link href="/dashboard/finance">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter neon-glow">Nova Transação</h1>
          <p className="text-zinc-400">Registre uma entrada ou saída de caixa.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <Card className="bg-white/5 border-primary/20 neon-border backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10 p-6">
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="w-5 h-5 text-primary" />
              Dados da Transação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-300">Tipo de Transação</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, type: 'receivable' })}
                  className={`py-8 border-2 transition-all ${
                    formData.type === 'receivable' 
                      ? 'border-green-500/50 bg-green-500/10 text-green-400' 
                      : 'border-white/10 text-zinc-500'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5 mr-2" />
                  Receita (Entrada)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, type: 'payable' })}
                  className={`py-8 border-2 transition-all ${
                    formData.type === 'payable' 
                      ? 'border-red-500/50 bg-red-500/10 text-red-400' 
                      : 'border-white/10 text-zinc-500'
                  }`}
                >
                  <ArrowDownRight className="w-5 h-5 mr-2" />
                  Despesa (Saída)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc" className="text-zinc-300">Descrição</Label>
              <Input
                id="desc"
                placeholder="Ex: Pagamento Evento Casamento, Compra de Bebidas..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-zinc-300">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-zinc-300">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-primary">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="pago">Pago / Recebido</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="bg-white/5 border-t border-white/10 p-6 flex justify-end gap-4">
            <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
              <Link href="/dashboard/finance">Cancelar</Link>
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-5 h-5" />
              {loading ? 'Registrando...' : 'Salvar Transação'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
