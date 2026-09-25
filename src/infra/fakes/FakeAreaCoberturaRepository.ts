import { IAreaCoberturaRepository } from '@/domain/repositories/IAreaCoberturaRepository';
import { AreaCobertura } from '@/domain/entities/AreaCobertura';

export class FakeAreaCoberturaRepository implements IAreaCoberturaRepository {
  private readonly items = new Map<string, AreaCobertura>();

  public async listarTodas(): Promise<AreaCobertura[]> {
    return Array.from(this.items.values());
  }

  public async buscarPorId(id: string): Promise<AreaCobertura | null> {
    return this.items.get(id) ?? null;
  }

  public async salvar(area: AreaCobertura): Promise<void> {
    this.items.set(area.id, area);
  }

  public limpar(): void {
    this.items.clear();
  }
}
