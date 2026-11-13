import { createMockSQLiteDatabase } from '../mocks/mockSQLite';
import {
  SupabaseClient,
  SupabaseSyncGateway,
  OfflineSyncManager,
  SqliteSyncQueueRepository,
  SqliteOrdemServicoRepository,
  isSupabaseConfigured,
} from '@/infra';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { TipoProblema } from '@/domain/value-objects/TipoProblema';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';

describe('Integração Supabase (SupabaseClient & SupabaseSyncGateway)', () => {
  describe('1. Validação de Configuração (isSupabaseConfigured)', () => {
    it('deve retornar false quando URL ou AnonKey estiverem vazios ou com placeholders', () => {
      expect(isSupabaseConfigured({ url: '', anonKey: '', storageBucket: 'os-evidencias' })).toBe(
        false
      );
      expect(
        isSupabaseConfigured({
          url: 'https://SEU_PROJETO.supabase.co',
          anonKey: 'SUA_CHAVE_ANON_PUBLIC',
          storageBucket: 'os-evidencias',
        })
      ).toBe(false);
    });

    it('deve retornar true quando URL e AnonKey reais forem informados', () => {
      expect(
        isSupabaseConfigured({
          url: 'https://xyzcompany.supabase.co',
          anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.realkey',
          storageBucket: 'os-evidencias',
        })
      ).toBe(true);
    });
  });

  describe('2. SupabaseSyncGateway conectado ao Supabase PostgREST', () => {
    it('deve realizar UPSERT de Ordem de Serviço no endpoint /rest/v1/ordens_servico', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => [
          {
            id: 'uuid-remoto-supabase-999',
            id_local: 'OS-SUPA-01',
            synced_at: '2026-11-13T17:20:00.000Z',
          },
        ],
      }) as unknown as typeof fetch;

      const client = new SupabaseClient(
        {
          url: 'https://ecofield.supabase.co',
          anonKey: 'anon-key-ecofield-123',
          storageBucket: 'os-evidencias',
        },
        mockFetch
      );

      const gateway = new SupabaseSyncGateway(client);
      const mockDb = createMockSQLiteDatabase();
      const syncRepo = new SqliteSyncQueueRepository(mockDb);
      const osRepo = new SqliteOrdemServicoRepository(mockDb);

      const osLocal = new OrdemServico({
        idLocal: 'OS-SUPA-01',
        clienteId: 'cli-cjnet-01',
        tipoProblema: TipoProblema.SEM_SINAL,
        descricao: 'Rompimento de fibra na rua principal',
        coordenadas: new GeoCoordenadas(-21.184, -45.441),
      });
      await osRepo.salvar(osLocal);

      await syncRepo.enfileirar({
        id: 'sync-supa-01',
        entidade: 'ordens_servico',
        operacao: 'INSERT',
        payloadJson: JSON.stringify({ idLocal: 'OS-SUPA-01' }),
        tentativas: 0,
        status: 'PENDENTE',
        criadoEm: new Date(),
      });

      const syncManager = new OfflineSyncManager(syncRepo, osRepo, gateway);
      const result = await syncManager.processQueue(true);

      expect(result.sucesso).toBe(1);
      expect(result.falhas).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [calledUrl, calledInit] = (mockFetch as jest.Mock).mock.calls[0];
      expect(calledUrl).toBe(
        'https://ecofield.supabase.co/rest/v1/ordens_servico?on_conflict=id_local'
      );
      expect(calledInit.method).toBe('POST');
      expect(calledInit.headers.apikey).toBe('anon-key-ecofield-123');

      const osSincronizada = await osRepo.buscarPorIdLocal('OS-SUPA-01');
      expect(osSincronizada?.idRemoto).toBe('uuid-remoto-supabase-999');
    });

    it('deve fazer upload da imagem para o bucket os-evidencias e registrar em os_fotos quando a OS possuir foto anexada', async () => {
      const mockFetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/storage/v1/object/')) {
          return {
            ok: true,
            status: 200,
            text: async () => '{"Key":"os-evidencias/OS-FOTO-01/foto-1.png"}',
          };
        }
        return {
          ok: true,
          status: 201,
          json: async () => [
            {
              id: 'uuid-os-com-foto-123',
              id_local: 'OS-FOTO-01',
              synced_at: '2026-11-13T17:40:00.000Z',
            },
          ],
        };
      }) as unknown as typeof fetch;

      const client = new SupabaseClient(
        {
          url: 'https://ecofield.supabase.co',
          anonKey: 'anon-key-ecofield-123',
          storageBucket: 'os-evidencias',
        },
        mockFetch
      );

      const gateway = new SupabaseSyncGateway(client);
      const res = await gateway.enviarOrdemServico({
        idLocal: 'OS-FOTO-01',
        clienteId: 'cli-cjnet-01',
        tipoProblema: 'SEM_SINAL',
        descricao: 'ONU com luz PON vermelha',
        fotos: [
          {
            id: 'foto-1',
            osId: 'OS-FOTO-01',
            fotoLocalPath: 'file:///storage/emulated/0/cjnet/onu.jpg',
            tipo: 'ABERTURA',
            tamanhoKb: 420,
          },
        ],
      });

      expect(res.idRemoto).toBe('uuid-os-com-foto-123');
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 Storage Upload + 1 ordens_servico + 1 os_fotos

      const urlsChamadas = (mockFetch as jest.Mock).mock.calls.map((c) => c[0]);
      expect(urlsChamadas[0]).toBe(
        'https://ecofield.supabase.co/storage/v1/object/os-evidencias/OS-FOTO-01/foto-1.png'
      );
      expect(urlsChamadas[1]).toBe(
        'https://ecofield.supabase.co/rest/v1/ordens_servico?on_conflict=id_local'
      );
      expect(urlsChamadas[2]).toBe(
        'https://ecofield.supabase.co/rest/v1/os_fotos?on_conflict=id'
      );
    });

    it('deve operar em fallback local quando o .env ainda não estiver configurado', async () => {
      const unconfiguredClient = new SupabaseClient({
        url: '',
        anonKey: '',
      });
      const gateway = new SupabaseSyncGateway(unconfiguredClient);

      const res = await gateway.enviarOrdemServico({
        idLocal: 'OS-LOCAL-FALLBACK',
        clienteId: 'cli-cjnet-01',
        tipoProblema: 'LENTIDAO',
        descricao: 'Teste sem .env preenchido',
      });

      expect(res.idRemoto).toMatch(/^REMOTE-OS-/);
      expect(res.syncedAt).toBeInstanceOf(Date);
    });
  });
});

