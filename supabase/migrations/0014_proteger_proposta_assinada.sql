-- =====================================================================
-- Migration 0014: PROPOSTA ASSINADA NÃO PODE SER EXCLUÍDA
-- ---------------------------------------------------------------------
-- A 0011 trava a ALTERAÇÃO dos dados da assinatura. Faltava impedir a
-- EXCLUSÃO do orçamento assinado (direto ou junto com o evento), que
-- apagaria as evidências do aceite.
-- Aplicar no Supabase SQL Editor. Idempotente.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.budgets_block_signed_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Proposta assinada: o orçamento não pode ser excluído.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_budgets_block_signed_delete ON public.budgets;
CREATE TRIGGER trg_budgets_block_signed_delete
  BEFORE DELETE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.budgets_block_signed_delete();
