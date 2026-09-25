import { PlanoInternet } from '../entities/PlanoInternet';

export interface IPlanoRepository {
  listarAtivos(): Promise<PlanoInternet[]>;
  buscarPorId(id: string): Promise<PlanoInternet | null>;
  salvar(plano: PlanoInternet): Promise<void>;
}
