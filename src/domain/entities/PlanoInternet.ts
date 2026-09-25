import { Preco } from '../value-objects/Preco';

export interface PlanoInternetProps {
  id: string;
  nome: string;
  velocidadeMbps: number;
  precoMensal: Preco | number;
  beneficios?: string[];
  ativo?: boolean;
  destaque?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PlanoInternet {
  private readonly _id: string;
  private _nome: string;
  private _velocidadeMbps: number;
  private _precoMensal: Preco;
  private _beneficios: string[];
  private _ativo: boolean;
  private _destaque: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PlanoInternetProps) {
    if (!props.id) throw new Error('ID do plano é obrigatório.');
    if (!props.nome || props.nome.trim().length === 0) throw new Error('Nome do plano é obrigatório.');
    if (!props.velocidadeMbps || props.velocidadeMbps <= 0) {
      throw new Error('Velocidade em Mbps deve ser maior que zero.');
    }

    this._id = props.id;
    this._nome = props.nome.trim();
    this._velocidadeMbps = props.velocidadeMbps;

    this._precoMensal =
      props.precoMensal instanceof Preco
        ? props.precoMensal
        : Preco.fromReais(props.precoMensal);

    this._beneficios = props.beneficios ? [...props.beneficios] : [];
    this._ativo = props.ativo ?? true;
    this._destaque = props.destaque ?? false;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  public get id(): string { return this._id; }
  public get nome(): string { return this._nome; }
  public get velocidadeMbps(): number { return this._velocidadeMbps; }
  public get precoMensal(): Preco { return this._precoMensal; }
  public get beneficios(): ReadonlyArray<string> { return this._beneficios; }
  public get ativo(): boolean { return this._ativo; }
  public get destaque(): boolean { return this._destaque; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  public get labelVelocidade(): string {
    return `${this._velocidadeMbps} Mega`;
  }

  public desativar(): void {
    this._ativo = false;
    this._updatedAt = new Date();
  }

  public ativar(): void {
    this._ativo = true;
    this._updatedAt = new Date();
  }

  public atualizarValores(nome: string, velocidadeMbps: number, precoReais: number): void {
    this._nome = nome.trim();
    this._velocidadeMbps = velocidadeMbps;
    this._precoMensal = Preco.fromReais(precoReais);
    this._updatedAt = new Date();
  }
}
