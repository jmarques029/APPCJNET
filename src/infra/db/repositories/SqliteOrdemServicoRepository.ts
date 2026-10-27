/**
 * SqliteOrdemServicoRepository.ts
 * -------------------------------
 * Implementação SQLite do IOrdemServicoRepository.
 * Garante persistência e consultas offline completas de Ordens de Serviço.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { OSFoto } from '@/domain/entities/OSFoto';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import type { TipoProblemaType } from '@/domain/value-objects/TipoProblema';
import type { StatusOSType } from '@/domain/value-objects/StatusOS';

interface OrdemServicoRow {
  id_local: string;
  id_remoto: string | null;
  cliente_id: string;
  tecnico_id: string | null;
  tipo_problema: string;
  descricao: string;
  status: string;
  parecer_tecnico: string | null;
  latitude: number | null;
  longitude: number | null;
  fotos_json: string;
  created_at: string;
  data_fechamento: string | null;
  synced_at: string | null;
}

export class SqliteOrdemServicoRepository implements IOrdemServicoRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async salvar(os: OrdemServico): Promise<void> {
    const fotosData = os.fotos.map((f) => ({
      id: f.id,
      osId: f.osId,
      fotoLocalPath: f.fotoLocalPath,
      fotoRemotaUrl: f.fotoRemotaUrl,
      tipo: f.tipo,
      tamanhoKb: f.tamanhoKb,
      enviada: f.enviada,
      createdAt: f.createdAt.toISOString(),
    }));

    await this.db.runAsync(
      `INSERT OR REPLACE INTO ordens_servico
       (id_local, id_remoto, cliente_id, tecnico_id, tipo_problema, descricao, status, parecer_tecnico, latitude, longitude, fotos_json, created_at, data_fechamento, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      os.idLocal,
      os.idRemoto ?? null,
      os.clienteId,
      os.tecnicoId ?? null,
      os.tipoProblema.value,
      os.descricao,
      os.status.value,
      os.parecerTecnico ?? null,
      os.coordenadas?.latitude ?? null,
      os.coordenadas?.longitude ?? null,
      JSON.stringify(fotosData),
      os.createdAt.toISOString(),
      os.dataFechamento ? os.dataFechamento.toISOString() : null,
      os.syncedAt ? os.syncedAt.toISOString() : null
    );

    for (const foto of os.fotos) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO os_fotos
         (id, os_id, foto_local_path, foto_remota_url, tipo, tamanho_kb, enviada, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        foto.id,
        foto.osId,
        foto.fotoLocalPath,
        foto.fotoRemotaUrl ?? null,
        foto.tipo,
        foto.tamanhoKb,
        foto.enviada ? 1 : 0,
        foto.createdAt.toISOString()
      );
    }
  }

  public async buscarPorIdLocal(idLocal: string): Promise<OrdemServico | null> {
    const row = await this.db.getFirstAsync<OrdemServicoRow>(
      `SELECT * FROM ordens_servico WHERE id_local = ?`,
      idLocal
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async buscarPorIdRemoto(idRemoto: string): Promise<OrdemServico | null> {
    const row = await this.db.getFirstAsync<OrdemServicoRow>(
      `SELECT * FROM ordens_servico WHERE id_remoto = ?`,
      idRemoto
    );
    return row ? this.mapRowToEntity(row) : null;
  }

  public async listarPorCliente(clienteId: string): Promise<OrdemServico[]> {
    const rows = await this.db.getAllAsync<OrdemServicoRow>(
      `SELECT * FROM ordens_servico WHERE cliente_id = ? ORDER BY created_at DESC`,
      clienteId
    );
    return rows.map((r) => this.mapRowToEntity(r));
  }

  public async listarPorTecnico(tecnicoId: string): Promise<OrdemServico[]> {
    const rows = await this.db.getAllAsync<OrdemServicoRow>(
      `SELECT * FROM ordens_servico WHERE tecnico_id = ? ORDER BY created_at DESC`,
      tecnicoId
    );
    return rows.map((r) => this.mapRowToEntity(r));
  }

  public async listarTodas(): Promise<OrdemServico[]> {
    const rows = await this.db.getAllAsync<OrdemServicoRow>(
      `SELECT * FROM ordens_servico ORDER BY created_at DESC`
    );
    return rows.map((r) => this.mapRowToEntity(r));
  }

  private mapRowToEntity(row: OrdemServicoRow): OrdemServico {
    let coordenadas: GeoCoordenadas | null = null;
    if (
      row.latitude !== null &&
      row.latitude !== undefined &&
      row.longitude !== null &&
      row.longitude !== undefined
    ) {
      coordenadas = new GeoCoordenadas(row.latitude, row.longitude);
    }

    let fotos: OSFoto[] = [];
    try {
      const parsed = JSON.parse(row.fotos_json || '[]');
      if (Array.isArray(parsed)) {
        fotos = parsed.map(
          (f: any) =>
            new OSFoto({
              id: f.id,
              osId: f.osId,
              fotoLocalPath: f.fotoLocalPath,
              fotoRemotaUrl: f.fotoRemotaUrl,
              tipo: f.tipo,
              tamanhoKb: f.tamanhoKb,
              enviada: f.enviada,
              createdAt: f.createdAt ? new Date(f.createdAt) : undefined,
            })
        );
      }
    } catch {
      fotos = [];
    }

    return new OrdemServico({
      idLocal: row.id_local,
      idRemoto: row.id_remoto,
      clienteId: row.cliente_id,
      tecnicoId: row.tecnico_id,
      tipoProblema: row.tipo_problema as TipoProblemaType,
      descricao: row.descricao,
      status: row.status as StatusOSType,
      parecerTecnico: row.parecer_tecnico,
      coordenadas,
      fotos,
      createdAt: new Date(row.created_at),
      dataFechamento: row.data_fechamento ? new Date(row.data_fechamento) : null,
      syncedAt: row.synced_at ? new Date(row.synced_at) : null,
    });
  }
}
