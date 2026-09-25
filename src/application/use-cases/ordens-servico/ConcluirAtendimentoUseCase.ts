import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { ISyncQueueRepository } from '@/domain/repositories/ISyncQueueRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { OSFoto } from '@/domain/entities/OSFoto';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';

export interface ConcluirAtendimentoInput {
  idLocal: string;
  tecnicoId: string;
  parecerTecnico: string;
  foto?: {
    id: string;
    fotoLocalPath: string;
    tamanhoKb: number;
  };
}

export class ConcluirAtendimentoUseCase {
  constructor(
    private readonly osRepository: IOrdemServicoRepository,
    private readonly clienteRepository: IClienteRepository,
    private readonly syncQueueRepository?: ISyncQueueRepository
  ) {}

  public async execute(input: ConcluirAtendimentoInput): Promise<OrdemServico> {
    const tecnico = await this.clienteRepository.buscarPorId(input.tecnicoId);
    if (!tecnico) {
      throw new NotFoundError('Técnico não encontrado.');
    }

    if (!tecnico.papel.isTecnico() && !tecnico.papel.isAdmin()) {
      throw new ForbiddenError('Apenas técnicos ou administradores podem concluir atendimentos.');
    }

    const os = await this.osRepository.buscarPorIdLocal(input.idLocal);
    if (!os) {
      throw new NotFoundError('Ordem de serviço não encontrada.');
    }

    let fotoReparo: OSFoto | undefined;
    if (input.foto) {
      fotoReparo = new OSFoto({
        id: input.foto.id,
        osId: os.idLocal,
        fotoLocalPath: input.foto.fotoLocalPath,
        tipo: 'TECNICO_REPARO',
        tamanhoKb: input.foto.tamanhoKb,
      });
    }

    os.encerrarAtendimento(input.parecerTecnico, fotoReparo);

    await this.osRepository.salvar(os);

    if (this.syncQueueRepository) {
      await this.syncQueueRepository.enfileirar({
        id: `sync-finish-${os.idLocal}-${Date.now()}`,
        entidade: 'ordens_servico',
        operacao: 'UPDATE',
        payloadJson: JSON.stringify({
          idLocal: os.idLocal,
          status: os.status.value,
          parecerTecnico: os.parecerTecnico,
          dataFechamento: os.dataFechamento?.toISOString(),
        }),
        tentativas: 0,
        status: 'PENDENTE',
        criadoEm: new Date(),
      });
    }

    return os;
  }
}
