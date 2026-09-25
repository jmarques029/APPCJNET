import { ConsultarPlanosPublicosUseCase } from '@/application/use-cases/planos/ConsultarPlanosPublicosUseCase';
import { GerenciarPlanosUseCase } from '@/application/use-cases/planos/GerenciarPlanosUseCase';
import { FakePlanoRepository } from '@/infra/fakes/FakePlanoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { Cliente } from '@/domain/entities/Cliente';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { Email } from '@/domain/value-objects/Email';
import { Preco } from '@/domain/value-objects/Preco';
import { ForbiddenError } from '@/application/errors/ApplicationErrors';

describe('Planos Use Cases (TDD com Fakes)', () => {
  let planoRepo: FakePlanoRepository;
  let clienteRepo: FakeClienteRepository;
  let consultarUseCase: ConsultarPlanosPublicosUseCase;
  let gerenciarUseCase: GerenciarPlanosUseCase;
  let admin: Cliente;
  let clienteNormal: Cliente;

  beforeEach(async () => {
    planoRepo = new FakePlanoRepository();
    clienteRepo = new FakeClienteRepository();
    consultarUseCase = new ConsultarPlanosPublicosUseCase(planoRepo);
    gerenciarUseCase = new GerenciarPlanosUseCase(planoRepo, clienteRepo);

    admin = new Cliente({
      id: 'adm-01',
      authUserId: 'auth-adm-01',
      nome: 'Administrador Provedor',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('admin@cjnet.com.br'),
      telefone: '35999990000',
      papel: 'ADMIN',
    });

    clienteNormal = new Cliente({
      id: 'cli-01',
      authUserId: 'auth-cli-01',
      nome: 'Cliente Normal',
      cpfCnpj: new CpfCnpj('52998224725'),
      email: new Email('cliente@cjnet.com.br'),
      telefone: '35999990000',
      papel: 'CLIENTE',
    });

    await clienteRepo.salvar(admin);
    await clienteRepo.salvar(clienteNormal);

    await planoRepo.salvar(new PlanoInternet({
      id: 'plano-1',
      nome: 'Fibra 200 Mega',
      velocidadeMbps: 200,
      precoMensal: Preco.fromReais(89.90),
      beneficios: ['Wi-Fi 5', 'Suporte Local'],
      ativo: true,
    }));

    await planoRepo.salvar(new PlanoInternet({
      id: 'plano-inativo',
      nome: 'Plano Antigo 50 Mega',
      velocidadeMbps: 50,
      precoMensal: Preco.fromReais(59.90),
      beneficios: ['Roteador Básico'],
      ativo: false,
    }));
  });

  describe('ConsultarPlanosPublicosUseCase', () => {
    it('deve listar apenas planos comerciais ativos na vitrine', async () => {
      const planos = await consultarUseCase.execute();
      expect(planos.length).toBe(1);
      expect(planos[0].nome).toBe('Fibra 200 Mega');
      expect(planos[0].ativo).toBe(true);
    });
  });

  describe('GerenciarPlanosUseCase', () => {
    it('deve permitir ao admin criar um novo plano com sucesso', async () => {
      const novoPlano = await gerenciarUseCase.execute({
        adminUsuarioId: admin.id,
        nome: 'Fibra Turbo 600 Mega',
        velocidadeMbps: 600,
        precoMensal: 129.90,
        beneficios: ['Wi-Fi 6 Gamer', 'IP Dedicado', 'Suporte VIP'],
        destaque: true,
      });

      expect(novoPlano.id).toBeDefined();
      expect(novoPlano.nome).toBe('Fibra Turbo 600 Mega');
      expect(novoPlano.destaque).toBe(true);

      const todos = await planoRepo.listarTodos();
      expect(todos.length).toBe(3);
    });

    it('deve permitir ao admin atualizar um plano existente', async () => {
      const planoAtualizado = await gerenciarUseCase.execute({
        adminUsuarioId: admin.id,
        id: 'plano-1',
        nome: 'Fibra 300 Mega Turbo',
        velocidadeMbps: 300,
        precoMensal: 99.90,
        beneficios: ['Wi-Fi 6', 'Suporte Local 24h'],
      });

      expect(planoAtualizado.nome).toBe('Fibra 300 Mega Turbo');
      expect(planoAtualizado.velocidadeMbps).toBe(300);
      expect(planoAtualizado.precoMensal.valorReais).toBe(99.90);
      expect(planoAtualizado.precoMensal.formatado).toBe('R$ 99,90');
    });

    it('deve lançar ForbiddenError se um usuário não admin tentar gerenciar planos', async () => {
      await expect(
        gerenciarUseCase.execute({
          adminUsuarioId: clienteNormal.id,
          nome: 'Tentativa Hacker',
          velocidadeMbps: 1000,
          precoMensal: 10.0,
          beneficios: [],
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
