import { AreaCobertura } from '../entities/AreaCobertura';
import { GeoCoordenadas } from '../value-objects/GeoCoordenadas';

export interface ResultadoValidacaoCobertura {
  coberto: boolean;
  zonaAtendida?: string;
  areaId?: string;
  mensagem: string;
}

export class ValidacaoCoberturaService {
  public static verificarPonto(ponto: GeoCoordenadas, areas: AreaCobertura[]): ResultadoValidacaoCobertura {
    for (const area of areas) {
      if (area.ativo && area.contemPonto(ponto)) {
        return {
          coberto: true,
          zonaAtendida: area.nomeZona,
          areaId: area.id,
          mensagem: `Endereço dentro da zona de atendimento: ${area.nomeZona}.`,
        };
      }
    }

    return {
      coberto: false,
      mensagem: 'O endereço informado está fora da área de cobertura de fibra óptica da CJnet no momento.',
    };
  }
}
