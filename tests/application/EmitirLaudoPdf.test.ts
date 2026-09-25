import { EmitirLaudoPdfUseCase } from '@/application/use-cases/ordens-servico/EmitirLaudoPdfUseCase';
import { FakeOrdemServicoRepository } from '@/infra/fakes/FakeOrdemServicoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { Cliente } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { ForbiddenError, NotFoundError } from '@/application/errors/ApplicationErrors';

describe('EmitirLaudoPdfUseCase (TDD com Fakes)', () => {
  let osRepo: FakeOrdemServicoRepository;
  let clienteRepo: FakeClienteRepository;
  let useCase: EmitirLaudoPdfUseCase;
  let cliente: Cliente;
  let outroCliente: Cliente;
  let tecnico: Cliente;
  let osConcluida: OrdemServico;

  beforeEach(async () => {
    osRepo = new FakeOrdemServicoRepository();
    clienteRepo = new FakeClienteRepository();
    useCase = new EmitirLaudoPdfUseCase(osRepo, clienteRepo);

    cliente = new Cliente({
      id: 'cli-10',
      authUserId: 'auth-10',
      nome: 'José Oliveira',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('jose@email.com'),
      telefone: '35999991111',
      papel: 'CLIENTE',
    });
    outroCliente = new Cliente({
      id: 'cli-20',
      authUserId: 'auth-20',
      nome: 'Marcos Souza',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('marcos@email.com'),
      telefone: '35999992222',
      papel: 'CLIENTE',
    });
    tecnico = new Cliente({
      id: 'tec-10',
      authUserId: 'auth-tec-10',
      nome: 'Técnico Roberto',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('roberto@cjnet.com.br'),
      telefone: '35999993333',
      papel: 'TECNICO',
    });

    await clienteRepo.salvar(cliente);
    await clienteRepo.salvar(outroCliente);
    await clienteRepo.salvar(tecnico);

    osConcluida = new OrdemServico({
      idLocal: 'os-pdf-01',
      clienteId: cliente.id,
      tecnicoId: tecnico.id,
      tipoProblema: 'SEM_SINAL',
      descricao: 'Sem sinal óptico',
      status: 'PENDENTE',
    });
    osConcluida.iniciarAtendimento(tecnico.id);
    osConcluida.encerrarAtendimento('Troca de drop óptico e alinhamento de conector APC.');
    await osRepo.salvar(osConcluida);
  });

  it('deve emitir a estrutura do laudo PDF para o cliente titular com sucesso', async () => {
    const laudo = await useCase.execute({
      osIdLocal: osConcluida.idLocal,
      solicitanteId: cliente.id,
    });

    expect(laudo.cabecalho.empresa).toBe('CJnet Provedor de Internet');
    expect(laudo.cabecalho.numeroOS).toContain('os-pdf-01');
    expect(laudo.dadosCliente.nome).toBe('José Oliveira');
    expect(laudo.dadosTecnico?.nome).toBe('Técnico Roberto');
    expect(laudo.dadosChamado.parecerTecnico).toContain('Troca de drop óptico');
  });

  it('deve lançar ForbiddenError se outro cliente tentar emitir laudo da OS alheia', async () => {
    await expect(
      useCase.execute({
        osIdLocal: osConcluida.idLocal,
        solicitanteId: outroCliente.id,
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('deve lançar NotFoundError se a OS não existir', async () => {
    await expect(
      useCase.execute({
        osIdLocal: 'os-inexistente',
        solicitanteId: cliente.id,
      })
    ).rejects.toThrow(NotFoundError);
  });
});
