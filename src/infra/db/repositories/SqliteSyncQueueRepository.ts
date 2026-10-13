/**
 * SqliteSyncQueueRepository.ts
 * ----------------------------
 * Implementação SQLite do repositório da fila de sincronização (sync_queue).
 * Núcleo do padrão Offline-First.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  ISyncQueueRepository,
  SyncQueueItemData,
} from '@/domain/repositories/ISyncQueueRepository';

interface SyncQueueRow {
  id: string;
  entidade: 'ordens_servico' | 'clientes' | 'fotos';
  operacao: 'INSERT' | 'UPDATE';
  payload_json: string;
  tentativas: number;
  status: 'PENDENTE' | 'PROCESSANDO' | 'ERRO' | 'CONCLUIDO';
  ultimo_erro: string | null;
  criado_em: string;
  atualizado_em: string;
}

export class SqliteSyncQueueRepository implements ISyncQueueRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async enfileirar(item: SyncQueueItemData): Promise<void> {
    const agora = new Date().toISOString();
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sync_queue
       (id, entidade, operacao, payload_json, tentativas, status, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.entidade,
      item.operacao,
      item.payloadJson,
      item.tentativas,
      item.status,
      item.criadoEm.toISOString(),
      agora
    );
  }

  public async obterPendentes(): Promise<SyncQueueItemData[]> {
    const rows = await this.db.getAllAsync<SyncQueueRow>(
      `SELECT * FROM sync_queue WHERE status = 'PENDENTE' ORDER BY criado_em ASC`
    );

    return rows.map((r) => ({
      id: r.id,
      entidade: r.entidade,
      operacao: r.operacao,
      payloadJson: r.payload_json,
      tentativas: r.tentativas,
      status: r.status,
      criadoEm: new Date(r.criado_em),
    }));
  }

  public async marcarConcluido(id: string): Promise<void> {
    const agora = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE sync_queue SET status = 'CONCLUIDO', atualizado_em = ? WHERE id = ?`,
      agora,
      id
    );
  }

  public async incrementarTentativa(id: string, erro?: string): Promise<void> {
    const agora = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE sync_queue
       SET tentativas = tentativas + 1,
           status = CASE WHEN tentativas >= 4 THEN 'ERRO' ELSE 'PENDENTE' END,
           ultimo_erro = ?,
           atualizado_em = ?
       WHERE id = ?`,
      erro ?? null,
      agora,
      id
    );
  }

  public async limparConcluidos(): Promise<void> {
    await this.db.runAsync(`DELETE FROM sync_queue WHERE status = 'CONCLUIDO'`);
  }
}
