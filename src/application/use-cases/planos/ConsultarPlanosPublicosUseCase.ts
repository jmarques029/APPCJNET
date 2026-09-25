import { IPlanoRepository } from '@/domain/repositories/IPlanoRepository';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';

export class ConsultarPlanosPublicosUseCase {
  constructor(private readonly planoRepository: IPlanoRepository) {}

  public async execute(): Promise<PlanoInternet[]> {
    return this.planoRepository.listarAtivos();
  }
}
