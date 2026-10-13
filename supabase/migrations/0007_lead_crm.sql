-- =====================================================================
-- 0007 - Trabalhar o lead (temperatura, cardápio, ofertas, histórico)
-- ---------------------------------------------------------------------
-- Cole tudo no SQL Editor do Supabase e execute. É idempotente.
--  * leads: temperatura, cardápio de interesse, próximo contato, motivo da perda
--  * lead_offers: ofertas feitas (R$ por pessoa) e a reação do cliente
--  * lead_notes: histórico de anotações/contatos
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Novas colunas do lead
-- ---------------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS temperature TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_contact_at DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_temperature_check') THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_temperature_check
      CHECK (temperature IS NULL OR temperature IN ('quente','morno','frio'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_lost_reason_check') THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_lost_reason_check
      CHECK (lost_reason IS NULL OR char_length(lost_reason) <= 200);
  END IF;
END $$;

-- menu_template_id com o mesmo tipo de menu_templates.id
DO $$
DECLARE id_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO id_type
    FROM pg_attribute a WHERE a.attrelid = 'public.menu_templates'::regclass AND a.attname = 'id';
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'menu_template_id') THEN
    EXECUTE format('ALTER TABLE public.leads ADD COLUMN menu_template_id %s REFERENCES public.menu_templates(id) ON DELETE SET NULL', id_type);
  END IF;

  -- -------------------------------------------------------------------
  -- 2) Ofertas
  -- -------------------------------------------------------------------
  IF to_regclass('public.lead_offers') IS NULL THEN
    EXECUTE format($f$
      CREATE TABLE public.lead_offers (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID NOT NULL DEFAULT public.current_tenant_id()
                         REFERENCES public.tenants(id) ON DELETE CASCADE,
        lead_id          UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
        price_per_person NUMERIC(10,2) NOT NULL CHECK (price_per_person > 0 AND price_per_person < 100000),
        guests           INT CHECK (guests IS NULL OR guests BETWEEN 1 AND 100000),
        menu_template_id %s REFERENCES public.menu_templates(id) ON DELETE SET NULL,
        description      TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
        reaction         TEXT CHECK (reaction IS NULL OR reaction IN ('gostou','indeciso','nao_gostou')),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )$f$, id_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_next_contact ON public.leads(tenant_id, next_contact_at);
CREATE INDEX IF NOT EXISTS idx_lead_offers_lead ON public.lead_offers(lead_id, created_at);

-- ---------------------------------------------------------------------
-- 3) Histórico de anotações
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL DEFAULT public.current_tenant_id()
              REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'nota' CHECK (kind IN ('nota','whatsapp','ligacao','visita','degustacao')),
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON public.lead_notes(lead_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 4) Oferta/anotação sempre no mesmo buffet do lead
--    (roda como o usuário: lead de outro buffet não aparece → tenant_id NULL → erro)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lead_child_tenant()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.lead_id   := OLD.lead_id;
    NEW.tenant_id := OLD.tenant_id;
  ELSE
    NEW.tenant_id := (SELECT tenant_id FROM public.leads WHERE id = NEW.lead_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS lead_offers_tenant ON public.lead_offers;
CREATE TRIGGER lead_offers_tenant BEFORE INSERT OR UPDATE ON public.lead_offers
FOR EACH ROW EXECUTE FUNCTION public.lead_child_tenant();

DROP TRIGGER IF EXISTS lead_notes_tenant ON public.lead_notes;
CREATE TRIGGER lead_notes_tenant BEFORE INSERT OR UPDATE ON public.lead_notes
FOR EACH ROW EXECUTE FUNCTION public.lead_child_tenant();

-- ---------------------------------------------------------------------
-- 5) RLS (igual às demais tabelas)
-- ---------------------------------------------------------------------
ALTER TABLE public.lead_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lead_offers;
CREATE POLICY tenant_isolation ON public.lead_offers FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id));

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lead_notes;
CREATE POLICY tenant_isolation ON public.lead_notes FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id));

NOTIFY pgrst, 'reload schema';
