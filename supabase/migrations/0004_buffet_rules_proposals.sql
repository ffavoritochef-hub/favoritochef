-- Migration 0004: Regras de buffet + Proposta com link público
-- Aplicar no Supabase SQL Editor. Idempotente (IF NOT EXISTS).

-- 1) budgets: precificação por convidado
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'por_convidado';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS adult_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS child_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS price_per_adult NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS child_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 50;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS min_total NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS extras_value NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) NOT NULL DEFAULT 30;

COMMENT ON COLUMN public.budgets.pricing_mode IS 'por_convidado (preço x convidados) ou custo_margem (custos + margem)';
COMMENT ON COLUMN public.budgets.child_discount_percent IS 'Desconto aplicado ao valor da criança (%)';
COMMENT ON COLUMN public.budgets.min_total IS 'Valor mínimo de contratação do buffet';
COMMENT ON COLUMN public.budgets.deposit_percent IS 'Percentual de sinal exigido para confirmar o evento';

-- 2) budgets: proposta com link público e resposta do cliente
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS proposal_token UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS proposal_status TEXT NOT NULL DEFAULT 'rascunho';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS proposal_valid_until DATE NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS proposal_responded_at TIMESTAMPTZ NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS client_response_note TEXT NULL;

COMMENT ON COLUMN public.budgets.proposal_status IS 'rascunho | enviada | aceita | recusada';

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_proposal_token ON public.budgets(proposal_token);
CREATE INDEX IF NOT EXISTS idx_budgets_event_id ON public.budgets(event_id);
