// Operações de eventos no navegador.

import { supabase } from '@/lib/supabase';

/**
 * Exclui o evento com orçamentos, equipe escalada e pagamentos dele.
 * Lançamentos do financeiro ficam (sem vínculo com o evento), como definido na 0002.
 */
export async function deleteEvent(id: string) {
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
