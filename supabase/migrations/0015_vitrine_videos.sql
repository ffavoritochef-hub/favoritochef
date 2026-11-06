-- =====================================================================
-- 0015 - Vídeos na vitrine
-- ---------------------------------------------------------------------
-- Cole tudo no SQL Editor do Supabase e execute. É idempotente.
--  * libera vídeos (MP4/WEBM/MOV) no bucket tenant-showcase
--  * aumenta o limite por arquivo para 30 MB (fotos continuam sendo
--    comprimidas no navegador antes do envio)
-- O conteúdo (capa, seção de vídeos, fundo do contato) fica no JSONB
-- tenant_showcase.content, que já existe.
-- =====================================================================

DO $$
BEGIN
  BEGIN
    UPDATE storage.buckets
       SET file_size_limit = 31457280,
           allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
     WHERE id = 'tenant-showcase';
  EXCEPTION WHEN undefined_column THEN
    NULL; -- versões antigas do storage não têm limite por bucket
  END;
END $$;
