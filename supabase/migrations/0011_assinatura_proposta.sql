-- =====================================================================
-- Migration 0011: ASSINATURA ELETRÔNICA DA PROPOSTA
-- ---------------------------------------------------------------------
-- No aceite, o cliente informa nome, CPF e e-mail, desenha a assinatura
-- e concorda com os termos. Guardamos as evidências (data/hora, IP,
-- navegador) e uma cópia congelada da proposta (signed_snapshot) com o
-- hash SHA-256 do conteúdo aceito: editar o orçamento depois NÃO altera
-- o documento assinado.
-- Gravado só pelo servidor (service role). Idempotente.
-- =====================================================================

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signer_name TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signer_document TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signer_email TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signature_image TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signer_ip TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signer_user_agent TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signed_content_hash TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS signed_snapshot JSONB NULL;

COMMENT ON COLUMN public.budgets.signature_image IS 'Assinatura desenhada (data URL PNG)';
COMMENT ON COLUMN public.budgets.signed_content_hash IS 'SHA-256 do conteúdo da proposta no momento do aceite';
COMMENT ON COLUMN public.budgets.signed_snapshot IS 'Proposta congelada (ProposalView) no momento do aceite';

-- Depois de assinada, as evidências não podem ser alteradas nem apagadas.
CREATE OR REPLACE FUNCTION public.budgets_lock_signature()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL AND (
       NEW.signed_at           IS DISTINCT FROM OLD.signed_at
    OR NEW.signer_name         IS DISTINCT FROM OLD.signer_name
    OR NEW.signer_document     IS DISTINCT FROM OLD.signer_document
    OR NEW.signer_email        IS DISTINCT FROM OLD.signer_email
    OR NEW.signature_image     IS DISTINCT FROM OLD.signature_image
    OR NEW.signer_ip           IS DISTINCT FROM OLD.signer_ip
    OR NEW.signer_user_agent   IS DISTINCT FROM OLD.signer_user_agent
    OR NEW.signed_content_hash IS DISTINCT FROM OLD.signed_content_hash
    OR NEW.signed_snapshot     IS DISTINCT FROM OLD.signed_snapshot
    OR NEW.proposal_token      IS DISTINCT FROM OLD.proposal_token
    OR NEW.proposal_status     IS DISTINCT FROM OLD.proposal_status
  ) THEN
    RAISE EXCEPTION 'Proposta assinada: os dados da assinatura não podem ser alterados.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budgets_lock_signature ON public.budgets;
CREATE TRIGGER trg_budgets_lock_signature
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.budgets_lock_signature();
