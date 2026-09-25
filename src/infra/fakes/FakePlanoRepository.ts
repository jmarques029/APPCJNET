import { IPlanoRepository } from '@/domain/repositories/IPlanoRepository';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';

export class FakePlanoRepository implements IPlanoRepository {
  private readonly items = new Map<string, PlanoInternet>();

  public async listarAtivos(): Promise<PlanoInternet[]> {
    return Array.from(this.items.values()).filter((plano) => plano.ativo);
  }

  public async buscarPorId(id: string): Promise<PlanoInternet | null> {
    return this.items.get(id) ?? null;
  }

  public async salvar(plano: PlanoInternet): Promise<void> {
    this.items.set(plano.id, plano);
  }

  public async listarTodos(): Promise<PlanoInternet[]> {
    return Array.from(this.items.values());
  }

  public limpar(): void {
    this.items.clear();
  }
}
