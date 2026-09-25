import { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { ISyncQueueRepository } from '@/domain/repositories/ISyncQueueRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { OSFoto } from '@/domain/entities/OSFoto';
import { TipoProblemaType } from '@/domain/value-objects/TipoProblema';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';

export interface AbrirOrdemServicoInput {
  idLocal?: string;
  clienteId: string;
  tipoProblema: TipoProblemaType | string;
  descricao: string;
  latitude?: number;
  longitude?: number;
  foto?: {
    id: string;
    fotoLocalPath: string;
    tamanhoKb: number;
  };
}

export class AbrirOrdemServicoUseCase {
  constructor(
    private readonly osRepository: IOrdemServicoRepository,
    private readonly clienteRepository: IClienteRepository,
    private readonly syncQueueRepository?: ISyncQueueRepository
  ) {}

  public async execute(input: AbrirOrdemServicoInput): Promise<OrdemServico> {
    const cliente = await this.clienteRepository.buscarPorId(input.clienteId);
    if (!cliente) {
      throw new NotFoundError('Cliente solicitante não encontrado.');
    }

    if (cliente.statusContrato === 'CANCELADO') {
      throw new ForbiddenError('Não é possível abrir chamado para contrato cancelado.');
    }

    const idLocal = input.idLocal ?? `os-loc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    let coordenadas: GeoCoordenadas | undefined;
    if (input.latitude !== undefined && input.longitude !== undefined) {
      coordenadas = new GeoCoordenadas(input.latitude, input.longitude);
    }

    const os = new OrdemServico({
      idLocal,
      clienteId: cliente.id,
      tipoProblema: input.tipoProblema as TipoProblemaType,
      descricao: input.descricao,
      coordenadas,
      status: 'PENDENTE',
      createdAt: new Date(),
    });

    if (input.foto) {
      const osFoto = new OSFoto({
        id: input.foto.id,
        osId: os.idLocal,
        fotoLocalPath: input.foto.fotoLocalPath,
        tipo: 'CLIENTE_ROTEADOR',
        tamanhoKb: input.foto.tamanhoKb,
      });
      os.adicionarFoto(osFoto);
    }

    await this.osRepository.salvar(os);

    if (this.syncQueueRepository) {
      await this.syncQueueRepository.enfileirar({
        id: `sync-${idLocal}`,
        entidade: 'ordens_servico',
        operacao: 'INSERT',
        payloadJson: JSON.stringify({
          idLocal: os.idLocal,
          clienteId: os.clienteId,
          tipoProblema: os.tipoProblema.value,
          descricao: os.descricao,
          status: os.status.value,
          latitude: os.coordenadas?.latitude,
          longitude: os.coordenadas?.longitude,
          createdAt: os.createdAt.toISOString(),
        }),
        tentativas: 0,
        status: 'PENDENTE',
        criadoEm: new Date(),
      });
    }

    return os;
  }
}
