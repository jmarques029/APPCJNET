/**
 * SqliteAreaCoberturaRepository.ts
 * --------------------------------
 * Implementação SQLite do IAreaCoberturaRepository.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { IAreaCoberturaRepository } from '@/domain/repositories/IAreaCoberturaRepository';
import { AreaCobertura } from '@/domain/entities/AreaCobertura';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';

interface AreaRow {
  id: string;
  nome_zona: string;
  vertices_json: string;
  ativo: number;
  updated_at: string;
}

export class SqliteAreaCoberturaRepository implements IAreaCoberturaRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async listarTodas(): Promise<AreaCobertura[]> {
    const rows = await this.db.getAllAsync<AreaRow>(
      `SELECT * FROM areas_cobertura WHERE ativo = 1`
    );
    return rows.map((r) => this.mapRowToEntity(r));
  }

  public async buscarPorId(id: string): Promise<AreaCobertura | null> {
    const row = await this.db.getFirstAsync<AreaRow>(
      `SELECT * FROM areas_cobertura WHERE id = ?`,
      id
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async salvar(area: AreaCobertura): Promise<void> {
    const verticesData = area.vertices.map((v) => ({
      latitude: v.latitude,
      longitude: v.longitude,
    }));

    await this.db.runAsync(
      `INSERT OR REPLACE INTO areas_cobertura
       (id, nome_zona, vertices_json, ativo, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      area.id,
      area.nomeZona,
      JSON.stringify(verticesData),
      area.ativo ? 1 : 0,
      area.updatedAt.toISOString()
    );
  }

  private mapRowToEntity(row: AreaRow): AreaCobertura {
    let vertices: GeoCoordenadas[] = [];
    try {
      const parsed = JSON.parse(row.vertices_json || '[]');
      if (Array.isArray(parsed)) {
        vertices = parsed.map((p: any) => new GeoCoordenadas(p.latitude, p.longitude));
      }
    } catch {
      vertices = [];
    }

    return new AreaCobertura({
      id: row.id,
      nomeZona: row.nome_zona,
      vertices,
      ativo: Boolean(row.ativo),
      updatedAt: new Date(row.updated_at),
    });
  }
}
