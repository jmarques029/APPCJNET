import { ConcluirAtendimentoUseCase } from '@/application/use-cases/ordens-servico/ConcluirAtendimentoUseCase';
import { FakeOrdemServicoRepository } from '@/infra/fakes/FakeOrdemServicoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { FakeSyncQueueRepository } from '@/infra/fakes/FakeSyncQueueRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { Cliente } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';

describe('ConcluirAtendimentoUseCase (TDD com Fakes)', () => {
  let osRepo: FakeOrdemServicoRepository;
  let clienteRepo: FakeClienteRepository;
  let syncRepo: FakeSyncQueueRepository;
  let useCase: ConcluirAtendimentoUseCase;
  let tecnico: Cliente;
  let clienteComum: Cliente;
  let osEmAtendimento: OrdemServico;

  beforeEach(async () => {
    osRepo = new FakeOrdemServicoRepository();
    clienteRepo = new FakeClienteRepository();
    syncRepo = new FakeSyncQueueRepository();
    useCase = new ConcluirAtendimentoUseCase(osRepo, clienteRepo, syncRepo);

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

    osEmAtendimento = new OrdemServico({
      idLocal: 'os-local-200',
      clienteId: clienteComum.id,
      tecnicoId: tecnico.id,
      tipoProblema: 'SEM_SINAL',
      descricao: 'Fibra atenuada',
      status: 'EM_ATENDIMENTO',
    });
    await osRepo.salvar(osEmAtendimento);
  });

  it('deve concluir atendimento com laudo técnico e foto de reparo', async () => {
    const osConcluida = await useCase.execute({
      idLocal: osEmAtendimento.idLocal,
      tecnicoId: tecnico.id,
      parecerTecnico: 'Feita fusão óptica na CTO 04. Sinal normalizado para -18 dBm.',
      foto: {
        id: 'foto-reparo-1',
        fotoLocalPath: 'file:///data/photos/reparo.jpg',
        tamanhoKb: 512,
      },
    });

    expect(osConcluida.status.value).toBe('CONCLUIDO');
    expect(osConcluida.parecerTecnico).toContain('fusão óptica');
    expect(osConcluida.dataFechamento).toBeDefined();
    expect(osConcluida.fotos.length).toBe(1);
    expect(osConcluida.fotos[0].tipo).toBe('TECNICO_REPARO');

    const pendentes = await syncRepo.obterPendentes();
    expect(pendentes.length).toBe(1);
    expect(pendentes[0].operacao).toBe('UPDATE');
  });

  it('deve lançar erro se o parecer técnico for muito curto (< 5 caracteres)', async () => {
    await expect(
      useCase.execute({
        idLocal: osEmAtendimento.idLocal,
        tecnicoId: tecnico.id,
        parecerTecnico: 'Ok',
      })
    ).rejects.toThrow('Parecer técnico deve conter no mínimo 5 caracteres');
  });

  it('deve lançar ForbiddenError se um cliente tentar concluir atendimento', async () => {
    await expect(
      useCase.execute({
        idLocal: osEmAtendimento.idLocal,
        tecnicoId: clienteComum.id,
        parecerTecnico: 'Feita fusão óptica na CTO 04. Sinal normalizado para -18 dBm.',
      })
    ).rejects.toThrow(ForbiddenError);
  });
});
