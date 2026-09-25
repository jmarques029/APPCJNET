import { IAreaCoberturaRepository } from '@/domain/repositories/IAreaCoberturaRepository';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import { ValidacaoCoberturaService, ResultadoValidacaoCobertura } from '@/domain/services/ValidacaoCoberturaService';

export interface VerificarCoberturaInput {
  latitude: number;
  longitude: number;
}

export class VerificarCoberturaUseCase {
  constructor(private readonly areaRepository: IAreaCoberturaRepository) {}

  public async execute(input: VerificarCoberturaInput): Promise<ResultadoValidacaoCobertura> {
    const coordenadas = new GeoCoordenadas(input.latitude, input.longitude);
    const areas = await this.areaRepository.listarTodas();

    return ValidacaoCoberturaService.verificarPonto(coordenadas, areas);
  }
}
