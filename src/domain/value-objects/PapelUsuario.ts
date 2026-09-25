export type PapelUsuarioType = 'CLIENTE' | 'TECNICO' | 'ADMIN';

export class PapelUsuario {
  public static readonly CLIENTE: PapelUsuarioType = 'CLIENTE';
  public static readonly TECNICO: PapelUsuarioType = 'TECNICO';
  public static readonly ADMIN: PapelUsuarioType = 'ADMIN';

  private readonly _value: PapelUsuarioType;

  private constructor(value: PapelUsuarioType) {
    this._value = value;
  }

  public static create(raw: string): PapelUsuario {
    const upper = raw?.toUpperCase() as PapelUsuarioType;
    if (upper !== 'CLIENTE' && upper !== 'TECNICO' && upper !== 'ADMIN') {
      throw new Error(`Papel de usuário inválido: "${raw}". Esperado: CLIENTE, TECNICO ou ADMIN.`);
    }
    return new PapelUsuario(upper);
  }

  public get value(): PapelUsuarioType {
    return this._value;
  }

  public isCliente(): boolean {
    return this._value === 'CLIENTE';
  }

  public isTecnico(): boolean {
    return this._value === 'TECNICO';
  }

  public isAdmin(): boolean {
    return this._value === 'ADMIN';
  }
}
