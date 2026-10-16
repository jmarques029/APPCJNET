/**
 * database.ts
 * -----------
 * Gerenciador de conexão e inicialização do banco de dados SQLite local.
 * Utiliza a API moderna do Expo SDK 57 (expo-sqlite).
 */

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

export const DATABASE_NAME = 'ecofield.db';
export const CURRENT_DB_VERSION = 1;

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Obtém a conexão com o banco de dados SQLite local.
 */
export async function getDatabaseConnection(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbInstance;
}

/**
 * Executa as migrações e inicialização do schema de tabelas.
 */
export async function initDatabase(db?: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> {
  const targetDb = db ?? (await getDatabaseConnection());

  // 1. Configurar WAL mode (plataformas nativas) com fallback seguro
  try {
    if (Platform.OS !== 'web') {
      await targetDb.execAsync('PRAGMA journal_mode = WAL;');
    }
  } catch {
    // Silencia se o driver VFS não suportar WAL
  }

  // 2. Configurar integridade e migração com user_version
  const versionRow = await targetDb.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < CURRENT_DB_VERSION) {
    await targetDb.execAsync(CREATE_TABLES_SQL);
    await targetDb.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION};`);
    await seedInitialDataIfEmpty(targetDb);
  }

  return targetDb;
}

/**
 * Popula dados iniciais caso a base local esteja vazia (Planos CJnet, Zonas de Cobertura e Usuários Demo).
 */
export async function seedInitialDataIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const clienteCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM clientes'
  );

  if ((clienteCount?.count ?? 0) === 0) {
    const now = new Date().toISOString();

    // 1. Clientes e Perfis Demo
    await db.runAsync(
      `INSERT INTO clientes (id, auth_user_id, nome, cpf_cnpj, email, telefone, papel, status_contrato, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'cli-cjnet-01',
      'auth-demo-01',
      'Carlos Eduardo Silva',
      '52998224725',
      'carlos.silva@cjnet.com.br',
      '35998765432',
      'CLIENTE',
      'ATIVO',
      now,
      now
    );

    await db.runAsync(
      `INSERT INTO clientes (id, auth_user_id, nome, cpf_cnpj, email, telefone, papel, status_contrato, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'cli-maria-02',
      'auth-demo-02',
      'Maria Fernandes',
      '52998224725',
      'maria.fernandes@cjnet.com.br',
      '35997654321',
      'CLIENTE',
      'ATIVO',
      now,
      now
    );

    await db.runAsync(
      `INSERT INTO clientes (id, auth_user_id, nome, cpf_cnpj, email, telefone, papel, status_contrato, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'tec-joao-01',
      'auth-tec-01',
      'João Santos',
      '52998224725',
      'tecnico@cjnet.com.br',
      '35998112233',
      'TECNICO',
      'ATIVO',
      now,
      now
    );

    await db.runAsync(
      `INSERT INTO clientes (id, auth_user_id, nome, cpf_cnpj, email, telefone, papel, status_contrato, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'adm-01',
      'auth-adm-01',
      'Gerência CJnet',
      '11222333000181',
      'admin@cjnet.com.br',
      '3538551234',
      'ADMIN',
      'ATIVO',
      now,
      now
    );

    // 2. Planos de Internet Fibra Óptica
    const planos = [
      {
        id: 'plano-200',
        nome: 'CJnet Fibra 200 Mega',
        velocidade: 200,
        preco: 89.9,
        beneficios: JSON.stringify([
          '100% Fibra Óptica até o roteador',
          'Roteador Wi-Fi Dual Band incluso',
          'Instalação 100% Gratuita',
          'Suporte Técnico Local Coqueiral',
        ]),
        destaque: 0,
      },
      {
        id: 'plano-400',
        nome: 'CJnet Fibra 400 Mega Ultra',
        velocidade: 400,
        preco: 109.9,
        beneficios: JSON.stringify([
          'Wi-Fi 6 de Última Geração comodato',
          'Instalação Express Gratuita',
          'Prioridade no Atendimento e Suporte',
          'Ideal para Streaming 4K e Home Office',
        ]),
        destaque: 1,
      },
      {
        id: 'plano-600',
        nome: 'CJnet Fibra 600 Mega Gamer',
        velocidade: 600,
        preco: 139.9,
        beneficios: JSON.stringify([
          'Baixíssima latência (Ping Reduzido)',
          'Wi-Fi 6 Gamer Alta Performance',
          'Upload Turbinado (50% do download)',
          'Suporte Prioritário CJnet VIP',
        ]),
        destaque: 0,
      },
      {
        id: 'plano-1000',
        nome: 'CJnet Fibra 1 Giga Dedicado',
        velocidade: 1000,
        preco: 189.9,
        beneficios: JSON.stringify([
          'Velocidade Máxima Gigabits',
          '2 Roteadores Wi-Fi Mesh Inclusos',
          'IP Fixo sob demanda',
          'Gerente de Contas Dedicado',
        ]),
        destaque: 0,
      },
    ];

    for (const p of planos) {
      await db.runAsync(
        `INSERT INTO planos (id, nome, velocidade_mbps, preco_mensal, beneficios_json, ativo, destaque, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        p.nome,
        p.velocidade,
        p.preco,
        p.beneficios,
        1,
        p.destaque,
        now,
        now
      );
    }

    // 3. Áreas de Cobertura (Polígonos de Coqueiral/MG)
    const verticesCentro = JSON.stringify([
      { latitude: -21.18, longitude: -45.445 },
      { latitude: -21.18, longitude: -45.43 },
      { latitude: -21.195, longitude: -45.43 },
      { latitude: -21.195, longitude: -45.445 },
    ]);

    const verticesSul = JSON.stringify([
      { latitude: -21.195, longitude: -45.45 },
      { latitude: -21.195, longitude: -45.425 },
      { latitude: -21.21, longitude: -45.425 },
      { latitude: -21.21, longitude: -45.45 },
    ]);

    await db.runAsync(
      `INSERT INTO areas_cobertura (id, nome_zona, vertices_json, ativo, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      'area-centro',
      'Centro e Bairros Adjacentes (Coqueiral/MG)',
      verticesCentro,
      1,
      now
    );

    await db.runAsync(
      `INSERT INTO areas_cobertura (id, nome_zona, vertices_json, ativo, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      'area-sul',
      'Zona Sul e Parque das Águas (Coqueiral/MG)',
      verticesSul,
      1,
      now
    );

    // 4. Ordens de Serviço Iniciais
    const h3 = new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString();
    const h24 = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const h72 = new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString();
    const h70 = new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString();

    await db.runAsync(
      `INSERT INTO ordens_servico (id_local, cliente_id, tipo_problema, descricao, status, created_at, fotos_json)
       VALUES (?, ?, ?, ?, ?, ?, '[]')`,
      'OS-1001',
      'cli-cjnet-01',
      'SEM_SINAL',
      'Sem conexão de internet na sala. Luz PON da ONU piscando em vermelho.',
      'PENDENTE',
      h3
    );

    await db.runAsync(
      `INSERT INTO ordens_servico (id_local, cliente_id, tecnico_id, tipo_problema, descricao, status, created_at, fotos_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]')`,
      'OS-1002',
      'cli-cjnet-01',
      'tec-joao-01',
      'LENTIDAO',
      'Velocidade oscilando abaixo de 20 Mega no período noturno durante videoconferência.',
      'EM_ATENDIMENTO',
      h24
    );

    await db.runAsync(
      `INSERT INTO ordens_servico (id_local, cliente_id, tecnico_id, tipo_problema, descricao, status, parecer_tecnico, created_at, data_fechamento, fotos_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`,
      'OS-1003',
      'cli-cjnet-01',
      'tec-marcos-02',
      'QUEDA',
      'Quedas sucessivas do sinal de internet após fortes chuvas de vento na região central.',
      'CONCLUIDO',
      'Conector óptico na caixa de emenda (CTO-04) refeito. Potência óptica normalizada em -19.2 dBm.',
      h72,
      h70
    );

    await db.runAsync(
      `INSERT INTO ordens_servico (id_local, cliente_id, tipo_problema, descricao, status, created_at, fotos_json)
       VALUES (?, ?, ?, ?, ?, ?, '[]')`,
      'OS-2001',
      'cli-maria-02',
      'OUTROS',
      'Instalação de ponto adicional no escritório residencial após reforma.',
      'PENDENTE',
      h3
    );

    // 5. Mensagens de Suporte
    await db.runAsync(
      `INSERT INTO mensagens_suporte (id, os_id, remetente_id, remetente_nome, papel, texto, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'msg-01',
      'OS-1002',
      'adm-01',
      'Gerência CJnet',
      'ADMIN',
      'Olá Carlos! Seu chamado foi recebido e atribuído ao técnico João Santos. Ele chegará até as 16h.',
      new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    );

    await db.runAsync(
      `INSERT INTO mensagens_suporte (id, os_id, remetente_id, remetente_nome, papel, texto, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'msg-02',
      'OS-1002',
      'cli-cjnet-01',
      'Carlos Eduardo Silva',
      'CLIENTE',
      'Perfeito! Estarei em casa aguardando o técnico.',
      new Date(Date.now() - 1000 * 60 * 50).toISOString()
    );
  }
}
