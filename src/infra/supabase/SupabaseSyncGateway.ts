/**
 * SupabaseSyncGateway.ts
 * ----------------------
 * Implementação do IRemoteSyncGateway integrada ao Supabase (PostgREST + Storage).
 *
 * Comportamento Offline-First Híbrido:
 * - Quando EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY estão configurados no `.env`,
 *   envia as Ordens de Serviço e metadados de fotos diretamente para as tabelas `ordens_servico`
 *   e `os_fotos` no Supabase via UPSERT idempotente (`on_conflict=id_local`).
 * - Quando as variáveis ainda não estão preenchidas (ambiente de desenvolvimento local / testes),
 *   opera com fallback seguro sem interromper o fluxo Offline-First do aplicativo.
 */

import type { IRemoteSyncGateway, RemoteSyncResponse } from '@/infra/sync/OfflineSyncManager';
import { SupabaseClient, supabase as defaultSupabaseClient } from './supabaseClient';

export interface OrdemServicoSupabaseRow {
  id: string;
  id_local: string;
  synced_at: string;
}

export class SupabaseSyncGateway implements IRemoteSyncGateway {
  constructor(private readonly client: SupabaseClient = defaultSupabaseClient) {}

  public isConfigured(): boolean {
    return this.client.isConfigured();
  }

  /**
   * Envia/atualiza uma Ordem de Serviço no Supabase (`public.ordens_servico`).
   */
  public async enviarOrdemServico(payload: any): Promise<RemoteSyncResponse> {
    const syncedAt = new Date();
    const idLocal = payload.idLocal || payload.id_local;

    if (!idLocal) {
      throw new Error('Payload de sincronização inválido: idLocal ausente.');
    }

    // Fallback seguro caso o .env ainda não tenha sido preenchido pelo desenvolvedor
    if (!this.client.isConfigured()) {
      return {
        idRemoto: `REMOTE-OS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        syncedAt,
      };
    }

    const rowPayload = {
      id_local: idLocal,
      cliente_id: payload.clienteId ?? payload.cliente_id,
      tecnico_id: payload.tecnicoId ?? payload.tecnico_id ?? null,
      tipo_problema: payload.tipoProblema ?? payload.tipo_problema ?? 'OUTROS',
      descricao: payload.descricao ?? '',
      status: payload.status ?? 'PENDENTE',
      parecer_tecnico: payload.parecerTecnico ?? payload.parecer_tecnico ?? null,
      latitude: payload.latitude ?? payload.coordenadas?.latitude ?? null,
      longitude: payload.longitude ?? payload.coordenadas?.longitude ?? null,
      fotos_json: Array.isArray(payload.fotos) ? payload.fotos : [],
      data_fechamento: payload.dataFechamento ?? payload.data_fechamento ?? null,
      synced_at: syncedAt.toISOString(),
    };

    const rows = await this.client.upsert<OrdemServicoSupabaseRow>(
      'ordens_servico',
      rowPayload,
      'id_local'
    );

    const saved = rows?.[0];
    return {
      idRemoto: saved?.id || `SUPABASE-${idLocal}`,
      syncedAt: saved?.synced_at ? new Date(saved.synced_at) : syncedAt,
    };
  }

  /**
   * Registra metadados de foto da OS no Supabase (`public.os_fotos`) e retorna a URL remota.
   */
  public async sincronizarFoto(payload: {
    id: string;
    osId: string;
    fotoLocalPath: string;
    tipo: string;
    tamanhoKb: number;
  }): Promise<{ fotoRemotaUrl: string }> {
    const fileName = `${payload.osId}/${payload.id}.jpg`;

    if (!this.client.isConfigured()) {
      return {
        fotoRemotaUrl: `https://storage.cjnet.local/os-evidencias/${fileName}`,
      };
    }

    const fotoRemotaUrl = this.client.getPublicStorageUrl(fileName);

    await this.client.upsert(
      'os_fotos',
      {
        id: payload.id,
        os_id: payload.osId,
        foto_local_path: payload.fotoLocalPath,
        foto_remota_url: fotoRemotaUrl,
        tipo: payload.tipo,
        tamanho_kb: payload.tamanhoKb,
        enviada: true,
        created_at: new Date().toISOString(),
      },
      'id'
    );

    return { fotoRemotaUrl };
  }
}

