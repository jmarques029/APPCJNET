export class Preco {
  private readonly _centavos: number;

  constructor(reais: number) {
    if (typeof reais !== 'number' || isNaN(reais) || reais < 0) {
      throw new Error(`Valor de preço inválido: "${reais}". Deve ser um número não negativo.`);
    }
    this._centavos = Math.round(reais * 100);
  }

  public static fromReais(reais: number): Preco {
    return new Preco(reais);
  }

  public static fromCentavos(centavos: number): Preco {
    return new Preco(centavos / 100);
  }

  public get valorReais(): number {
    return this._centavos / 100;
  }

  public get formatado(): string {
    return `R$ ${this.valorReais.toFixed(2).replace('.', ',')}`;
  }
}
