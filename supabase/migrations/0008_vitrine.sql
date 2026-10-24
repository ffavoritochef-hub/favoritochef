-- =====================================================================
-- 0008 - Vitrine (página pública de apresentação do buffet)
-- ---------------------------------------------------------------------
-- Cole tudo no SQL Editor do Supabase e execute. É idempotente.
--  * tenant_showcase: conteúdo da vitrine (/vitrine/<slug>), 1 por buffet
--  * bucket tenant-showcase: fotos da vitrine
--  * showcase_visits: contador de visitas por dia
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Conteúdo da vitrine
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_showcase (
  tenant_id   UUID PRIMARY KEY DEFAULT public.current_tenant_id()
              REFERENCES public.tenants(id) ON DELETE CASCADE,
  published   BOOLEAN NOT NULL DEFAULT false,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb
              CHECK (jsonb_typeof(content) = 'object' AND pg_column_size(content) <= 200000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.tenant_showcase_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.tenant_id  := OLD.tenant_id;  -- vitrine nunca muda de buffet
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tenant_showcase_touch_trg ON public.tenant_showcase;
CREATE TRIGGER tenant_showcase_touch_trg BEFORE UPDATE ON public.tenant_showcase
FOR EACH ROW EXECUTE FUNCTION public.tenant_showcase_touch();

-- RLS: igual às demais tabelas. A página pública lê pelo servidor
-- (service role), então visitantes anônimos não acessam a tabela.
ALTER TABLE public.tenant_showcase ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.tenant_showcase;
CREATE POLICY tenant_isolation ON public.tenant_showcase FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id));

-- ---------------------------------------------------------------------
-- 2) Storage: fotos da vitrine (leitura pública; escrita só na pasta do próprio buffet)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('tenant-showcase', 'tenant-showcase', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];
  EXCEPTION WHEN undefined_column THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-showcase', 'tenant-showcase', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  END;
END $$;

DROP POLICY IF EXISTS tenant_showcase_read   ON storage.objects;
DROP POLICY IF EXISTS tenant_showcase_insert ON storage.objects;
DROP POLICY IF EXISTS tenant_showcase_update ON storage.objects;
DROP POLICY IF EXISTS tenant_showcase_delete ON storage.objects;

CREATE POLICY tenant_showcase_read ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-showcase');
CREATE POLICY tenant_showcase_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-showcase' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
CREATE POLICY tenant_showcase_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-showcase' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
CREATE POLICY tenant_showcase_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-showcase' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);

-- ---------------------------------------------------------------------
-- 3) Visitas por dia (contador simples, sem dados do visitante)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.showcase_visits (
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  views      INT  NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (tenant_id, day)
);

ALTER TABLE public.showcase_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_read ON public.showcase_visits;
CREATE POLICY tenant_read ON public.showcase_visits FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- Só o servidor (service role) registra visitas
CREATE OR REPLACE FUNCTION public.showcase_track_view(tid UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.showcase_visits (tenant_id, day, views)
  VALUES (tid, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 1)
  ON CONFLICT (tenant_id, day) DO UPDATE SET views = public.showcase_visits.views + 1;
$$;
REVOKE ALL ON FUNCTION public.showcase_track_view(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.showcase_track_view(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
