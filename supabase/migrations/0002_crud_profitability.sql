-- Migration 0002: CRUD + Rentabilidade por Evento
-- Data estimada: 2026-09-06
-- Aplicar no Supabase SQL Editor (painel.supabase.com > SQL Editor > New query)
-- Todas DDL com IF NOT EXISTS — idempotente, rodar múltiplas vezes sem problema.

-- 1) events: valor fechado com o cliente + soft-delete
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS agreed_value NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.events.agreed_value IS 'Valor fechado com o cliente para cálculo de rentabilidade';
COMMENT ON COLUMN public.events.is_active IS 'Soft-delete do evento (exclusão lógica)';

-- 2) clients: soft-delete (inativo)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clients.is_active IS 'Soft-delete do cliente (exclusão lógica)';

-- 3) menu_templates: ativo/inativo
ALTER TABLE public.menu_templates
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.menu_templates.is_active IS 'Template do cardápio visível em novos orçamentos quando true';

-- 4) finance_transactions: vínculo 1 evento <-> N transações
--    ON DELETE SET NULL (padrão confirmado pelo usuário — apagar evento não apaga gastos)
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS event_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'finance_transactions' AND constraint_name = 'finance_transactions_event_id_fkey'
  ) THEN
    ALTER TABLE public.finance_transactions
      ADD CONSTRAINT finance_transactions_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES public.events(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_event_id
  ON public.finance_transactions(event_id);

COMMENT ON COLUMN public.finance_transactions.event_id IS 'Evento vinculado (receita ou despesa vinculada a um buffet específico)';
