import { ISyncQueueRepository, SyncQueueItemData } from '@/domain/repositories/ISyncQueueRepository';

export class FakeSyncQueueRepository implements ISyncQueueRepository {
  private readonly items = new Map<string, SyncQueueItemData>();

  public async enfileirar(item: SyncQueueItemData): Promise<void> {
    this.items.set(item.id, { ...item });
  }

  public async obterPendentes(): Promise<SyncQueueItemData[]> {
    return Array.from(this.items.values()).filter((item) => item.status === 'PENDENTE');
  }

  public async marcarConcluido(id: string): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      item.status = 'CONCLUIDO';
      this.items.set(id, item);
    }
  }

  public async incrementarTentativa(id: string, _erro?: string): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      item.tentativas += 1;
      item.status = item.tentativas >= 5 ? 'ERRO' : 'PENDENTE';
      this.items.set(id, item);
    }
  }

  public async listarTodos(): Promise<SyncQueueItemData[]> {
    return Array.from(this.items.values());
  }

  public limpar(): void {
    this.items.clear();
  }
}
