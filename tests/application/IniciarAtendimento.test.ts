import { IniciarAtendimentoUseCase } from '@/application/use-cases/ordens-servico/IniciarAtendimentoUseCase';
import { FakeOrdemServicoRepository } from '@/infra/fakes/FakeOrdemServicoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { FakeSyncQueueRepository } from '@/infra/fakes/FakeSyncQueueRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { Cliente } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';
import { InvalidStatusTransitionError } from '@/domain/errors/DomainError';

describe('IniciarAtendimentoUseCase (TDD com Fakes)', () => {
  let osRepo: FakeOrdemServicoRepository;
  let clienteRepo: FakeClienteRepository;
  let syncRepo: FakeSyncQueueRepository;
  let useCase: IniciarAtendimentoUseCase;
  let tecnico: Cliente;
  let clienteComum: Cliente;
  let osPendente: OrdemServico;

  beforeEach(async () => {
    osRepo = new FakeOrdemServicoRepository();
    clienteRepo = new FakeClienteRepository();
    syncRepo = new FakeSyncQueueRepository();
    useCase = new IniciarAtendimentoUseCase(osRepo, clienteRepo, syncRepo);

    tecnico = new Cliente({
      id: 'tec-001',
      authUserId: 'auth-tec-001',
      nome: 'Carlos Técnico',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('carlos@cjnet.com.br'),
      telefone: '35988887777',
      papel: 'TECNICO',
      statusContrato: 'ATIVO',
    });
    await clienteRepo.salvar(tecnico);

    clienteComum = new Cliente({
      id: 'cli-002',
      authUserId: 'auth-cli-002',
      nome: 'Maria Cliente',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('maria@email.com'),
      telefone: '35977776666',
      papel: 'CLIENTE',
      statusContrato: 'ATIVO',
    });
    await clienteRepo.salvar(clienteComum);

    osPendente = new OrdemServico({
      idLocal: 'os-local-100',
      clienteId: clienteComum.id,
      tipoProblema: 'LENTIDAO',
      descricao: 'Velocidade muito baixa',
      status: 'PENDENTE',
    });
    await osRepo.salvar(osPendente);
  });

  it('deve iniciar atendimento com sucesso pelo técnico (caminho feliz)', async () => {
    const osAtualizada = await useCase.execute({
      idLocal: osPendente.idLocal,
      tecnicoId: tecnico.id,
    });

    expect(osAtualizada.status.value).toBe('EM_ATENDIMENTO');
    expect(osAtualizada.tecnicoId).toBe(tecnico.id);

    const osSalva = await osRepo.buscarPorIdLocal(osPendente.idLocal);
    expect(osSalva?.status.value).toBe('EM_ATENDIMENTO');
    expect(osSalva?.tecnicoId).toBe(tecnico.id);

    const pendentes = await syncRepo.obterPendentes();
    expect(pendentes.length).toBe(1);
    expect(pendentes[0].operacao).toBe('UPDATE');
  });

  it('deve lançar ForbiddenError se um cliente tentar iniciar atendimento da OS', async () => {
    await expect(
      useCase.execute({
        idLocal: osPendente.idLocal,
        tecnicoId: clienteComum.id,
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('deve lançar NotFoundError se a OS não existir', async () => {
    await expect(
      useCase.execute({
        idLocal: 'os-fantasma',
        tecnicoId: tecnico.id,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('deve lançar InvalidStatusTransitionError se tentar iniciar uma OS já concluída', async () => {
    osPendente.iniciarAtendimento(tecnico.id);
    osPendente.encerrarAtendimento('Problema resolvido com troca de conector.');
    await osRepo.salvar(osPendente);

    await expect(
      useCase.execute({
        idLocal: osPendente.idLocal,
        tecnicoId: tecnico.id,
      })
    ).rejects.toThrow(InvalidStatusTransitionError);
  });
});
