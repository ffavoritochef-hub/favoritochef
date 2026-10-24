-- =====================================================================
-- 0009 — Cardápios com foto, preço sugerido e seções de itens
-- Rodar no SQL Editor do Supabase (projeto de produção). Idempotente.
-- =====================================================================

-- 1) menu_templates: foto, crédito da foto, preço por pessoa e vínculo com a biblioteca
ALTER TABLE public.menu_templates ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.menu_templates ADD COLUMN IF NOT EXISTS image_credit TEXT;
ALTER TABLE public.menu_templates ADD COLUMN IF NOT EXISTS price_per_person NUMERIC(10,2);
ALTER TABLE public.menu_templates ADD COLUMN IF NOT EXISTS library_key TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_templates_price_check') THEN
    ALTER TABLE public.menu_templates
      ADD CONSTRAINT menu_templates_price_check CHECK (price_per_person IS NULL OR price_per_person >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.menu_templates.image_url IS 'Foto do cardápio (storage da vitrine ou /cardapios/*.jpg da biblioteca)';
COMMENT ON COLUMN public.menu_templates.library_key IS 'Chave do cardápio pronto de origem (usado no pré-orçamento)';

-- 2) menu_template_items: seção (Prato principal, Acompanhamentos...) e ordem
ALTER TABLE public.menu_template_items ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.menu_template_items ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- 3) itens do cardápio somem junto com o cardápio
DO $$
DECLARE c RECORD; dropped BOOLEAN := false;
BEGIN
  FOR c IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'public.menu_template_items'::regclass AND con.contype = 'f'
      AND con.confrelid = 'public.menu_templates'::regclass AND con.confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.menu_template_items DROP CONSTRAINT %I', c.conname);
    dropped := true;
  END LOOP;
  IF dropped THEN
    ALTER TABLE public.menu_template_items
      ADD CONSTRAINT menu_template_items_menu_template_id_fkey
      FOREIGN KEY (menu_template_id) REFERENCES public.menu_templates(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
