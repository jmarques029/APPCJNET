/**
 * SqlitePlanoRepository.ts
 * ------------------------
 * Implementação SQLite do IPlanoRepository.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { IPlanoRepository } from '@/domain/repositories/IPlanoRepository';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { Preco } from '@/domain/value-objects/Preco';

interface PlanoRow {
  id: string;
  nome: string;
  velocidade_mbps: number;
  preco_mensal: number;
  beneficios_json: string;
  ativo: number;
  destaque: number;
  created_at: string;
  updated_at: string;
}

export class SqlitePlanoRepository implements IPlanoRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async listarAtivos(): Promise<PlanoInternet[]> {
    const rows = await this.db.getAllAsync<PlanoRow>(
      `SELECT * FROM planos WHERE ativo = 1 ORDER BY velocidade_mbps ASC`
    );
    return rows.map((r) => this.mapRowToEntity(r));
  }

  public async buscarPorId(id: string): Promise<PlanoInternet | null> {
    const row = await this.db.getFirstAsync<PlanoRow>(
      `SELECT * FROM planos WHERE id = ?`,
      id
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async salvar(plano: PlanoInternet): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO planos
       (id, nome, velocidade_mbps, preco_mensal, beneficios_json, ativo, destaque, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      plano.id,
      plano.nome,
      plano.velocidadeMbps,
      plano.precoMensal.valorReais,
      JSON.stringify(plano.beneficios),
      plano.ativo ? 1 : 0,
      plano.destaque ? 1 : 0,
      plano.createdAt.toISOString(),
      plano.updatedAt.toISOString()
    );
  }

  private mapRowToEntity(row: PlanoRow): PlanoInternet {
    let beneficios: string[] = [];
    try {
      beneficios = JSON.parse(row.beneficios_json || '[]');
    } catch {
      beneficios = [];
    }

    return new PlanoInternet({
      id: row.id,
      nome: row.nome,
      velocidadeMbps: row.velocidade_mbps,
      precoMensal: Preco.fromReais(row.preco_mensal),
      beneficios,
      ativo: Boolean(row.ativo),
      destaque: Boolean(row.destaque),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
