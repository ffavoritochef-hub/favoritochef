-- =====================================================================
-- Migration 0010: USUÁRIOS POR EMPRESA (papéis e permissões)
-- ---------------------------------------------------------------------
-- - Cada buffet (tenant) pode ter vários usuários (tenant_members).
-- - Papel 'admin' vê tudo da empresa e gerencia os usuários dela.
-- - Papel 'usuario' vê apenas as áreas marcadas em permissions.
-- - O dono do buffet (tenants.owner_id) é sempre admin.
-- - Criar/editar/excluir usuários é feito pelo servidor (service role);
--   o app só LÊ esta tabela.
-- Idempotente: pode rodar de novo.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'usuario',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_members_role_check') THEN
    ALTER TABLE public.tenant_members ADD CONSTRAINT tenant_members_role_check
      CHECK (role IN ('admin','usuario'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON public.tenant_members(tenant_id);

-- Donos atuais viram admin da própria empresa
INSERT INTO public.tenant_members (tenant_id, user_id, email, name, role, active)
SELECT t.id, t.owner_id, u.email, t.responsible_name, 'admin', true
FROM public.tenants t
JOIN auth.users u ON u.id = t.owner_id
WHERE t.owner_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', active = true, tenant_id = EXCLUDED.tenant_id;

-- ---------------------------------------------------------------------
-- Funções: empresa do usuário = a que ele é dono OU membro ativo
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT id FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1),
    (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND active LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenants WHERE owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = auth.uid() AND active AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.has_permission(perm TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_tenant_admin()
      OR EXISTS (SELECT 1 FROM public.tenant_members
                 WHERE user_id = auth.uid() AND active AND perm = ANY(permissions));
$$;

-- Busca usuário do Auth por e-mail (só o servidor usa)
CREATE OR REPLACE FUNCTION public.find_auth_user(p_email TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_tenant_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_permission(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_auth_user(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_auth_user(TEXT) TO service_role;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_members' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_members', pol.policyname);
  END LOOP;
END $$;

-- Cada um vê o próprio registro; admin vê os da empresa; master vê todos.
CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin()
    OR (tenant_id = public.current_tenant_id() AND public.is_tenant_admin())
  );

-- Membros enxergam a própria empresa; dono, admin ou quem tem "configuracoes" edita.
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS tenants_update ON public.tenants;
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id = public.current_tenant_id() OR public.is_platform_admin());
CREATE POLICY tenants_update ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_platform_admin()
         OR (id = public.current_tenant_id() AND public.has_permission('configuracoes')))
  WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin()
         OR (id = public.current_tenant_id() AND public.has_permission('configuracoes')));

-- Financeiro: só quem tem a área "financeiro" (ou "eventos", que lança pagamentos do evento)
DO $$
BEGIN
  IF to_regclass('public.finance_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS tenant_isolation ON public.finance_transactions;
    CREATE POLICY tenant_isolation ON public.finance_transactions FOR ALL TO authenticated
      USING (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id)
             AND (SELECT public.has_permission('financeiro') OR public.has_permission('eventos')))
      WITH CHECK (tenant_id = public.current_tenant_id() AND public.tenant_is_active(tenant_id)
             AND (SELECT public.has_permission('financeiro') OR public.has_permission('eventos')));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
