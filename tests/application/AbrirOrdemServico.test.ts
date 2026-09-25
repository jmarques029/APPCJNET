import { AbrirOrdemServicoUseCase } from '@/application/use-cases/ordens-servico/AbrirOrdemServicoUseCase';
import { FakeOrdemServicoRepository } from '@/infra/fakes/FakeOrdemServicoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { FakeSyncQueueRepository } from '@/infra/fakes/FakeSyncQueueRepository';
import { Cliente } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { NotFoundError, ForbiddenError } from '@/application/errors/ApplicationErrors';
import { FileSizeExceededError } from '@/domain/errors/DomainError';

describe('AbrirOrdemServicoUseCase (TDD com Fakes)', () => {
  let osRepo: FakeOrdemServicoRepository;
  let clienteRepo: FakeClienteRepository;
  let syncRepo: FakeSyncQueueRepository;
  let useCase: AbrirOrdemServicoUseCase;
  let clienteValido: Cliente;

  beforeEach(async () => {
    osRepo = new FakeOrdemServicoRepository();
    clienteRepo = new FakeClienteRepository();
    syncRepo = new FakeSyncQueueRepository();
    useCase = new AbrirOrdemServicoUseCase(osRepo, clienteRepo, syncRepo);

    clienteValido = new Cliente({
      id: 'cli-001',
      authUserId: 'auth-001',
      nome: 'João da Silva',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('joao@provedor.com.br'),
      telefone: '35999887766',
      papel: 'CLIENTE',
      statusContrato: 'ATIVO',
    });

    await clienteRepo.salvar(clienteValido);
  });

  it('deve abrir uma ordem de serviço com sucesso (caminho feliz)', async () => {
    const os = await useCase.execute({
      clienteId: clienteValido.id,
      tipoProblema: 'SEM_SINAL',
      descricao: 'Luz vermelha piscando na ONU de fibra óptica.',
      latitude: -21.1895,
      longitude: -45.4382,
    });

    expect(os.idLocal).toBeDefined();
    expect(os.clienteId).toBe('cli-001');
    expect(os.tipoProblema.value).toBe('SEM_SINAL');
    expect(os.status.value).toBe('PENDENTE');
    expect(os.coordenadas?.latitude).toBe(-21.1895);

    // Deve ter persistido no repositório fake
    const osSalva = await osRepo.buscarPorIdLocal(os.idLocal);
    expect(osSalva).not.toBeNull();
    expect(osSalva?.descricao).toBe('Luz vermelha piscando na ONU de fibra óptica.');

    // Deve ter enfileirado no sync_queue fake
    const pendentes = await syncRepo.obterPendentes();
    expect(pendentes.length).toBe(1);
    expect(pendentes[0].entidade).toBe('ordens_servico');
    expect(pendentes[0].operacao).toBe('INSERT');
  });

  it('deve abrir OS anexando foto de até 1024 KB com sucesso', async () => {
    const os = await useCase.execute({
      clienteId: clienteValido.id,
      tipoProblema: 'QUEDA',
      descricao: 'Cabo rompido no poste.',
      foto: {
        id: 'foto-001',
        fotoLocalPath: 'file:///data/user/0/com.cjnet/photos/cabo.jpg',
        tamanhoKb: 850,
      },
    });

    expect(os.fotos.length).toBe(1);
    expect(os.fotos[0].tamanhoKb).toBe(850);
    expect(os.fotos[0].tipo).toBe('CLIENTE_ROTEADOR');
  });

  it('deve lançar FileSizeExceededError se a foto exceder 1024 KB (RNF09)', async () => {
    await expect(
      useCase.execute({
        clienteId: clienteValido.id,
        tipoProblema: 'QUEDA',
        descricao: 'Foto pesada.',
        foto: {
          id: 'foto-002',
          fotoLocalPath: 'file:///photo.jpg',
          tamanhoKb: 1500, // Acima de 1024 KB
        },
      })
    ).rejects.toThrow(FileSizeExceededError);
  });

  it('deve lançar NotFoundError se o cliente não existir', async () => {
    await expect(
      useCase.execute({
        clienteId: 'inexistente',
        tipoProblema: 'LENTIDAO',
        descricao: 'Teste',
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('deve lançar ForbiddenError se o contrato do cliente estiver CANCELADO', async () => {
    const clienteCancelado = new Cliente({
      id: 'cli-cancelado',
      authUserId: 'auth-999',
      nome: 'Cliente Antigo',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('antigo@provedor.com.br'),
      telefone: '35999887766',
      papel: 'CLIENTE',
      statusContrato: 'CANCELADO',
    });
    await clienteRepo.salvar(clienteCancelado);

    await expect(
      useCase.execute({
        clienteId: clienteCancelado.id,
        tipoProblema: 'SEM_SINAL',
        descricao: 'Sem sinal',
      })
    ).rejects.toThrow(ForbiddenError);
  });
});
