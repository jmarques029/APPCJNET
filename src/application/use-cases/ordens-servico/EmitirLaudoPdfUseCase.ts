import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { RegraGeracaoPdfService, DocumentoPdfOrdemServico } from '@/domain/services/RegraGeracaoPdfService';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';

export interface EmitirLaudoPdfInput {
  osIdLocal: string;
  solicitanteId: string;
}

export class EmitirLaudoPdfUseCase {
  constructor(
    private readonly osRepository: IOrdemServicoRepository,
    private readonly clienteRepository: IClienteRepository
  ) {}

  public async execute(input: EmitirLaudoPdfInput): Promise<DocumentoPdfOrdemServico> {
    const solicitante = await this.clienteRepository.buscarPorId(input.solicitanteId);
    if (!solicitante) {
      throw new NotFoundError('Usuário solicitante não encontrado.');
    }

    const os = await this.osRepository.buscarPorIdLocal(input.osIdLocal);
    if (!os) {
      throw new NotFoundError('Ordem de serviço não encontrada.');
    }

    if (solicitante.papel.isCliente() && os.clienteId !== solicitante.id) {
      throw new ForbiddenError('Clientes só podem emitir laudos de suas próprias ordens de serviço.');
    }

    const clienteOS = await this.clienteRepository.buscarPorId(os.clienteId);
    if (!clienteOS) {
      throw new NotFoundError('Cliente titular da OS não encontrado.');
    }

    let tecnicoOS = undefined;
    if (os.tecnicoId) {
      tecnicoOS = (await this.clienteRepository.buscarPorId(os.tecnicoId)) ?? undefined;
    }

    return RegraGeracaoPdfService.comporDocumentoOS(os, clienteOS, tecnicoOS);
  }
}
