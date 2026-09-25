import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';

export class FakeOrdemServicoRepository implements IOrdemServicoRepository {
  private readonly items = new Map<string, OrdemServico>();

  public async salvar(os: OrdemServico): Promise<void> {
    this.items.set(os.idLocal, os);
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
