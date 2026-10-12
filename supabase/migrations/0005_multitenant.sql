-- =====================================================================
-- Migration 0005: MULTIEMPRESA (cada buffet = 1 "tenant")
-- ---------------------------------------------------------------------
-- ANTES DE RODAR:
--  1) No Supabase: Authentication > Users > Add user  -> crie o usuário
--     MASTER (ailtomg@gmail.com) com "Auto Confirm User" marcado.
--  2) Confira os e-mails nas duas constantes v_owner_email / v_master_email
--     do bloco "SEED" mais abaixo.
--  3) Cole tudo no SQL Editor e execute. É idempotente (pode rodar de novo,
--     inclusive depois de criar o usuário master).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tabelas base
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  responsible_name TEXT,
  document         TEXT,
  email            TEXT,
  phone            TEXT,
  city             TEXT,
  state            TEXT,
  logo_url         TEXT,
  primary_color    TEXT NOT NULL DEFAULT '#2563EB',
  status           TEXT NOT NULL DEFAULT 'pendente',
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  valid_until      TIMESTAMPTZ,            -- NULL = sem prazo
  status_reason    TEXT,                   -- motivo de recusa/suspensão
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_status_check') THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_status_check
      CHECK (status IN ('pendente','ativo','suspenso','recusado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_color_check') THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_color_check
      CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2) Funções auxiliares (SECURITY DEFINER para não depender de RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- Buffet liberado = aprovado e dentro do prazo (valid_until NULL = sem prazo)
CREATE OR REPLACE FUNCTION public.tenant_is_active(tid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tid AND t.status = 'ativo'
      AND (t.valid_until IS NULL OR t.valid_until > now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tenant_is_active(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_is_active(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3) Proteção da tabela tenants
--    Dono edita só dados cadastrais/marca. Status, prazo e aprovação:
--    apenas master (ou SQL Editor / service role, onde auth.uid() é nulo).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenants_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL AND NOT public.is_platform_admin() THEN
    NEW.owner_id      := OLD.owner_id;
    NEW.status        := OLD.status;
    NEW.valid_until   := OLD.valid_until;
    NEW.approved_at   := OLD.approved_at;
    NEW.approved_by   := OLD.approved_by;
    NEW.status_reason := OLD.status_reason;
  ELSIF auth.uid() IS NOT NULL AND NEW.status = 'ativo' AND OLD.status IS DISTINCT FROM 'ativo' THEN
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tenants_guard_trg ON public.tenants;
CREATE TRIGGER tenants_guard_trg BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.tenants_guard();

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies
             WHERE schemaname = 'public' AND tablename IN ('tenants','platform_admins') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY tenants_update ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY tenants_insert ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY tenants_delete ON public.tenants FOR DELETE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY platform_admins_self ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4) Cadastro do dono: ao criar o usuário (signUp com metadata buffet_name)
--    nasce um buffet PENDENTE. Funciona com ou sem confirmação de e-mail.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  IF COALESCE(meta->>'buffet_name', '') <> '' THEN
    INSERT INTO public.tenants (owner_id, name, responsible_name, document, email, phone, city, state, status)
    VALUES (
      NEW.id,
      left(meta->>'buffet_name', 120),
      left(meta->>'responsible_name', 120),
      left(meta->>'document', 30),
      NEW.email,
      left(meta->>'phone', 30),
      left(meta->>'city', 80),
      upper(left(meta->>'state', 2)),
      'pendente'
    )
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;
CREATE TRIGGER on_auth_user_created_tenant AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5) tenant_id em todas as tabelas de dados (default = buffet do usuário,
--    então o app NÃO precisa enviar tenant_id nos inserts)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['clients','events','budgets','finance_transactions','menu_templates',
                         'menu_template_items','categories','menu_items','employees',
                         'event_employees','event_payments'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabela % não existe, ignorada.', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_' || t || '_tenant') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT', t, 'fk_' || t || '_tenant');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', 'idx_' || t || '_tenant_id', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 6) SEED: master + primeiro buffet (Favorito Chef) com os dados atuais
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_owner_email  CONSTANT TEXT := 'tom23_tom@hotmail.com';   -- dono atual dos dados (Favorito Chef)
  v_master_email CONSTANT TEXT := 'ailtomg@gmail.com';       -- conta MASTER
  v_owner UUID; v_master UUID; v_tenant UUID; t TEXT; n BIGINT;
  tables TEXT[] := ARRAY['clients','events','budgets','finance_transactions','menu_templates',
                         'menu_template_items','categories','menu_items','employees',
                         'event_employees','event_payments'];
BEGIN
  SELECT id INTO v_owner  FROM auth.users WHERE lower(email) = lower(v_owner_email)  LIMIT 1;
  SELECT id INTO v_master FROM auth.users WHERE lower(email) = lower(v_master_email) LIMIT 1;

  IF v_master IS NOT NULL THEN
    INSERT INTO public.platform_admins (user_id) VALUES (v_master) ON CONFLICT DO NOTHING;
    -- master nunca é dono de buffet
    DELETE FROM public.tenants WHERE owner_id = v_master AND name <> 'Favorito Chef';
  ELSE
    RAISE NOTICE 'ATENÇÃO: usuário master % não existe. Crie em Authentication > Users e rode esta migração de novo.', v_master_email;
  END IF;

  SELECT id INTO v_tenant FROM public.tenants WHERE name = 'Favorito Chef' ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN
    INSERT INTO public.tenants (owner_id, name, email, status, approved_at, valid_until)
    VALUES (v_owner, 'Favorito Chef', v_owner_email, 'ativo', now(), NULL)
    RETURNING id INTO v_tenant;
  ELSIF v_owner IS NOT NULL THEN
    UPDATE public.tenants SET owner_id = COALESCE(owner_id, v_owner) WHERE id = v_tenant;
  END IF;
  IF v_owner IS NULL THEN
    RAISE NOTICE 'ATENÇÃO: usuário % não existe; o Favorito Chef ficou sem dono. Corrija o e-mail e rode de novo.', v_owner_email;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL', t) USING v_tenant;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', t) INTO n;
    IF n = 0 THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7) RLS: cada buffet só enxerga e grava o que é dele, e SOMENTE se
--    estiver ativo e dentro do prazo (bloqueio também no servidor).
--    Remove políticas antigas (que liberavam tudo para qualquer logado).
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT; pol RECORD;
  tables TEXT[] := ARRAY['clients','events','budgets','finance_transactions','menu_templates',
                         'menu_template_items','categories','menu_items','employees',
                         'event_employees','event_payments'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO authenticated
         USING (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id))
         WITH CHECK (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id))', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 8) Storage: logos dos buffets (leitura pública; escrita só na pasta do próprio buffet)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('tenant-logos', 'tenant-logos', true, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp'];
  EXCEPTION WHEN undefined_column THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-logos', 'tenant-logos', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  END;
END $$;

DROP POLICY IF EXISTS tenant_logos_read   ON storage.objects;
DROP POLICY IF EXISTS tenant_logos_insert ON storage.objects;
DROP POLICY IF EXISTS tenant_logos_update ON storage.objects;
DROP POLICY IF EXISTS tenant_logos_delete ON storage.objects;

CREATE POLICY tenant_logos_read ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');
CREATE POLICY tenant_logos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-logos' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
CREATE POLICY tenant_logos_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-logos' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);
CREATE POLICY tenant_logos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-logos' AND (storage.foldername(name))[1] = public.current_tenant_id()::text);

NOTIFY pgrst, 'reload schema';
