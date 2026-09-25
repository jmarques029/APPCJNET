export class Preco {
  private readonly _centavos: number;

  private constructor(centavos: number) {
    this._centavos = centavos;
  }

  public static fromReais(reais: number): Preco {
    if (typeof reais !== 'number' || isNaN(reais) || reais < 0) {
      throw new Error(`Valor de preço inválido: "${reais}". Deve ser um número não negativo.`);
    }
    const centavos = Math.round(reais * 100);
    return new Preco(centavos);
  }

  public get valorReais(): number {
    return this._centavos / 100;
  }

  public get formatado(): string {
    return `R$ ${this.valorReais.toFixed(2).replace('.', ',')}`;
  }
}
