-- =====================================================================
-- 0006 - Leads (pedido de orçamento pelo link público / Instagram)
-- ---------------------------------------------------------------------
-- Cole tudo no SQL Editor do Supabase e execute. É idempotente.
--  * tenants.slug: endereço público do buffet (/orcamento/<slug>)
--  * leads: pedidos de orçamento recebidos pelo link
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Slug do buffet
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugify(txt TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' FROM left(trim(both '-' FROM regexp_replace(
    lower(translate(coalesce(txt, ''),
      'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
    '[^a-z0-9]+', '-', 'g')), 60));
$$;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug TEXT;

-- Gera um slug livre a partir de um texto (acrescenta -2, -3... se já existir)
CREATE OR REPLACE FUNCTION public.tenant_unique_slug(base TEXT, self UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s TEXT := public.slugify(base); candidate TEXT; i INT := 1;
BEGIN
  IF length(s) < 3 THEN s := 'buffet' || CASE WHEN s = '' THEN '' ELSE '-' || s END; END IF;
  s := left(s, 55);
  candidate := s;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = candidate AND id IS DISTINCT FROM self) LOOP
    i := i + 1;
    candidate := s || '-' || i;
  END LOOP;
  RETURN candidate;
END $$;

CREATE OR REPLACE FUNCTION public.tenants_slug_trg()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := public.tenant_unique_slug(NEW.name, NEW.id);
  ELSE
    -- o dono escolheu: só normaliza (se já existir, a UNIQUE avisa)
    NEW.slug := public.slugify(NEW.slug);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tenants_slug ON public.tenants;
CREATE TRIGGER tenants_slug BEFORE INSERT OR UPDATE OF slug ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.tenants_slug_trg();

-- Preenche os buffets que já existem
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM public.tenants WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    UPDATE public.tenants SET slug = public.tenant_unique_slug(r.name, r.id) WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key ON public.tenants(slug);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_slug_check') THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_check
      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 60);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Leads
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL DEFAULT public.current_tenant_id()
              REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  phone       TEXT NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 30),
  event_date  DATE,
  event_type  TEXT CHECK (event_type IS NULL OR char_length(event_type) <= 40),
  guests      INT  CHECK (guests IS NULL OR guests BETWEEN 1 AND 100000),
  notes       TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  source      TEXT NOT NULL DEFAULT 'link' CHECK (source ~ '^[a-z0-9_-]{1,30}$'),
  status      TEXT NOT NULL DEFAULT 'novo'
              CHECK (status IN ('novo','em_contato','convertido','perdido')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- client_id com o mesmo tipo de clients.id
DO $$
DECLARE id_type TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'client_id') THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO id_type
      FROM pg_attribute a WHERE a.attrelid = 'public.clients'::regclass AND a.attname = 'id';
    EXECUTE format('ALTER TABLE public.leads ADD COLUMN client_id %s REFERENCES public.clients(id) ON DELETE SET NULL', id_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON public.leads(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status  ON public.leads(tenant_id, status);

CREATE OR REPLACE FUNCTION public.leads_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.tenant_id  := OLD.tenant_id;  -- lead nunca muda de buffet
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS leads_touch_trg ON public.leads;
CREATE TRIGGER leads_touch_trg BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_touch();

-- RLS: igual às demais tabelas. O formulário público grava pelo servidor
-- (service role), então visitantes anônimos não acessam a tabela.
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.leads;
CREATE POLICY tenant_isolation ON public.leads FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id));

NOTIFY pgrst, 'reload schema';
