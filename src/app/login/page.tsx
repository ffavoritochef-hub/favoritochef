'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.refresh();
        setLoading(false);
        router.push('/dashboard');
      }
    } catch (err) {
      setError((err as Error)?.message || 'Erro inesperado ao autenticar');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black overflow-hidden relative">
      {/* Background Neon Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />

      <Card className="w-[400px] bg-black/40 backdrop-blur-xl border-primary/30 neon-border z-10">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-bold tracking-tighter neon-glow text-white">
            Agenda Buffet
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Entre para gerenciar seus eventos com estilo.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-primary/20 focus:border-primary focus:ring-primary/50 transition-all text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-primary/20 focus:border-primary focus:ring-primary/50 transition-all text-white"
              />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-6 transition-all shadow-[0_0_20px_rgba(188,19,254,0.3)] hover:shadow-[0_0_30px_rgba(188,19,254,0.5)]" 
              disabled={loading}
            >
              {loading ? 'Autenticando...' : 'Acessar Sistema'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
