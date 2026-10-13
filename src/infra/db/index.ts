/**
 * src/infra/db/index.ts
 * ---------------------
 * Ponto de entrada do módulo de banco de dados SQLite local (Offline-First).
 */

export * from './schema';
export * from './database';
export * from './repositories/SqliteSyncQueueRepository';
export * from './repositories/SqliteOrdemServicoRepository';
export * from './repositories/SqliteClienteRepository';
export * from './repositories/SqlitePlanoRepository';
export * from './repositories/SqliteAreaCoberturaRepository';
export * from './repositories/SqlitePreCadastroRepository';
export * from './repositories/SqliteMensagemSuporteRepository';
