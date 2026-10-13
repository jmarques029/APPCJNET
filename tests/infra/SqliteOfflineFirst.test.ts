import { createMockSQLiteDatabase } from '../mocks/mockSQLite';
import {
  initDatabase,
  SqliteOrdemServicoRepository,
  SqliteClienteRepository,
  SqlitePlanoRepository,
  SqliteAreaCoberturaRepository,
  SqlitePreCadastroRepository,
  SqliteSyncQueueRepository,
  OfflineSyncManager,
} from '@/infra';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { Cliente } from '@/domain/entities/Cliente';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { AreaCobertura } from '@/domain/entities/AreaCobertura';
import { PreCadastro } from '@/domain/entities/PreCadastro';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import { TipoProblema } from '@/domain/value-objects/TipoProblema';

describe('Banco de Dados Local SQLite & Offline-First (Infra)', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockSQLiteDatabase();
  });

  describe('1. Inicialização e Seed do Banco de Dados', () => {
    it('deve executar o schema e popular os dados iniciais quando a base estiver vazia', async () => {
      await initDatabase(mockDb);

      expect(mockDb.userVersion).toBe(1);
      expect(mockDb.tables.clientes.length).toBeGreaterThanOrEqual(4);
      expect(mockDb.tables.planos.length).toBeGreaterThanOrEqual(4);
      expect(mockDb.tables.areas_cobertura.length).toBeGreaterThanOrEqual(2);
      expect(mockDb.tables.ordens_servico.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('2. SqliteOrdemServicoRepository', () => {
    it('deve salvar e buscar Ordem de Serviço localmente pelo idLocal', async () => {
      const repo = new SqliteOrdemServicoRepository(mockDb);

      const novaOs = new OrdemServico({
        idLocal: 'os-local-teste-1',
        clienteId: 'cli-cjnet-01',
        tipoProblema: TipoProblema.SEM_SINAL,
        descricao: 'Fibra rompida na entrada do condomínio',
        coordenadas: new GeoCoordenadas(-21.185, -45.435),
      });

      await repo.salvar(novaOs);

      const encontrada = await repo.buscarPorIdLocal('os-local-teste-1');
      expect(encontrada).not.toBeNull();
      expect(encontrada?.idLocal).toBe('os-local-teste-1');
      expect(encontrada?.clienteId).toBe('cli-cjnet-01');
      expect(encontrada?.descricao).toBe('Fibra rompida na entrada do condomínio');
      expect(encontrada?.coordenadas?.latitude).toBe(-21.185);
      expect(encontrada?.coordenadas?.longitude).toBe(-45.435);
    });

    it('deve listar ordens de serviço filtradas por cliente', async () => {
      const repo = new SqliteOrdemServicoRepository(mockDb);

      const os1 = new OrdemServico({
        idLocal: 'os-c1',
        clienteId: 'cliente-alvo',
        tipoProblema: TipoProblema.LENTIDAO,
        descricao: 'Teste cliente 1',
      });
      const os2 = new OrdemServico({
        idLocal: 'os-c2',
        clienteId: 'outro-cliente',
        tipoProblema: TipoProblema.QUEDA,
        descricao: 'Teste cliente 2',
      });

      await repo.salvar(os1);
      await repo.salvar(os2);

      const lista = await repo.listarPorCliente('cliente-alvo');
      expect(lista.length).toBe(1);
      expect(lista[0].idLocal).toBe('os-c1');
    });
  });

  describe('3. SqliteClienteRepository', () => {
    it('deve salvar e consultar cliente por ID e por authUserId', async () => {
      const repo = new SqliteClienteRepository(mockDb);

      const cliente = new Cliente({
        id: 'cli-sqlite-01',
        authUserId: 'auth-user-sqlite',
        nome: 'João da Silva',
        cpfCnpj: '52998224725',
        email: 'joao.silva@cjnet.com.br',
        telefone: '35999887766',
        papel: 'CLIENTE',
      });

      await repo.salvar(cliente);

      const porId = await repo.buscarPorId('cli-sqlite-01');
      expect(porId).not.toBeNull();
      expect(porId?.nome).toBe('João da Silva');

      const porAuth = await repo.buscarPorAuthUserId('auth-user-sqlite');
      expect(porAuth).not.toBeNull();
      expect(porAuth?.id).toBe('cli-sqlite-01');
    });
  });

  describe('4. SqlitePlanoRepository', () => {
    it('deve listar planos ativos persistidos no SQLite', async () => {
      const repo = new SqlitePlanoRepository(mockDb);

      const plano = new PlanoInternet({
        id: 'plano-fibra-500',
        nome: 'Plano 500 Mega',
        velocidadeMbps: 500,
        precoMensal: 119.9,
        beneficios: ['Wi-Fi 6', 'Instalação Grátis'],
        ativo: true,
      });

      await repo.salvar(plano);

      const ativos = await repo.listarAtivos();
      expect(ativos.length).toBe(1);
      expect(ativos[0].nome).toBe('Plano 500 Mega');
      expect(ativos[0].beneficios).toContain('Wi-Fi 6');
    });
  });

  describe('5. SqliteAreaCoberturaRepository', () => {
    it('deve salvar e verificar polígono de cobertura no SQLite', async () => {
      const repo = new SqliteAreaCoberturaRepository(mockDb);

      const area = new AreaCobertura({
        id: 'area-centro-teste',
        nomeZona: 'Centro Coqueiral',
        vertices: [
          new GeoCoordenadas(-21.18, -45.44),
          new GeoCoordenadas(-21.18, -45.43),
          new GeoCoordenadas(-21.19, -45.43),
        ],
        ativo: true,
      });

      await repo.salvar(area);

      const encontrada = await repo.buscarPorId('area-centro-teste');
      expect(encontrada).not.toBeNull();
      expect(encontrada?.nomeZona).toBe('Centro Coqueiral');
      expect(encontrada?.vertices.length).toBe(3);
    });
  });

  describe('6. SqliteSyncQueueRepository & OfflineSyncManager', () => {
    it('deve gerenciar itens na fila de sincronização e processá-los com sucesso (Offline-First)', async () => {
      const syncRepo = new SqliteSyncQueueRepository(mockDb);
      const osRepo = new SqliteOrdemServicoRepository(mockDb);

      // 1. Criar OS no SQLite local (simulando cliente abrindo OS offline)
      const osLocal = new OrdemServico({
        idLocal: 'os-offline-01',
        clienteId: 'cli-cjnet-01',
        tipoProblema: TipoProblema.SEM_SINAL,
        descricao: 'Sem internet durante tempestade',
      });
      await osRepo.salvar(osLocal);

      // 2. Enfileirar item de sincronização
      await syncRepo.enfileirar({
        id: 'sync-os-offline-01',
        entidade: 'ordens_servico',
        operacao: 'INSERT',
        payloadJson: JSON.stringify({
          idLocal: 'os-offline-01',
          clienteId: 'cli-cjnet-01',
          tipoProblema: 'SEM_SINAL',
          descricao: 'Sem internet durante tempestade',
        }),
        tentativas: 0,
        status: 'PENDENTE',
        criadoEm: new Date(),
      });

      // 3. Verificar que item está pendente
      const pendentesAntes = await syncRepo.obterPendentes();
      expect(pendentesAntes.length).toBe(1);
      expect(pendentesAntes[0].id).toBe('sync-os-offline-01');

      // 4. Executar motor de sincronização OfflineSyncManager
      const syncManager = new OfflineSyncManager(syncRepo, osRepo);
      const resultadoSync = await syncManager.processQueue(true);

      expect(resultadoSync.totalProcessados).toBe(1);
      expect(resultadoSync.sucesso).toBe(1);
      expect(resultadoSync.falhas).toBe(0);

      // 5. Verificar que a fila não tem mais itens pendentes
      const pendentesDepois = await syncRepo.obterPendentes();
      expect(pendentesDepois.length).toBe(0);

      // 6. Verificar que a OS local foi atualizada com idRemoto e syncedAt
      const osAtualizada = await osRepo.buscarPorIdLocal('os-offline-01');
      expect(osAtualizada?.idRemoto).toBeDefined();
      expect(osAtualizada?.idRemoto).toMatch(/^REMOTE-OS-/);
      expect(osAtualizada?.syncedAt).toBeInstanceOf(Date);
    });

    it('não deve sincronizar quando estiver offline', async () => {
      const syncRepo = new SqliteSyncQueueRepository(mockDb);
      const osRepo = new SqliteOrdemServicoRepository(mockDb);
      const syncManager = new OfflineSyncManager(syncRepo, osRepo);

      await syncRepo.enfileirar({
        id: 'sync-item-offline',
        entidade: 'ordens_servico',
        operacao: 'INSERT',
        payloadJson: JSON.stringify({ idLocal: 'os-1' }),
        tentativas: 0,
        status: 'PENDENTE',
        criadoEm: new Date(),
      });

      const resultado = await syncManager.processQueue(false); // isOnline = false
      expect(resultado.totalProcessados).toBe(0);
      expect(resultado.erros).toContain('Dispositivo offline');

      const pendentes = await syncRepo.obterPendentes();
      expect(pendentes.length).toBe(1);
    });
  });
});
