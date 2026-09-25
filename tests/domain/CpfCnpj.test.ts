import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';
import { InvalidCpfError } from '@/domain/errors/DomainError';

describe('CpfCnpj Value Object', () => {
  it('deve instanciar um CPF válido e formatar corretamente', () => {
    // CPF de teste válido conhecido (algoritmo padrão)
    const validCpf = '52998224725';
    const vo = CpfCnpj.create(validCpf);

    expect(vo.value).toBe('52998224725');
    expect(vo.isCnpj).toBe(false);
    expect(vo.formatted).toBe('529.982.247-25');
  });

  it('deve aceitar CPF formatado com pontuação', () => {
    const vo = CpfCnpj.create('529.982.247-25');
    expect(vo.value).toBe('52998224725');
    expect(vo.isCnpj).toBe(false);
  });

  it('deve lançar InvalidCpfError para CPF com dígitos verificadores incorretos', () => {
    expect(() => CpfCnpj.create('12345678900')).toThrow(InvalidCpfError);
  });

  it('deve lançar InvalidCpfError para CPF com todos os dígitos iguais', () => {
    expect(() => CpfCnpj.create('11111111111')).toThrow(InvalidCpfError);
  });

  it('deve instanciar um CNPJ válido e formatar corretamente', () => {
    // CNPJ válido de teste (ex: 11.222.333/0001-81)
    const vo = CpfCnpj.create('11222333000181');
    expect(vo.value).toBe('11222333000181');
    expect(vo.isCnpj).toBe(true);
    expect(vo.formatted).toBe('11.222.333/0001-81');
  });

  it('deve lançar InvalidCpfError para entradas inválidas ou vazias', () => {
    expect(() => CpfCnpj.create('')).toThrow(InvalidCpfError);
    expect(() => CpfCnpj.create('123')).toThrow(InvalidCpfError);
  });

  it('deve verificar igualdade de dois Value Objects', () => {
    const vo1 = CpfCnpj.create('52998224725');
    const vo2 = CpfCnpj.create('529.982.247-25');
    expect(vo1.equals(vo2)).toBe(true);
  });
});
