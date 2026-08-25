'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, AlertTriangle } from 'lucide-react';

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
        'Sistema em configuração! Variáveis de ambiente do Supabase não foram configuradas na Vercel. ' +
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Agenda Buffet
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Sistema de gestão para buffets e eventos
            </p>
          </div>
        </div>

        <Card className="shadow-card border-border bg-white">
          <CardHeader className="text-center space-y-1.5 px-5 sm:px-6 pt-6 sm:pt-7">
            <CardTitle className="text-xl font-bold text-slate-900">
              Acessar sua conta
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Entre com seu e-mail e senha para continuar
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 px-5 sm:px-6 py-4 sm:py-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white border-border focus:border-primary focus:ring-primary/20 text-slate-900 placeholder:text-slate-400 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white border-border focus:border-primary focus:ring-primary/20 text-slate-900 rounded-xl"
                />
              </div>

              {!supabaseReady && (
                <div className="text-sm bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">Configuração pendente</p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Variáveis de ambiente do Supabase não configuradas.<br/>
                        Acesse o painel da Vercel → Settings → Environment Variables e adicione:
                        <br/>• <code className="bg-white px-1.5 py-0.5 rounded text-[11px] border border-amber-200">NEXT_PUBLIC_SUPABASE_URL</code>
                        <br/>• <code className="bg-white px-1.5 py-0.5 rounded text-[11px] border border-amber-200">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                        <br/>Depois faça Redeploy.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm bg-destructive/5 text-destructive p-3.5 rounded-xl border border-destructive/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="px-5 sm:px-6 pb-6 sm:pb-7 pt-0">
              <Button 
                type="submit" 
                size="lg"
                className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-sm shadow-primary/20 transition-all" 
                disabled={loading}
              >
                {loading ? 'Autenticando...' : 'Entrar no Sistema'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-400">
          © 2026 Agenda Buffet. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
