export interface SyncQueueItemData {
  id: string;
  entidade: 'ordens_servico' | 'clientes' | 'fotos';
  operacao: 'INSERT' | 'UPDATE';
  payloadJson: string;
  tentativas: number;
  status: 'PENDENTE' | 'PROCESSANDO' | 'ERRO' | 'CONCLUIDO';
  criadoEm: Date;
}

export interface ISyncQueueRepository {
  enfileirar(item: SyncQueueItemData): Promise<void>;
  obterPendentes(): Promise<SyncQueueItemData[]>;
  marcarConcluido(id: string): Promise<void>;
  incrementarTentativa(id: string, erro?: string): Promise<void>;
}
