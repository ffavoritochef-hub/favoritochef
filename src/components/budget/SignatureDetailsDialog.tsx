'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCpf } from '@/lib/cpf';
import { formatBRL } from '@/lib/buffet-rules';

type Signature = {
  signer_name: string | null;
  signer_document: string | null;
  signer_email: string | null;
  signature_image: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  signed_content_hash: string | null;
  client_response_note: string | null;
  total: number | null;
};

/** Evidências da assinatura eletrônica de um orçamento (carregadas só ao abrir). */
export function SignatureDetailsDialog({ budgetId, onClose }: { budgetId: string | null; onClose: () => void }) {
  // guarda o id carregado: ao trocar de orçamento, o anterior não aparece enquanto carrega
  const [loaded, setLoaded] = useState<{ id: string; row: Signature | null; error: string | null } | null>(null);
  const current = loaded && loaded.id === budgetId ? loaded : null;
  const data = current?.row ?? null;

  useEffect(() => {
    if (!budgetId) return;
    let alive = true;
    supabase
      .from('budgets')
      .select('signer_name, signer_document, signer_email, signature_image, signed_at, signer_ip, signer_user_agent, signed_content_hash, client_response_note, total:signed_snapshot->total')
      .eq('id', budgetId)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (!alive) return;
        setLoaded({
          id: budgetId,
          row: (row as unknown as Signature) ?? null,
          error: error ? error.message : row ? null : 'Orçamento não encontrado.',
        });
      });
    return () => {
      alive = false;
    };
  }, [budgetId]);

  const rows: [string, string][] = data
    ? [
        ['Assinado por', data.signer_name ?? '—'],
        ['CPF', data.signer_document ? formatCpf(data.signer_document) : '—'],
        ['E-mail', data.signer_email ?? '—'],
        ['Data e hora', data.signed_at ? new Date(data.signed_at).toLocaleString('pt-BR') : '—'],
        ['Valor aceito', data.total != null ? formatBRL(Number(data.total)) : '—'],
        ['IP', data.signer_ip ?? '—'],
        ['Navegador', data.signer_user_agent ?? '—'],
      ]
    : [];

  return (
    <Dialog open={!!budgetId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assinatura da proposta</DialogTitle>
          <DialogDescription>Evidências registradas no momento do aceite. Esses dados não podem ser alterados.</DialogDescription>
        </DialogHeader>
        {current?.error ? (
          <p className="text-sm text-destructive py-6 text-center">Erro ao carregar a assinatura: {current.error}</p>
        ) : !data ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4 min-w-0">
            {data.signature_image && (
              <div className="rounded-xl border border-border bg-white p-3 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.signature_image} alt={`Assinatura de ${data.signer_name ?? 'cliente'}`} className="max-h-32 w-auto" />
              </div>
            )}
            <dl className="divide-y divide-slate-100 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2">
                  <dt className="text-slate-500 font-medium">{k}</dt>
                  <dd className="text-slate-900 break-words min-w-0">{v}</dd>
                </div>
              ))}
            </dl>
            {data.client_response_note && (
              <div className="rounded-lg bg-slate-50 border border-border p-3 text-sm text-slate-700">
                <p className="text-xs font-semibold text-slate-500 mb-1">Observação do cliente</p>
                {data.client_response_note}
              </div>
            )}
            {data.signed_content_hash && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Código de integridade (SHA-256)</p>
                <p className="font-mono text-[11px] break-all text-slate-700 bg-slate-50 border border-border rounded-lg p-2">{data.signed_content_hash}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
