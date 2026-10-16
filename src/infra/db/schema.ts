/**
 * schema.ts
 * ---------
 * Definições DDL do banco de dados SQLite local do CJnet EcoField.
 * Suporte a arquitetura Offline-First com tabelas relacionais,
 * chaves estrangeiras e fila de sincronização (sync_queue).
 */

export const CREATE_TABLES_SQL = `
  PRAGMA foreign_keys = ON;

  -- 1. Clientes e Usuários Locais
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY NOT NULL,
    auth_user_id TEXT NOT NULL UNIQUE,
    plano_id TEXT,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    papel TEXT NOT NULL DEFAULT 'CLIENTE',
    status_contrato TEXT NOT NULL DEFAULT 'ATIVO',
    push_token TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 2. Planos de Internet Fibra Óptica
  CREATE TABLE IF NOT EXISTS planos (
    id TEXT PRIMARY KEY NOT NULL,
    nome TEXT NOT NULL,
    velocidade_mbps INTEGER NOT NULL,
    preco_mensal REAL NOT NULL,
    beneficios_json TEXT NOT NULL DEFAULT '[]',
    ativo INTEGER NOT NULL DEFAULT 1,
    destaque INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 3. Áreas de Cobertura de Fibra
  CREATE TABLE IF NOT EXISTS areas_cobertura (
    id TEXT PRIMARY KEY NOT NULL,
    nome_zona TEXT NOT NULL,
    vertices_json TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  -- 4. Pré-Cadastros / Solicitações de Assinatura
  CREATE TABLE IF NOT EXISTS pre_cadastros (
    id TEXT PRIMARY KEY NOT NULL,
    plano_id TEXT NOT NULL,
    area_cobertura_id TEXT,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL,
    telefone TEXT NOT NULL,
    endereco_completo TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    criado_em TEXT NOT NULL,
    FOREIGN KEY (plano_id) REFERENCES planos (id) ON DELETE RESTRICT
  );

  -- 5. Ordens de Serviço (Chamados)
  CREATE TABLE IF NOT EXISTS ordens_servico (
    id_local TEXT PRIMARY KEY NOT NULL,
    id_remoto TEXT UNIQUE,
    cliente_id TEXT NOT NULL,
    tecnico_id TEXT,
    tipo_problema TEXT NOT NULL,
    descricao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    parecer_tecnico TEXT,
    latitude REAL,
    longitude REAL,
    fotos_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    data_fechamento TEXT,
    synced_at TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
  );

  -- 6. Fotos das Ordens de Serviço
  CREATE TABLE IF NOT EXISTS os_fotos (
    id TEXT PRIMARY KEY NOT NULL,
    os_id TEXT NOT NULL,
    foto_local_path TEXT NOT NULL,
    foto_remota_url TEXT,
    tipo TEXT NOT NULL,
    tamanho_kb REAL NOT NULL,
    enviada INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (os_id) REFERENCES ordens_servico (id_local) ON DELETE CASCADE
  );

  -- 7. Fila de Sincronização Offline-First
  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entidade TEXT NOT NULL,
    operacao TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    tentativas INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    ultimo_erro TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );

  -- 8. Mensagens de Suporte e Acompanhamento da OS
  CREATE TABLE IF NOT EXISTS mensagens_suporte (
    id TEXT PRIMARY KEY NOT NULL,
    os_id TEXT NOT NULL,
    remetente_id TEXT NOT NULL,
    remetente_nome TEXT NOT NULL,
    papel TEXT NOT NULL,
    texto TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (os_id) REFERENCES ordens_servico (id_local) ON DELETE CASCADE
  );

  -- Índices de Performance para Consultas Offline
  CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico (cliente_id);
  CREATE INDEX IF NOT EXISTS idx_os_tecnico ON ordens_servico (tecnico_id);
  CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico (status);
  CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue (status, criado_em);
  CREATE INDEX IF NOT EXISTS idx_msg_os ON mensagens_suporte (os_id);
`;
