// Operações de eventos no navegador.

import { supabase } from '@/lib/supabase';

/**
 * Exclui o evento com orçamentos, equipe escalada e pagamentos dele.
 * Lançamentos do financeiro ficam (sem vínculo com o evento), como definido na 0002.
 */
export async function deleteEvent(id: string) {
  // proposta assinada é prova do contrato: não some junto com o evento
  const { data: signed, error: sErr } = await supabase
    .from('budgets')
    .select('id')
    .eq('event_id', id)
    .not('signed_at', 'is', null)
    .limit(1);
  if (sErr) throw sErr;
  if (signed && signed.length > 0) {
    throw new Error('Este evento tem proposta assinada pelo cliente e não pode ser excluído. Marque como "Cancelado".');
  }
  for (const table of ['budgets', 'event_employees', 'event_payments'] as const) {
    const { error } = await supabase.from(table).delete().eq('event_id', id);
    if (error) throw error;
  }
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') throw new Error('Este evento tem registros vinculados. Marque como "Cancelado" em vez de excluir.');
    throw error;
  }
}
