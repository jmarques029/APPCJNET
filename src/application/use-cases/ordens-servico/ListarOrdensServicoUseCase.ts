import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { NotFoundError } from '@/application/errors/ApplicationErrors';

export interface ListarOrdensServicoInput {
  usuarioId: string;
}

export class ListarOrdensServicoUseCase {
  constructor(
    private readonly osRepository: IOrdemServicoRepository,
    private readonly clienteRepository: IClienteRepository
  ) {}

  public async execute(input: ListarOrdensServicoInput): Promise<OrdemServico[]> {
    const usuario = await this.clienteRepository.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw new NotFoundError('Usuário não encontrado.');
    }

    if (usuario.papel.isCliente()) {
      return this.osRepository.listarPorCliente(usuario.id);
    }

    if (usuario.papel.isTecnico()) {
      return this.osRepository.listarPorTecnico(usuario.id);
    }

    if (usuario.papel.isAdmin()) {
      return this.osRepository.listarTodas();
    }

    return [];
  }
}
