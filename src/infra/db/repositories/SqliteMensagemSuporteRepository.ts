/**
 * SqliteMensagemSuporteRepository.ts
 * ---------------------------------
 * Repositório SQLite para armazenamento local de mensagens de suporte e chat da OS.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export interface MensagemSuporteData {
  id: string;
  osId: string;
  remetenteId: string;
  remetenteNome: string;
  papel: 'CLIENTE' | 'ADMIN' | 'TECNICO';
  texto: string;
  createdAt: Date;
}

interface MensagemRow {
  id: string;
  os_id: string;
  remetente_id: string;
  remetente_nome: string;
  papel: 'CLIENTE' | 'ADMIN' | 'TECNICO';
  texto: string;
  created_at: string;
}

export class SqliteMensagemSuporteRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async salvar(msg: MensagemSuporteData): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO mensagens_suporte
       (id, os_id, remetente_id, remetente_nome, papel, texto, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      msg.id,
      msg.osId,
      msg.remetenteId,
      msg.remetenteNome,
      msg.papel,
      msg.texto,
      msg.createdAt.toISOString()
    );
  }

  public async listarPorOS(osId: string): Promise<MensagemSuporteData[]> {
    const rows = await this.db.getAllAsync<MensagemRow>(
      `SELECT * FROM mensagens_suporte WHERE os_id = ? ORDER BY created_at ASC`,
      osId
    );
    return rows.map((r) => ({
      id: r.id,
      osId: r.os_id,
      remetenteId: r.remetente_id,
      remetenteNome: r.remetente_nome,
      papel: r.papel,
      texto: r.texto,
      createdAt: new Date(r.created_at),
    }));
  }
}
