import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { ISyncQueueRepository } from '@/domain/repositories/ISyncQueueRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';

export interface IniciarAtendimentoInput {
  idLocal: string;
  tecnicoId: string;
}

export class IniciarAtendimentoUseCase {
  constructor(
    private readonly osRepository: IOrdemServicoRepository,
    private readonly clienteRepository: IClienteRepository,
    private readonly syncQueueRepository?: ISyncQueueRepository
  ) {}

  public async execute(input: IniciarAtendimentoInput): Promise<OrdemServico> {
    const tecnico = await this.clienteRepository.buscarPorId(input.tecnicoId);
    if (!tecnico) {
      throw new NotFoundError('Técnico não encontrado.');
    }

    if (!tecnico.papel.isTecnico() && !tecnico.papel.isAdmin()) {
      throw new ForbiddenError('Apenas técnicos ou administradores podem iniciar atendimentos.');
    }

    const os = await this.osRepository.buscarPorIdLocal(input.idLocal);
    if (!os) {
      throw new NotFoundError('Ordem de serviço não encontrada.');
    }

    os.iniciarAtendimento(tecnico.id);

    await this.osRepository.salvar(os);

    if (this.syncQueueRepository) {
      await this.syncQueueRepository.enfileirar({
        id: `sync-start-${os.idLocal}-${Date.now()}`,
        entidade: 'ordens_servico',
        operacao: 'UPDATE',
        payloadJson: JSON.stringify({
          idLocal: os.idLocal,
          tecnicoId: os.tecnicoId,
          status: os.status.value,
        }),
        tentativas: 0,
        status: 'PENDENTE',
        criadoEm: new Date(),
      });
    }

    return os;
  }
}
