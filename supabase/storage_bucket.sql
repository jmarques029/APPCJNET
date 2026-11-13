-- ============================================================================
-- Criar Bucket "os-evidencias" e Políticas de Acesso no Supabase Storage
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'os-evidencias',
  'os-evidencias',
  true,
  5242880, -- 5 MB (o app já comprime as fotos para <= 1 MB)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  -- Remove a policy ampla de SELECT (buckets públicos já servem URLs públicas sem listar arquivos)
  DROP POLICY IF EXISTS "Leitura publica os-evidencias" ON storage.objects;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Upload app os-evidencias'
  ) THEN
    CREATE POLICY "Upload app os-evidencias"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'os-evidencias');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Update app os-evidencias'
  ) THEN
    CREATE POLICY "Update app os-evidencias"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'os-evidencias')
      WITH CHECK (bucket_id = 'os-evidencias');
  END IF;
END $$;

