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

  const supabaseReady = typeof supabase !== 'undefined' && supabase !== null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabaseReady) {
      setError(
        '⚠️ Sistema em configuração! Variáveis de ambiente do Supabase não foram configuradas na Vercel. ' +
        'Acesse Vercel → Project Settings → Environment Variables e adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
      setLoading(false);
      return;
    }

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
    <div className="flex items-center justify-center min-h-screen bg-black overflow-hidden relative p-4 sm:p-6">
      {/* Background Neon Orbs */}
      <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-[400px] bg-black/50 backdrop-blur-xl border-primary/30 neon-border z-10 shadow-2xl">
        <CardHeader className="text-center space-y-2 px-5 sm:px-6 pt-6 sm:pt-8">
          <CardTitle className="text-3xl sm:text-4xl font-bold tracking-tighter neon-glow text-white">
            Agenda Buffet
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm sm:text-base">
            Entre para gerenciar seus eventos com estilo.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5 sm:space-y-4 px-5 sm:px-6 py-4 sm:py-6">
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

            {!supabaseReady && (
              <div className="text-sm text-yellow-300 bg-yellow-500/10 p-3 sm:p-4 rounded-lg border border-yellow-500/30 space-y-2">
                <p className="font-bold text-sm sm:text-base">⚠️ Configuração pendente</p>
                <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                  Variáveis de ambiente do Supabase não configuradas.<br/>
                  Acesse o painel da Vercel → <b>Settings → Environment Variables</b> e adicione:
                  <br/>• <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code>
                  <br/>• <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                  <br/>Depois faça <b>Redeploy</b>.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
          </CardContent>
          <CardFooter className="px-5 sm:px-6 pb-6 sm:pb-8 pt-0">
            <Button 
              type="submit" 
              size="lg"
              className="w-full bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-[0_0_20px_rgba(188,19,254,0.3)] hover:shadow-[0_0_30px_rgba(188,19,254,0.5)]" 
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
