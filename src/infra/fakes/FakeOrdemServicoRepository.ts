import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { SupabaseSyncGateway } from '@/infra/supabase/SupabaseSyncGateway';

export class FakeOrdemServicoRepository implements IOrdemServicoRepository {
  private readonly items = new Map<string, OrdemServico>();
  private suppressRemoteSync = false;

  public setSuppressRemoteSync(suppress: boolean): void {
    this.suppressRemoteSync = suppress;
  }

  public async salvar(os: OrdemServico): Promise<void> {
    this.items.set(os.idLocal, os);

    // Sincroniza automaticamente com o Supabase (tabelas + Storage bucket os-evidencias)
    // quando executado no aplicativo real com .env configurado.
    if (!this.suppressRemoteSync && process.env.NODE_ENV !== 'test') {
      const gateway = new SupabaseSyncGateway();
      if (gateway.isConfigured()) {
        try {
          const payload = {
            idLocal: os.idLocal,
            clienteId: os.clienteId,
            tecnicoId: os.tecnicoId,
            tipoProblema: os.tipoProblema.value,
            descricao: os.descricao,
            status: os.status.value,
            parecerTecnico: os.parecerTecnico,
            latitude: os.coordenadas?.latitude ?? null,
            longitude: os.coordenadas?.longitude ?? null,
            fotos: os.fotos.map((f) => ({
              id: f.id,
              osId: f.osId,
              fotoLocalPath: f.fotoLocalPath,
              fotoRemotaUrl: f.fotoRemotaUrl,
              tipo: f.tipo,
              tamanhoKb: f.tamanhoKb,
              enviada: f.enviada,
              createdAt: f.createdAt.toISOString(),
            })),
            dataFechamento: os.dataFechamento ? os.dataFechamento.toISOString() : null,
          };

          const remoteRes = await gateway.enviarOrdemServico(payload);
          os.marcarComoSincronizada(remoteRes.idRemoto, remoteRes.syncedAt);
          this.items.set(os.idLocal, os);
        } catch (err) {
          console.warn('Falha ao sincronizar OS com Supabase (mantida offline localmente):', err);
        }
      }
    }
  }

  public async buscarPorIdLocal(idLocal: string): Promise<OrdemServico | null> {
    return this.items.get(idLocal) ?? null;
  }

  public async buscarPorIdRemoto(idRemoto: string): Promise<OrdemServico | null> {
    for (const os of this.items.values()) {
      if (os.idRemoto === idRemoto) {
        return os;
      }
    }
    return null;
  }

  public async listarPorCliente(clienteId: string): Promise<OrdemServico[]> {
    return Array.from(this.items.values()).filter((os) => os.clienteId === clienteId);
  }

  public async listarPorTecnico(tecnicoId: string): Promise<OrdemServico[]> {
    return Array.from(this.items.values()).filter((os) => os.tecnicoId === tecnicoId);
  }

  public async listarTodas(): Promise<OrdemServico[]> {
    return Array.from(this.items.values());
  }

  public limpar(): void {
    this.items.clear();
  }
}
