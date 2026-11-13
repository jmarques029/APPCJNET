-- ============================================================================
-- CJnet EcoField - Schema PostgreSQL para Supabase (Offline-First Sync)
-- ============================================================================
-- Como usar:
-- 1. Acesse https://supabase.com/dashboard -> Seu Projeto -> SQL Editor
-- 2. Cole todo este conteúdo e clique em "Run" (Executar).
-- ============================================================================

-- 1. Planos de Internet Fibra Óptica
CREATE TABLE IF NOT EXISTS public.planos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  velocidade_mbps INTEGER NOT NULL,
  preco_mensal NUMERIC(10,2) NOT NULL,
  beneficios_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  destaque BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Clientes e Perfis de Usuários (Cliente, Técnico, Admin)
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT NOT NULL UNIQUE,
  plano_id TEXT REFERENCES public.planos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'CLIENTE',
  status_contrato TEXT NOT NULL DEFAULT 'ATIVO',
  push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Áreas de Cobertura de Fibra (Polígonos GeoJSON/Vértices)
CREATE TABLE IF NOT EXISTS public.areas_cobertura (
  id TEXT PRIMARY KEY,
  nome_zona TEXT NOT NULL,
  vertices_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Pré-Cadastros / Solicitações de Assinatura
CREATE TABLE IF NOT EXISTS public.pre_cadastros (
  id TEXT PRIMARY KEY,
  plano_id TEXT NOT NULL REFERENCES public.planos(id) ON DELETE RESTRICT,
  area_cobertura_id TEXT,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco_completo TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Ordens de Serviço (Chamados Técnicos)
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_local TEXT UNIQUE NOT NULL,
  cliente_id TEXT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tecnico_id TEXT,
  tipo_problema TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  parecer_tecnico TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  fotos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Fotos das Ordens de Serviço (Metadados e URL do Supabase Storage)
CREATE TABLE IF NOT EXISTS public.os_fotos (
  id TEXT PRIMARY KEY,
  os_id TEXT NOT NULL REFERENCES public.ordens_servico(id_local) ON DELETE CASCADE,
  foto_local_path TEXT NOT NULL,
  foto_remota_url TEXT,
  tipo TEXT NOT NULL,
  tamanho_kb DOUBLE PRECISION NOT NULL,
  enviada BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Mensagens de Suporte e Acompanhamento da OS
CREATE TABLE IF NOT EXISTS public.mensagens_suporte (
  id TEXT PRIMARY KEY,
  os_id TEXT NOT NULL REFERENCES public.ordens_servico(id_local) ON DELETE CASCADE,
  remetente_id TEXT NOT NULL,
  remetente_nome TEXT NOT NULL,
  papel TEXT NOT NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_os_cliente ON public.ordens_servico (cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_tecnico ON public.ordens_servico (tecnico_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON public.ordens_servico (status);
CREATE INDEX IF NOT EXISTS idx_msg_os ON public.mensagens_suporte (os_id);

-- ============================================================================
-- Políticas RLS (Row Level Security) para acesso via Anon/Authenticated Key
-- ============================================================================
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas_cobertura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_suporte ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'planos' AND policyname = 'Acesso publico planos') THEN
    CREATE POLICY "Acesso publico planos" ON public.planos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Acesso app clientes') THEN
    CREATE POLICY "Acesso app clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'areas_cobertura' AND policyname = 'Acesso publico areas') THEN
    CREATE POLICY "Acesso publico areas" ON public.areas_cobertura FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_cadastros' AND policyname = 'Acesso app pre_cadastros') THEN
    CREATE POLICY "Acesso app pre_cadastros" ON public.pre_cadastros FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ordens_servico' AND policyname = 'Acesso app ordens_servico') THEN
    CREATE POLICY "Acesso app ordens_servico" ON public.ordens_servico FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'os_fotos' AND policyname = 'Acesso app os_fotos') THEN
    CREATE POLICY "Acesso app os_fotos" ON public.os_fotos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_suporte' AND policyname = 'Acesso app mensagens_suporte') THEN
    CREATE POLICY "Acesso app mensagens_suporte" ON public.mensagens_suporte FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 8. Bucket do Supabase Storage (os-evidencias) e Políticas de Upload/Leitura
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'os-evidencias',
  'os-evidencias',
  true,
  5242880, -- Limite de 5 MB por arquivo (o app já comprime para <= 1 MB)
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

-- ============================================================================
-- Seed Inicial (Planos CJnet, Clientes Demo e Áreas de Cobertura Coqueiral/MG)
-- ============================================================================
INSERT INTO public.planos (id, nome, velocidade_mbps, preco_mensal, beneficios_json, ativo, destaque)
VALUES
  ('plano-200', 'CJnet Fibra 200 Mega', 200, 89.90, '["100% Fibra Óptica até o roteador", "Roteador Wi-Fi Dual Band incluso", "Instalação 100% Gratuita", "Suporte Técnico Local Coqueiral"]'::jsonb, true, false),
  ('plano-400', 'CJnet Fibra 400 Mega Ultra', 400, 109.90, '["Wi-Fi 6 de Última Geração comodato", "Instalação Express Gratuita", "Prioridade no Atendimento e Suporte", "Ideal para Streaming 4K e Home Office"]'::jsonb, true, true),
  ('plano-600', 'CJnet Fibra 600 Mega Gamer', 600, 139.90, '["Baixíssima latência (Ping Reduzido)", "Wi-Fi 6 Gamer Alta Performance", "Upload Turbinado (50% do download)", "Suporte Prioritário CJnet VIP"]'::jsonb, true, false),
  ('plano-1000', 'CJnet Fibra 1 Giga Dedicado', 1000, 189.90, '["Velocidade Máxima Gigabits", "2 Roteadores Wi-Fi Mesh Inclusos", "IP Fixo sob demanda", "Gerente de Contas Dedicado"]'::jsonb, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clientes (id, auth_user_id, plano_id, nome, cpf_cnpj, email, telefone, papel, status_contrato)
VALUES
  ('cli-cjnet-01', 'auth-demo-01', 'plano-400', 'Carlos Eduardo Silva', '52998224725', 'carlos.silva@cjnet.com.br', '35998765432', 'CLIENTE', 'ATIVO'),
  ('cli-maria-02', 'auth-demo-02', 'plano-200', 'Maria Fernandes', '52998224725', 'maria.fernandes@cjnet.com.br', '35997654321', 'CLIENTE', 'ATIVO'),
  ('tec-joao-01', 'auth-tec-01', NULL, 'João Santos', '52998224725', 'tecnico@cjnet.com.br', '35998112233', 'TECNICO', 'ATIVO'),
  ('adm-01', 'auth-adm-01', NULL, 'Gerência CJnet', '11222333000181', 'admin@cjnet.com.br', '3538551234', 'ADMIN', 'ATIVO')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.areas_cobertura (id, nome_zona, vertices_json, ativo)
VALUES
  ('area-centro', 'Centro e Bairros Adjacentes (Coqueiral/MG)', '[{"latitude":-21.18,"longitude":-45.445},{"latitude":-21.18,"longitude":-45.43},{"latitude":-21.195,"longitude":-45.43},{"latitude":-21.195,"longitude":-45.445}]'::jsonb, true),
  ('area-sul', 'Zona Sul e Parque das Águas (Coqueiral/MG)', '[{"latitude":-21.195,"longitude":-45.45},{"latitude":-21.195,"longitude":-45.425},{"latitude":-21.21,"longitude":-45.425},{"latitude":-21.21,"longitude":-45.45}]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

