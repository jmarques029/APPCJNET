import { VerificarCoberturaUseCase } from '@/application/use-cases/cobertura/VerificarCoberturaUseCase';
import { SolicitarPreCadastroUseCase } from '@/application/use-cases/cobertura/SolicitarPreCadastroUseCase';
import { FakeAreaCoberturaRepository } from '@/infra/fakes/FakeAreaCoberturaRepository';
import { FakePlanoRepository } from '@/infra/fakes/FakePlanoRepository';
import { FakePreCadastroRepository } from '@/infra/fakes/FakePreCadastroRepository';
import { FakeSyncQueueRepository } from '@/infra/fakes/FakeSyncQueueRepository';
import { AreaCobertura } from '@/domain/entities/AreaCobertura';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import { Preco } from '@/domain/value-objects/Preco';
import { NotFoundError } from '@/application/errors/ApplicationErrors';

describe('Cobertura e Pré-Cadastro Use Cases (TDD com Fakes)', () => {
  let areaRepo: FakeAreaCoberturaRepository;
  let planoRepo: FakePlanoRepository;
  let preCadastroRepo: FakePreCadastroRepository;
  let syncRepo: FakeSyncQueueRepository;
  let verificarCoberturaUseCase: VerificarCoberturaUseCase;
  let preCadastroUseCase: SolicitarPreCadastroUseCase;
  let zonaCentro: AreaCobertura;
  let planoAtivo: PlanoInternet;

  beforeEach(async () => {
    areaRepo = new FakeAreaCoberturaRepository();
    planoRepo = new FakePlanoRepository();
    preCadastroRepo = new FakePreCadastroRepository();
    syncRepo = new FakeSyncQueueRepository();

    verificarCoberturaUseCase = new VerificarCoberturaUseCase(areaRepo);
    preCadastroUseCase = new SolicitarPreCadastroUseCase(preCadastroRepo, planoRepo, areaRepo, syncRepo);

    // Polígono de Coqueiral - Centro
    zonaCentro = new AreaCobertura({
      id: 'area-centro',
      nomeZona: 'Centro e Bairros Adjacentes',
      vertices: [
        new GeoCoordenadas(-21.1800, -45.4450),
        new GeoCoordenadas(-21.1800, -45.4300),
        new GeoCoordenadas(-21.1950, -45.4300),
        new GeoCoordenadas(-21.1950, -45.4450),
      ],
      ativo: true,
    });
    await areaRepo.salvar(zonaCentro);

    planoAtivo = new PlanoInternet({
      id: 'plano-fibra-400',
      nome: 'Fibra 400 Mega',
      velocidadeMbps: 400,
      precoMensal: new Preco(99.90),
      beneficios: ['Wi-Fi 6'],
      ativo: true,
    });
    await planoRepo.salvar(planoAtivo);
  });

  describe('VerificarCoberturaUseCase', () => {
    it('deve confirmar cobertura quando as coordenadas estiverem dentro do polígono', async () => {
      const resultado = await verificarCoberturaUseCase.execute({
        latitude: -21.1850,
        longitude: -45.4350,
      });

      expect(resultado.coberto).toBe(true);
      expect(resultado.zonaAtendida).toBe('Centro e Bairros Adjacentes');
      expect(resultado.mensagem).toContain('zona de atendimento');
    });

    it('deve indicar indisponibilidade quando as coordenadas estiverem fora do polígono', async () => {
      const resultado = await verificarCoberturaUseCase.execute({
        latitude: -21.2500,
        longitude: -45.5000,
      });

      expect(resultado.coberto).toBe(false);
      expect(resultado.mensagem).toContain('fora da área de cobertura');
    });
  });

  describe('SolicitarPreCadastroUseCase', () => {
    it('deve registrar solicitação de pré-cadastro com sucesso e enfileirar offline', async () => {
      const lead = await preCadastroUseCase.execute({
        planoId: planoAtivo.id,
        nome: 'Lucas Silva Santos',
        cpfCnpj: '52998224725',
        telefone: '35991234567',
        enderecoCompleto: 'Rua Direita, 100, Centro, Coqueiral - MG',
        latitude: -21.1850,
        longitude: -45.4350,
      });

      expect(lead.id).toBeDefined();
      expect(lead.status).toBe('PENDENTE');
      expect(lead.areaCoberturaId).toBe('area-centro');

      const pendentes = await syncRepo.obterPendentes();
      expect(pendentes.length).toBe(1);
      expect(pendentes[0].entidade).toBe('clientes');
    });

    it('deve lançar NotFoundError se o plano de internet solicitado estiver inativo ou inexistente', async () => {
      await expect(
        preCadastroUseCase.execute({
          planoId: 'plano-inexistente',
          nome: 'Lucas Silva Santos',
          cpfCnpj: '52998224725',
          telefone: '35991234567',
          enderecoCompleto: 'Rua Direita, 100, Centro',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
