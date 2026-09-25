import { IPreCadastroRepository } from '@/domain/repositories/IPreCadastroRepository';
import { PreCadastro } from '@/domain/entities/PreCadastro';

export class FakePreCadastroRepository implements IPreCadastroRepository {
  private readonly items = new Map<string, PreCadastro>();

  public async salvar(preCadastro: PreCadastro): Promise<void> {
    this.items.set(preCadastro.id, preCadastro);
  }

  public async buscarPorId(id: string): Promise<PreCadastro | null> {
    return this.items.get(id) ?? null;
  }

  public async listarTodos(): Promise<PreCadastro[]> {
    return Array.from(this.items.values());
  }

  public limpar(): void {
    this.items.clear();
  }
}
