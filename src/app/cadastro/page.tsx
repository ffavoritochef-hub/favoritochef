'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const inputCls = 'h-12 bg-white border-border focus:border-primary focus:ring-primary/20 text-slate-900 placeholder:text-slate-400 rounded-xl';

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.';
  if (m.includes('password')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (m.includes('database error')) return 'Não foi possível concluir o cadastro. Tente novamente em instantes.';
  return msg;
}

export default function CadastroPage() {
  const [form, setForm] = useState({
    buffet_name: '', responsible_name: '', document: '', phone: '', city: '', state: '',
    email: '', password: '', confirm: '',
  });
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | 'session' | 'confirm'>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.buffet_name.trim().length < 2) return setError('Informe o nome do buffet.');
    if (form.responsible_name.trim().length < 2) return setError('Informe o nome do responsável.');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Informe um telefone/WhatsApp válido com DDD.');
    if (form.password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (form.password !== form.confirm) return setError('As senhas não conferem.');
    if (!terms) return setError('Aceite os termos para continuar.');

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            buffet_name: form.buffet_name.trim(),
            responsible_name: form.responsible_name.trim(),
            document: form.document.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            state: form.state,
          },
        },
      });
      if (error) throw error;
      // E-mail já existente com confirmação ligada: o Supabase devolve usuário sem identidades.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('already registered');
      }
      setDone(data.session ? 'session' : 'confirm');
    } catch (err) {
      setError(translateError((err as Error)?.message || 'Erro inesperado ao cadastrar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-[480px] relative z-10 space-y-6 py-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Cadastre seu buffet</h1>
            <p className="text-sm text-slate-500 mt-1.5">Após o cadastro, sua conta passa por aprovação.</p>
          </div>
        </div>

        <Card className="shadow-card border-border bg-white">
          {done ? (
            <CardContent className="px-5 sm:px-6 py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                {done === 'confirm' ? <MailCheck className="w-7 h-7 text-green-600" /> : <CheckCircle2 className="w-7 h-7 text-green-600" />}
              </div>
              <h2 className="text-xl font-bold text-slate-900">Cadastro enviado!</h2>
              {done === 'confirm' ? (
                <p className="text-sm text-slate-500 leading-relaxed">
                  Enviamos um e-mail de confirmação para <strong>{form.email}</strong>. Confirme o e-mail e depois
                  entre no sistema. O acesso será liberado após a aprovação do seu cadastro.
                </p>
              ) : (
                <p className="text-sm text-slate-500 leading-relaxed">
                  Seu cadastro está em análise. Você já pode entrar no sistema, mas o uso será liberado somente
                  após a aprovação.
                </p>
              )}
              <Button asChild size="lg" className="w-full rounded-xl">
                <Link href={done === 'session' ? '/dashboard' : '/login'}>
                  {done === 'session' ? 'Ver status do cadastro' : 'Ir para o login'}
                </Link>
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center space-y-1.5 px-5 sm:px-6 pt-6">
                <CardTitle className="text-xl font-bold text-slate-900">Dados do buffet</CardTitle>
                <CardDescription className="text-sm text-slate-500">Campos com * são obrigatórios</CardDescription>
              </CardHeader>
              <form onSubmit={submit}>
                <CardContent className="space-y-4 px-5 sm:px-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="buffet_name">Nome do buffet *</Label>
                    <Input id="buffet_name" value={form.buffet_name} onChange={set('buffet_name')} required className={inputCls} placeholder="Ex.: Buffet Sabor & Festa" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible_name">Responsável (dono) *</Label>
                    <Input id="responsible_name" value={form.responsible_name} onChange={set('responsible_name')} required className={inputCls} autoComplete="name" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">WhatsApp / Telefone *</Label>
                      <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} required className={inputCls} placeholder="(11) 99999-9999" autoComplete="tel" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="document">CNPJ ou CPF</Label>
                      <Input id="document" inputMode="numeric" value={form.document} onChange={set('document')} className={inputCls} placeholder="Opcional" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input id="city" value={form.city} onChange={set('city')} className={inputCls} autoComplete="address-level2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">UF</Label>
                      <select id="state" value={form.state} onChange={set('state')} className={inputCls + ' w-full border px-3 text-base'}>
                        <option value="">--</option>
                        {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail de acesso *</Label>
                      <Input id="email" type="email" value={form.email} onChange={set('email')} required className={inputCls} autoComplete="email" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha *</Label>
                        <Input id="password" type="password" value={form.password} onChange={set('password')} required minLength={6} className={inputCls} autoComplete="new-password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm">Confirmar senha *</Label>
                        <Input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} required minLength={6} className={inputCls} autoComplete="new-password" />
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer min-h-[44px]">
                    <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--primary)] shrink-0" />
                    <span>Declaro que os dados informados são verdadeiros e concordo com os termos de uso do sistema.</span>
                  </label>

                  {error && (
                    <div className="text-sm bg-destructive/5 text-destructive p-3.5 rounded-xl border border-destructive/20 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                  )}
                </CardContent>
                <div className="px-5 sm:px-6 pb-6 pt-2 space-y-3">
                  <Button type="submit" size="lg" className="w-full text-base font-semibold rounded-xl px-6" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar cadastro'}
                  </Button>
                  <p className="text-center text-sm text-slate-500">
                    Já tem conta? <Link href="/login" className="text-primary font-semibold hover:underline">Entrar</Link>
                  </p>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
