import { ListarOrdensServicoUseCase } from '@/application/use-cases/ordens-servico/ListarOrdensServicoUseCase';
import { FakeOrdemServicoRepository } from '@/infra/fakes/FakeOrdemServicoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { Cliente } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { NotFoundError } from '@/application/errors/ApplicationErrors';

describe('ListarOrdensServicoUseCase (TDD com Fakes)', () => {
  let osRepo: FakeOrdemServicoRepository;
  let clienteRepo: FakeClienteRepository;
  let useCase: ListarOrdensServicoUseCase;
  let cliente1: Cliente;
  let cliente2: Cliente;
  let tecnico: Cliente;
  let admin: Cliente;

  beforeEach(async () => {
    osRepo = new FakeOrdemServicoRepository();
    clienteRepo = new FakeClienteRepository();
    useCase = new ListarOrdensServicoUseCase(osRepo, clienteRepo);

    cliente1 = new Cliente({
      id: 'cli-1',
      authUserId: 'auth-1',
      nome: 'Cliente 1',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('c1@cjnet.com.br'),
      telefone: '35999990001',
      papel: 'CLIENTE',
    });
    cliente2 = new Cliente({
      id: 'cli-2',
      authUserId: 'auth-2',
      nome: 'Cliente 2',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('c2@cjnet.com.br'),
      telefone: '35999990002',
      papel: 'CLIENTE',
    });
    tecnico = new Cliente({
      id: 'tec-1',
      authUserId: 'auth-tec',
      nome: 'Técnico 1',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('tec@cjnet.com.br'),
      telefone: '35999990003',
      papel: 'TECNICO',
    });
    admin = new Cliente({
      id: 'adm-1',
      authUserId: 'auth-adm',
      nome: 'Admin Master',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('admin@cjnet.com.br'),
      telefone: '35999990004',
      papel: 'ADMIN',
    });

    await clienteRepo.salvar(cliente1);
    await clienteRepo.salvar(cliente2);
    await clienteRepo.salvar(tecnico);
    await clienteRepo.salvar(admin);

    await osRepo.salvar(new OrdemServico({
      idLocal: 'os-1',
      clienteId: cliente1.id,
      tecnicoId: tecnico.id,
      tipoProblema: 'SEM_SINAL',
      descricao: 'OS 1 do cliente 1 atribuida ao tecnico 1',
    }));

    await osRepo.salvar(new OrdemServico({
      idLocal: 'os-2',
      clienteId: cliente1.id,
      tipoProblema: 'LENTIDAO',
      descricao: 'OS 2 do cliente 1 sem tecnico',
    }));

    await osRepo.salvar(new OrdemServico({
      idLocal: 'os-3',
      clienteId: cliente2.id,
      tipoProblema: 'QUEDA',
      descricao: 'OS do cliente 2',
    }));
  });

  it('deve listar apenas as ordens do próprio cliente quando o usuário for CLIENTE', async () => {
    const lista = await useCase.execute({ usuarioId: cliente1.id });
    expect(lista.length).toBe(2);
    expect(lista.every((os) => os.clienteId === cliente1.id)).toBe(true);
  });

  it('deve listar as ordens atribuídas ao técnico quando o usuário for TECNICO', async () => {
    const lista = await useCase.execute({ usuarioId: tecnico.id });
    expect(lista.length).toBe(1);
    expect(lista[0].idLocal).toBe('os-1');
  });

  it('deve listar todas as ordens quando o usuário for ADMIN', async () => {
    const lista = await useCase.execute({ usuarioId: admin.id });
    expect(lista.length).toBe(3);
  });

  it('deve lançar NotFoundError se o usuário não for encontrado', async () => {
    await expect(
      useCase.execute({ usuarioId: 'inexistente' })
    ).rejects.toThrow(NotFoundError);
  });
});
