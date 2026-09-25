import { IPreCadastroRepository } from '@/domain/repositories/IPreCadastroRepository';
import { IPlanoRepository } from '@/domain/repositories/IPlanoRepository';
import { IAreaCoberturaRepository } from '@/domain/repositories/IAreaCoberturaRepository';
import { ISyncQueueRepository } from '@/domain/repositories/ISyncQueueRepository';
import { PreCadastro } from '@/domain/entities/PreCadastro';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import { ValidacaoCoberturaService } from '@/domain/services/ValidacaoCoberturaService';
import { NotFoundError } from '@/application/errors/ApplicationErrors';

export interface SolicitarPreCadastroInput {
  id?: string;
  planoId: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  enderecoCompleto: string;
  latitude?: number;
  longitude?: number;
}

export class SolicitarPreCadastroUseCase {
  constructor(
    private readonly preCadastroRepository: IPreCadastroRepository,
    private readonly planoRepository: IPlanoRepository,
    private readonly areaRepository: IAreaCoberturaRepository,
    private readonly syncQueueRepository?: ISyncQueueRepository
  ) {}

  public async execute(input: SolicitarPreCadastroInput): Promise<PreCadastro> {
    const plano = await this.planoRepository.buscarPorId(input.planoId);
    if (!plano || !plano.ativo) {
      throw new NotFoundError('Plano de internet selecionado não está disponível.');
    }

    const cpfCnpjVo = new CpfCnpj(input.cpfCnpj);

    let areaCoberturaId: string | undefined;
    let coordenadas: GeoCoordenadas | undefined;

    if (input.latitude !== undefined && input.longitude !== undefined) {
      coordenadas = new GeoCoordenadas(input.latitude, input.longitude);
      const areas = await this.areaRepository.listarTodas();
      const resultado = ValidacaoCoberturaService.verificarPonto(coordenadas, areas);
      if (resultado.coberto && resultado.areaId) {
        areaCoberturaId = resultado.areaId;
      }
    }

    const preCadastro = new PreCadastro({
      id: input.id ?? `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      planoId: plano.id,
      areaCoberturaId,
      nome: input.nome,
      cpfCnpj: cpfCnpjVo,
      telefone: input.telefone,
      enderecoCompleto: input.enderecoCompleto,
      coordenadas,
      status: 'PENDENTE',
      criadoEm: new Date(),
    });

    await this.preCadastroRepository.salvar(preCadastro);

    if (this.syncQueueRepository) {
      await this.syncQueueRepository.enfileirar({
        id: `sync-lead-${preCadastro.id}`,
        entidade: 'clientes',
        operacao: 'INSERT',
        payloadJson: JSON.stringify({
          id: preCadastro.id,
          planoId: preCadastro.planoId,
          nome: preCadastro.nome,
          cpfCnpj: preCadastro.cpfCnpj.valorSemFormatacao,
          telefone: preCadastro.telefone,
          enderecoCompleto: preCadastro.enderecoCompleto,
          areaCoberturaId: preCadastro.areaCoberturaId,
          criadoEm: preCadastro.criadoEm.toISOString(),
        }),
        tentativas: 0,
        status: 'PENDENTE',
        criadoEm: new Date(),
      });
    }

    return preCadastro;
  }
}
