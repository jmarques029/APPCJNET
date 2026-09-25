export type TipoProblemaType = 'SEM_SINAL' | 'LENTIDAO' | 'QUEDA' | 'MUDANCA_ENDERECO' | 'OUTROS';

export class TipoProblema {
  public static readonly SEM_SINAL: TipoProblemaType = 'SEM_SINAL';
  public static readonly LENTIDAO: TipoProblemaType = 'LENTIDAO';
  public static readonly QUEDA: TipoProblemaType = 'QUEDA';
  public static readonly MUDANCA_ENDERECO: TipoProblemaType = 'MUDANCA_ENDERECO';
  public static readonly OUTROS: TipoProblemaType = 'OUTROS';

  private readonly _value: TipoProblemaType;

  private constructor(value: TipoProblemaType) {
    this._value = value;
  }

  public static create(raw: string): TipoProblema {
    const upper = raw?.toUpperCase() as TipoProblemaType;
    const valid: TipoProblemaType[] = ['SEM_SINAL', 'LENTIDAO', 'QUEDA', 'MUDANCA_ENDERECO', 'OUTROS'];
    if (!valid.includes(upper)) {
      throw new Error(`Tipo de problema inválido: "${raw}"`);
    }
    return new TipoProblema(upper);
  }

  public get value(): TipoProblemaType {
    return this._value;
  }

  public get label(): string {
    switch (this._value) {
      case 'SEM_SINAL': return 'Sem Sinal / Luz Vermelha (LOS)';
      case 'LENTIDAO': return 'Lentidão na Conexão';
      case 'QUEDA': return 'Quedas Frequentes';
      case 'MUDANCA_ENDERECO': return 'Mudança de Endereço';
      case 'OUTROS': return 'Outros Assuntos';
    }
  }
}
