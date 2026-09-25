import { PreCadastro } from '../entities/PreCadastro';

export interface IPreCadastroRepository {
  salvar(preCadastro: PreCadastro): Promise<void>;
  buscarPorId(id: string): Promise<PreCadastro | null>;
  listarTodos(): Promise<PreCadastro[]>;
}
