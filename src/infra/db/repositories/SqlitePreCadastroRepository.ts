/**
 * SqlitePreCadastroRepository.ts
 * ------------------------------
 * Implementação SQLite do IPreCadastroRepository.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { IPreCadastroRepository } from '@/domain/repositories/IPreCadastroRepository';
import { PreCadastro, type StatusPreCadastro } from '@/domain/entities/PreCadastro';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';

interface PreCadastroRow {
  id: string;
  plano_id: string;
  area_cobertura_id: string | null;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  endereco_completo: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  criado_em: string;
}

export class SqlitePreCadastroRepository implements IPreCadastroRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async salvar(preCadastro: PreCadastro): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO pre_cadastros
       (id, plano_id, area_cobertura_id, nome, cpf_cnpj, telefone, endereco_completo, latitude, longitude, status, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      preCadastro.id,
      preCadastro.planoId,
      preCadastro.areaCoberturaId ?? null,
      preCadastro.nome,
      preCadastro.cpfCnpj.value,
      preCadastro.telefone,
      preCadastro.enderecoCompleto,
      preCadastro.coordenadas?.latitude ?? null,
      preCadastro.coordenadas?.longitude ?? null,
      preCadastro.status,
      preCadastro.criadoEm.toISOString()
    );
  }

  public async buscarPorId(id: string): Promise<PreCadastro | null> {
    const row = await this.db.getFirstAsync<PreCadastroRow>(
      `SELECT * FROM pre_cadastros WHERE id = ?`,
      id
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async listarTodos(): Promise<PreCadastro[]> {
    const rows = await this.db.getAllAsync<PreCadastroRow>(
      `SELECT * FROM pre_cadastros ORDER BY criado_em DESC`
    );
    return rows.map((r) => this.mapRowToEntity(r));
  }

  private mapRowToEntity(row: PreCadastroRow): PreCadastro {
    let coordenadas: GeoCoordenadas | undefined;
    if (
      row.latitude !== null &&
      row.latitude !== undefined &&
      row.longitude !== null &&
      row.longitude !== undefined
    ) {
      coordenadas = new GeoCoordenadas(row.latitude, row.longitude);
    }

    return new PreCadastro({
      id: row.id,
      planoId: row.plano_id,
      areaCoberturaId: row.area_cobertura_id ?? undefined,
      nome: row.nome,
      cpfCnpj: new CpfCnpj(row.cpf_cnpj),
      telefone: row.telefone,
      enderecoCompleto: row.endereco_completo,
      coordenadas,
      status: row.status as StatusPreCadastro,
      criadoEm: new Date(row.criado_em),
    });
  }
}
