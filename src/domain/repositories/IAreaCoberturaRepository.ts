import { AreaCobertura } from '../entities/AreaCobertura';

export interface IAreaCoberturaRepository {
  listarTodas(): Promise<AreaCobertura[]>;
  buscarPorId(id: string): Promise<AreaCobertura | null>;
  salvar(area: AreaCobertura): Promise<void>;
}
