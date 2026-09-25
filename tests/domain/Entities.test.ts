import { Cliente } from '@/domain/entities/Cliente';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { OSFoto } from '@/domain/entities/OSFoto';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { AreaCobertura } from '@/domain/entities/AreaCobertura';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import { FileSizeExceededError } from '@/domain/errors/DomainError';

describe('Domain Entities & Aggregates Suite', () => {
  describe('OSFoto Entity', () => {
    it('deve instanciar uma foto válida com tamanho <= 1024 KB', () => {
      const foto = new OSFoto({
        id: 'foto-1',
        osId: 'os-local-1',
        fotoLocalPath: 'file:///data/img1.jpg',
        tipo: 'CLIENTE_ROTEADOR',
        tamanhoKb: 850,
      });

      expect(foto.id).toBe('foto-1');
      expect(foto.tamanhoKb).toBe(850);
      expect(foto.enviada).toBe(false);
    });

    it('deve lançar FileSizeExceededError quando a imagem exceder 1024 KB (RNF09)', () => {
      expect(() => {
        new OSFoto({
          id: 'foto-2',
          osId: 'os-local-1',
          fotoLocalPath: 'file:///data/img2.jpg',
          tipo: 'CLIENTE_ROTEADOR',
          tamanhoKb: 1500, // > 1024
        });
      }).toThrow(FileSizeExceededError);
    });

    it('deve marcar foto como enviada ao receber URL remota', () => {
      const foto = new OSFoto({
        id: 'foto-3',
        osId: 'os-local-1',
        fotoLocalPath: 'file:///data/img3.jpg',
        tipo: 'CLIENTE_ROTEADOR',
        tamanhoKb: 500,
      });

      foto.marcarComoEnviada('https://supabase.co/storage/v1/object/public/os-fotos/img3.jpg');
      expect(foto.enviada).toBe(true);
      expect(foto.fotoRemotaUrl).toContain('supabase.co');
    });
  });

  describe('OrdemServico Aggregate Root', () => {
    it('deve criar uma OS com status PENDENTE e adicionar fotos', () => {
      const os = new OrdemServico({
        idLocal: 'uuid-local-123',
        clienteId: 'cliente-1',
        tipoProblema: 'SEM_SINAL',
        descricao: 'Luz vermelha piscando na ONU',
      });

      expect(os.idLocal).toBe('uuid-local-123');
      expect(os.status.value).toBe('PENDENTE');
      expect(os.fotos.length).toBe(0);

      const foto = new OSFoto({
        id: 'f1',
        osId: os.idLocal,
        fotoLocalPath: 'file:///onu.jpg',
        tipo: 'CLIENTE_ROTEADOR',
        tamanhoKb: 400,
      });

      os.adicionarFoto(foto);
      expect(os.fotos.length).toBe(1);
    });

    it('deve permitir que o técnico inicie o atendimento e conclua com parecer', () => {
      const os = new OrdemServico({
        idLocal: 'uuid-local-456',
        clienteId: 'cliente-1',
        tipoProblema: 'LENTIDAO',
        descricao: 'Velocidade abaixo do contratado',
      });

      os.iniciarAtendimento('tecnico-joao');
      expect(os.status.value).toBe('EM_ATENDIMENTO');
      expect(os.tecnicoId).toBe('tecnico-joao');

      const fotoReparo = new OSFoto({
        id: 'f-rep',
        osId: os.idLocal,
        fotoLocalPath: 'file:///reparo.jpg',
        tipo: 'TECNICO_REPARO',
        tamanhoKb: 600,
      });

      os.encerrarAtendimento('Conector de fibra reconectorizado e sinal estabilizado em -19dBm.', fotoReparo);
      expect(os.status.value).toBe('CONCLUIDO');
      expect(os.parecerTecnico).toContain('Conector de fibra');
      expect(os.fotos.length).toBe(1);
      expect(os.dataFechamento).toBeInstanceOf(Date);
    });
  });

  describe('Cliente Entity', () => {
    it('deve instanciar cliente com CPF, Email e PapelUsuario validados', () => {
      const cliente = new Cliente({
        id: 'c1',
        authUserId: 'auth-uid-1',
        nome: 'Carlos da Silva',
        cpfCnpj: '52998224725',
        email: 'carlos@cjnet.com.br',
        telefone: '35999887766',
        papel: 'CLIENTE',
      });

      expect(cliente.nome).toBe('Carlos da Silva');
      expect(cliente.cpfCnpj.formatted).toBe('529.982.247-25');
      expect(cliente.email.value).toBe('carlos@cjnet.com.br');
      expect(cliente.papel.isCliente()).toBe(true);
    });
  });

  describe('PlanoInternet Entity', () => {
    it('deve instanciar plano com preço e velocidade', () => {
      const plano = new PlanoInternet({
        id: 'p1',
        nome: 'Fibra Turbo 400 Mega',
        velocidadeMbps: 400,
        precoMensal: 99.9,
        beneficios: ['Wi-Fi 6', 'Suporte Prioritário'],
      });

      expect(plano.labelVelocidade).toBe('400 Mega');
      expect(plano.precoMensal.formatado).toBe('R$ 99,90');
      expect(plano.beneficios.length).toBe(2);
    });
  });

  describe('AreaCobertura Entity', () => {
    it('deve instanciar e verificar se coordenadas estão no polígono de Coqueiral', () => {
      // Quadrilátero delimitando o centro de Coqueiral
      const vertices = [
        GeoCoordenadas.create(-21.180, -45.450),
        GeoCoordenadas.create(-21.180, -45.430),
        GeoCoordenadas.create(-21.190, -45.430),
        GeoCoordenadas.create(-21.190, -45.450),
      ];

      const area = new AreaCobertura({
        id: 'zona-centro',
        nomeZona: 'Centro - Coqueiral/MG',
        vertices,
      });

      const pontoDentro = GeoCoordenadas.create(-21.185, -45.440);
      const pontoFora = GeoCoordenadas.create(-21.200, -45.500);

      expect(area.contemPonto(pontoDentro)).toBe(true);
      expect(area.contemPonto(pontoFora)).toBe(false);
    });
  });
});
