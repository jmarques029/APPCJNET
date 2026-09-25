import { OrdemServico } from '../entities/OrdemServico';

export interface IOrdemServicoRepository {
  salvar(os: OrdemServico): Promise<void>;
  buscarPorIdLocal(idLocal: string): Promise<OrdemServico | null>;
  buscarPorIdRemoto(idRemoto: string): Promise<OrdemServico | null>;
  listarPorCliente(clienteId: string): Promise<OrdemServico[]>;
  listarPorTecnico(tecnicoId: string): Promise<OrdemServico[]>;
  listarTodas(): Promise<OrdemServico[]>;
}
