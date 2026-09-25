import { IPlanoRepository } from '@/domain/repositories/IPlanoRepository';
import { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { Preco } from '@/domain/value-objects/Preco';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';

export interface SalvarPlanoInput {
  adminUsuarioId: string;
  id?: string;
  nome: string;
  velocidadeMbps: number;
  precoMensal: number;
  beneficios: string[];
  ativo?: boolean;
  destaque?: boolean;
}

export class GerenciarPlanosUseCase {
  constructor(
    private readonly planoRepository: IPlanoRepository,
    private readonly clienteRepository: IClienteRepository
  ) {}

  public async execute(input: SalvarPlanoInput): Promise<PlanoInternet> {
    const admin = await this.clienteRepository.buscarPorId(input.adminUsuarioId);
    if (!admin) {
      throw new NotFoundError('Usuário administrador não encontrado.');
    }

    if (!admin.papel.isAdmin()) {
      throw new ForbiddenError('Apenas administradores podem gerenciar planos comerciais.');
    }

    if (input.id) {
      const planoExistente = await this.planoRepository.buscarPorId(input.id);
      if (!planoExistente) {
        throw new NotFoundError('Plano não encontrado para atualização.');
      }

      planoExistente.atualizarPlano({
        nome: input.nome,
        velocidadeMbps: input.velocidadeMbps,
        precoMensal: Preco.fromReais(input.precoMensal),
        beneficios: input.beneficios,
        destaque: input.destaque,
      });

      if (input.ativo !== undefined) {
        planoExistente.setAtivo(input.ativo);
      }

      await this.planoRepository.salvar(planoExistente);
      return planoExistente;
    }

    const novoPlano = new PlanoInternet({
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nome: input.nome,
      velocidadeMbps: input.velocidadeMbps,
      precoMensal: Preco.fromReais(input.precoMensal),
      beneficios: input.beneficios,
      ativo: input.ativo ?? true,
      destaque: input.destaque ?? false,
    });

    await this.planoRepository.salvar(novoPlano);
    return novoPlano;
  }
}
