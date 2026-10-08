import { supabase } from '@/lib/supabase';

/** fetch com o token do usuário logado (rotas internas /api/proposals/*). */
export async function authFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

/** Abre um PDF protegido (baixa como blob e abre numa nova aba / baixa). */
export async function openProtectedPdf(url: string, download = false, filename = 'proposta.pdf') {
  const res = await authFetch(url);
  if (!res.ok) {
    let msg = 'Falha ao gerar PDF.';
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const obj = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement('a');
    a.href = obj;
    a.download = filename;
    a.click();
  } else {
    window.open(obj, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(obj), 60_000);
}
