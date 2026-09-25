import { InvalidCpfError } from '../errors/DomainError';

export class CpfCnpj {
  private readonly _value: string;
  private readonly _isCnpj: boolean;

  constructor(raw: string) {
    if (!raw) {
      throw new InvalidCpfError(raw);
    }

    const cleaned = raw.replace(/\D/g, '');

    if (cleaned.length === 11) {
      if (!CpfCnpj.validarCpf(cleaned)) {
        throw new InvalidCpfError(raw);
      }
      this._value = cleaned;
      this._isCnpj = false;
    } else if (cleaned.length === 14) {
      if (!CpfCnpj.validarCnpj(cleaned)) {
        throw new InvalidCpfError(raw);
      }
      this._value = cleaned;
      this._isCnpj = true;
    } else {
      throw new InvalidCpfError(raw);
    }
  }

  public static create(raw: string): CpfCnpj {
    return new CpfCnpj(raw);
  }

  public get value(): string {
    return this._value;
  }

  public get valorSemFormatacao(): string {
    return this._value;
  }

  public get isCnpj(): boolean {
    return this._isCnpj;
  }

  public get formatted(): string {
    if (this._isCnpj) {
      return this._value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return this._value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  public equals(other: CpfCnpj): boolean {
    return this._value === other._value;
  }

  private static validarCpf(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i), 10) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9), 10)) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i), 10) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10), 10)) return false;

    return true;
  }

  private static validarCnpj(cnpj: string): boolean {
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1), 10)) return false;

    return true;
  }
}
