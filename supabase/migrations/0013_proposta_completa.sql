-- =====================================================================
-- Migration 0013: PROPOSTA COMPLETA
-- ---------------------------------------------------------------------
-- Campos para a proposta ficar no padrão do modelo do buffet:
--  * cover_message: texto de apresentação ({cliente} vira o nome do cliente)
--  * included_items: o que está incluso (um item por linha)
--  * proposal_notes: observações (ex.: hora adicional R$ 300,00)
--  * discount_per_person / discount_label: desconto por pessoa (ex.: indicação)
--  * extra_items: itens adicionais cobrados à parte [{label, value}]
-- As parcelas da proposta vêm do cronograma do evento (event_installments).
-- Aplicar no Supabase SQL Editor. Idempotente.
-- =====================================================================

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cover_message TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS included_items TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS proposal_notes TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS discount_per_person NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS discount_label TEXT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS extra_items JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budgets_discount_check') THEN
    ALTER TABLE public.budgets ADD CONSTRAINT budgets_discount_check CHECK (discount_per_person >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budgets_extra_items_check') THEN
    ALTER TABLE public.budgets ADD CONSTRAINT budgets_extra_items_check CHECK (jsonb_typeof(extra_items) = 'array');
  END IF;
END $$;

COMMENT ON COLUMN public.budgets.cover_message IS 'Texto de apresentação da proposta; {cliente} é trocado pelo nome do cliente';
COMMENT ON COLUMN public.budgets.included_items IS 'O que está incluso, um item por linha';
COMMENT ON COLUMN public.budgets.proposal_notes IS 'Observações da proposta, uma por linha';
COMMENT ON COLUMN public.budgets.discount_per_person IS 'Desconto em R$ por pessoa (adultos + crianças)';
COMMENT ON COLUMN public.budgets.extra_items IS 'Itens adicionais cobrados à parte: [{"label": "Entradas", "value": 400}]';

NOTIFY pgrst, 'reload schema';
