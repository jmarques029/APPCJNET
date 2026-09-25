import { Email } from '@/domain/value-objects/Email';
import { StatusOS } from '@/domain/value-objects/StatusOS';
import { TipoProblema } from '@/domain/value-objects/TipoProblema';
import { PapelUsuario } from '@/domain/value-objects/PapelUsuario';
import { GeoCoordenadas } from '@/domain/value-objects/GeoCoordenadas';
import { Preco } from '@/domain/value-objects/Preco';
import { InvalidEmailError, InvalidStatusTransitionError, InvalidCoordinateError } from '@/domain/errors/DomainError';

describe('Value Objects Suite', () => {
  describe('Email', () => {
    it('deve aceitar e formatar e-mails válidos', () => {
      const email = Email.create('  Usuario@CJNET.com.br ');
      expect(email.value).toBe('usuario@cjnet.com.br');
    });

    it('deve rejeitar e-mails sem @ ou domínio', () => {
      expect(() => Email.create('invalido')).toThrow(InvalidEmailError);
      expect(() => Email.create('invalido@')).toThrow(InvalidEmailError);
      expect(() => Email.create('')).toThrow(InvalidEmailError);
    });
  });

  describe('StatusOS', () => {
    it('deve permitir transição válida de PENDENTE para EM_ATENDIMENTO', () => {
      const status = StatusOS.create('PENDENTE');
      const next = status.transitionTo('EM_ATENDIMENTO');
      expect(next.value).toBe('EM_ATENDIMENTO');
    });

    it('deve rejeitar transição inválida de CONCLUIDO para PENDENTE', () => {
      const status = StatusOS.create('CONCLUIDO');
      expect(() => status.transitionTo('PENDENTE')).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('TipoProblema', () => {
    it('deve instanciar tipos válidos e retornar rótulo legível', () => {
      const tipo = TipoProblema.create('SEM_SINAL');
      expect(tipo.value).toBe('SEM_SINAL');
      expect(tipo.label).toContain('Sem Sinal');
    });
  });

  describe('PapelUsuario', () => {
    it('deve validar papéis de usuário corretamente', () => {
      const cliente = PapelUsuario.create('CLIENTE');
      expect(cliente.isCliente()).toBe(true);
      expect(cliente.isTecnico()).toBe(false);

      const admin = PapelUsuario.create('ADMIN');
      expect(admin.isAdmin()).toBe(true);
    });
  });

  describe('GeoCoordenadas', () => {
    it('deve criar coordenadas válidas e calcular distância', () => {
      // Coqueiral/MG approx: lat -21.185, lng -45.441
      const p1 = GeoCoordenadas.create(-21.185, -45.441);
      const p2 = GeoCoordenadas.create(-21.186, -45.442);
      const distancia = p1.calcularDistanciaMetros(p2);

      expect(distancia).toBeGreaterThan(0);
      expect(distancia).toBeLessThan(1000);
    });

    it('deve lançar erro para latitudes fora da faixa [-90, 90]', () => {
      expect(() => GeoCoordenadas.create(100, 0)).toThrow(InvalidCoordinateError);
    });
  });

  describe('Preco', () => {
    it('deve formatar valor em reais corretamente', () => {
      const preco = Preco.fromReais(99.9);
      expect(preco.valorReais).toBe(99.9);
      expect(preco.formatado).toBe('R$ 99,90');
    });
  });
});
