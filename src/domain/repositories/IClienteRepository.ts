import { Cliente } from '../entities/Cliente';

export interface IClienteRepository {
  salvar(cliente: Cliente): Promise<void>;
  buscarPorId(id: string): Promise<Cliente | null>;
  buscarPorAuthUserId(authUserId: string): Promise<Cliente | null>;
  buscarPorCpfCnpj(cpfCnpj: string): Promise<Cliente | null>;
}
