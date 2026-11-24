-- =====================================================================
-- Migration 0016: correções de cadastro (clientes e eventos)
-- ---------------------------------------------------------------------
-- 1) clients.address não existia: editar cliente dava erro
--    "column clients.address does not exist".
-- 2) Só o NOME do cliente e os dados básicos do evento são obrigatórios;
--    CPF/CNPJ, e-mail, telefones, endereço etc. passam a aceitar vazio.
-- 3) Status antigos do formulário de novo evento ("Confirmado",
--    "Concluído") viram os do fluxo atual ("Aprovado", "Finalizado").
-- 4) Unicidade de cadastro passa a valer POR EMPRESA (tenant): o mesmo
--    CPF/e-mail/categoria pode existir em dois buffets diferentes.
-- Idempotente: pode rodar de novo.
-- =====================================================================

-- 1) Endereço do cliente
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;

-- 2) Campos opcionais: remove NOT NULL onde existir
DO $$
DECLARE
  opt TEXT[][] := ARRAY[
    ['clients','document'], ['clients','email'], ['clients','phone'],
    ['clients','whatsapp'], ['clients','address'],
    ['events','type'], ['events','address'], ['events','observations'],
    ['events','guest_count']
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(opt, 1) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = opt[i][1]
        AND column_name = opt[i][2] AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', opt[i][1], opt[i][2]);
      RAISE NOTICE 'NOT NULL removido de %.%', opt[i][1], opt[i][2];
    END IF;
  END LOOP;
END $$;

-- Vazios antigos viram nulo (evita colisão em índices únicos e deixa a busca limpa)
UPDATE public.clients SET document = NULL WHERE document IS NOT NULL AND btrim(document) = '';
UPDATE public.clients SET email    = NULL WHERE email    IS NOT NULL AND btrim(email)    = '';
UPDATE public.clients SET phone    = NULL WHERE phone    IS NOT NULL AND btrim(phone)    = '';
UPDATE public.clients SET whatsapp = NULL WHERE whatsapp IS NOT NULL AND btrim(whatsapp) = '';

-- 3) Status de evento: um único vocabulário
DO $$
DECLARE c RECORD;
BEGIN
  -- CHECK antigo em events.status (se houver) seria incompatível com o fluxo atual
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public' AND rel.relname = 'events' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.events DROP CONSTRAINT %I', c.conname);
    RAISE NOTICE 'CHECK % removido de events', c.conname;
  END LOOP;
END $$;

UPDATE public.events SET status = 'Aprovado'   WHERE status = 'Confirmado';
UPDATE public.events SET status = 'Finalizado' WHERE status = 'Concluído';

-- 4) UNIQUE global -> UNIQUE por empresa
--    Procura restrições/índices únicos nas tabelas de cadastro que NÃO
--    incluem tenant_id (fora a chave primária) e recria com tenant_id.
DO $$
DECLARE
  r RECORD;
  cols TEXT;
  tables TEXT[] := ARRAY['clients','events','finance_transactions','menu_templates',
                         'menu_template_items','categories','menu_items','employees'];
BEGIN
  FOR r IN
    SELECT ns.nspname, tbl.relname AS tbl, idx.relname AS idxname, i.indexrelid,
           con.conname, i.indkey
    FROM pg_index i
    JOIN pg_class idx ON idx.oid = i.indexrelid
    JOIN pg_class tbl ON tbl.oid = i.indrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid AND con.contype = 'u'
    WHERE ns.nspname = 'public'
      AND tbl.relname = ANY(tables)
      AND i.indisunique AND NOT i.indisprimary
      AND i.indexprs IS NULL
      -- não mexe em índice que é alvo de chave estrangeira
      AND NOT EXISTS (SELECT 1 FROM pg_constraint f WHERE f.contype = 'f' AND f.conindid = i.indexrelid)
      AND NOT EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = tbl.oid AND a.attnum = ANY(i.indkey) AND a.attname = 'tenant_id'
      )
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(r.indkey::int2[], a.attnum))
      INTO cols
    FROM pg_attribute a
    WHERE a.attrelid = (SELECT indrelid FROM pg_index WHERE indexrelid = r.indexrelid)
      AND a.attnum = ANY(r.indkey);

    IF r.conname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.conname);
    ELSE
      EXECUTE format('DROP INDEX public.%I', r.idxname);
    END IF;
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (tenant_id, %s)',
                   r.idxname || '_tenant', r.tbl, cols);
    RAISE NOTICE 'Unicidade de %(%) agora é por empresa', r.tbl, cols;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
