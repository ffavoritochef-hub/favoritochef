-- =====================================================================
-- Migration 0012: CRONOGRAMA DE PAGAMENTO DO EVENTO
-- ---------------------------------------------------------------------
-- Parcelas combinadas com o cliente (ex.: evento de R$ 5.000 →
-- "Ato" 10% R$ 500 em 05/11, "2ª parcela" 40% R$ 2.000 em 05/12...).
-- Os recebimentos continuam em event_payments; o app abate o total
-- recebido das parcelas pela ordem de vencimento para mostrar o que já
-- foi pago, o que está em aberto e o que está vencido.
-- Aplicar no Supabase SQL Editor. Idempotente.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.event_installments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID DEFAULT public.current_tenant_id()
              REFERENCES public.tenants(id) ON DELETE RESTRICT,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT 'Parcela',
  due_date    DATE NOT NULL,
  percent     NUMERIC(6,2) NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_installments IS 'Cronograma de pagamento combinado com o cliente (data, % e valor de cada parcela)';
COMMENT ON COLUMN public.event_installments.description IS 'Ex.: Ato, 2ª parcela, Saldo final';
COMMENT ON COLUMN public.event_installments.percent IS '% sobre o valor fechado do evento (informativo)';

CREATE INDEX IF NOT EXISTS idx_event_installments_event_id ON public.event_installments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_installments_due_date ON public.event_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_event_installments_tenant_id ON public.event_installments(tenant_id);

DROP TRIGGER IF EXISTS set_event_installments_updated_at ON public.event_installments;
CREATE TRIGGER set_event_installments_updated_at
BEFORE UPDATE ON public.event_installments
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.event_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.event_installments;
CREATE POLICY tenant_isolation ON public.event_installments FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id));

NOTIFY pgrst, 'reload schema';
