import { RegraGeracaoPdfService } from '@/domain/services/RegraGeracaoPdfService';
import { ValidacaoCoberturaService } from '@/domain/services/ValidacaoCoberturaService';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { Cliente } from '@/domain/entities/Cliente';
import { AreaCobertura } from '@/domain/entities/AreaCobertura';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';

describe('Domain Services Suite', () => {
  describe('RegraGeracaoPdfService', () => {
    it('deve compor a estrutura documental do laudo de OS em PDF', () => {
      const cliente = new Cliente({
        id: 'c-100',
        authUserId: 'auth-100',
        nome: 'Maria Fernandes',
        cpfCnpj: '52998224725',
        email: 'maria@gmail.com',
        telefone: '35988776655',
      });

      const os = new OrdemServico({
        idLocal: 'loc-100',
        idRemoto: 'd83c21a4-927a-4c28-98e9-44f31c26f0aa',
        clienteId: cliente.id,
        tipoProblema: 'SEM_SINAL',
        descricao: 'Sem conexão de internet',
      });

      os.iniciarAtendimento('tecnico-1');
      os.encerrarAtendimento('Fibra reconectada na CTO.');

      const documento = RegraGeracaoPdfService.comporDocumentoOS(os, cliente);

      expect(documento.cabecalho.empresa).toBe('CJnet Provedor de Internet');
      expect(documento.cabecalho.cidade).toContain('Coqueiral');
      expect(documento.dadosCliente.nome).toBe('Maria Fernandes');
      expect(documento.dadosCliente.documento).toBe('529.982.247-25');
      expect(documento.dadosChamado.parecerTecnico).toBe('Fibra reconectada na CTO.');
      expect(documento.dadosChamado.status).toBe('CONCLUIDO');
    });

    it('deve lançar erro se a OS pertencer a outro cliente', () => {
      const cliente1 = new Cliente({
        id: 'c-1',
        authUserId: 'auth-1',
        nome: 'Cliente Um',
        cpfCnpj: '52998224725',
        email: 'c1@cjnet.com',
        telefone: '35999999999',
      });

      const os = new OrdemServico({
        idLocal: 'loc-2',
        clienteId: 'outro-cliente',
        tipoProblema: 'LENTIDAO',
        descricao: 'Teste',
      });

      expect(() => RegraGeracaoPdfService.comporDocumentoOS(os, cliente1)).toThrow(
        'A Ordem de Serviço não pertence ao cliente informado.'
      );
    });
  });

  describe('ValidacaoCoberturaService', () => {
    it('deve identificar ponto dentro de uma das áreas ativas', () => {
      const areaCentro = new AreaCobertura({
        id: 'z-centro',
        nomeZona: 'Centro',
        vertices: [
          GeoCoordenadas.create(-21.180, -45.450),
          GeoCoordenadas.create(-21.180, -45.430),
          GeoCoordenadas.create(-21.190, -45.430),
          GeoCoordenadas.create(-21.190, -45.450),
        ],
      });

      const ponto = GeoCoordenadas.create(-21.185, -45.440);
      const resultado = ValidacaoCoberturaService.verificarPonto(ponto, [areaCentro]);

      expect(resultado.coberto).toBe(true);
      expect(resultado.zonaAtendida).toBe('Centro');
      expect(resultado.areaId).toBe('z-centro');
    });

    it('deve retornar não coberto quando fora de todas as zonas', () => {
      const areaCentro = new AreaCobertura({
        id: 'z-centro',
        nomeZona: 'Centro',
        vertices: [
          GeoCoordenadas.create(-21.180, -45.450),
          GeoCoordenadas.create(-21.180, -45.430),
          GeoCoordenadas.create(-21.190, -45.430),
          GeoCoordenadas.create(-21.190, -45.450),
        ],
      });

      const pontoFora = GeoCoordenadas.create(-21.300, -45.600);
      const resultado = ValidacaoCoberturaService.verificarPonto(pontoFora, [areaCentro]);

      expect(resultado.coberto).toBe(false);
      expect(resultado.mensagem).toContain('fora da área de cobertura');
    });
  });
});
