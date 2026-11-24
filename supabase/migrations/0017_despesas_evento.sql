-- =====================================================================
-- Migration 0017: despesas do evento mais organizadas
-- ---------------------------------------------------------------------
-- category : categoria da despesa (Carnes, Bebidas, Equipe, ...)
-- paid_by  : nome de quem pagou do PRÓPRIO BOLSO. NULL = pago pelo
--            caixa do buffet. Quando preenchido, status 'pendente'
--            significa "a reembolsar" e 'pago' significa "já reembolsado".
-- Idempotente: pode rodar de novo.
-- =====================================================================

ALTER TABLE public.finance_transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.finance_transactions ADD COLUMN IF NOT EXISTS paid_by  TEXT;

COMMENT ON COLUMN public.finance_transactions.category IS 'Categoria da despesa/receita (ex.: Carnes, Bebidas, Equipe)';
COMMENT ON COLUMN public.finance_transactions.paid_by  IS 'Quem pagou do próprio bolso (NULL = caixa do buffet). status pendente = a reembolsar';

NOTIFY pgrst, 'reload schema';
