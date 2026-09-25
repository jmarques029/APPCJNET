import { GeoCoordenadas } from '../value-objects/GeoCoordenadas';

export interface AreaCoberturaProps {
  id: string;
  nomeZona: string;
  vertices: GeoCoordenadas[];
  ativo?: boolean;
  updatedAt?: Date;
}

export class AreaCobertura {
  private readonly _id: string;
  private _nomeZona: string;
  private _vertices: GeoCoordenadas[];
  private _ativo: boolean;
  private _updatedAt: Date;

  constructor(props: AreaCoberturaProps) {
    if (!props.id) throw new Error('ID da área de cobertura é obrigatório.');
    if (!props.nomeZona) throw new Error('Nome da zona é obrigatório.');
    if (!props.vertices || props.vertices.length < 3) {
      throw new Error('Uma área de cobertura poligonal deve conter no mínimo 3 vértices.');
    }

    this._id = props.id;
    this._nomeZona = props.nomeZona.trim();
    this._vertices = [...props.vertices];
    this._ativo = props.ativo ?? true;
    this._updatedAt = props.updatedAt ?? new Date();
  }

  public get id(): string { return this._id; }
  public get nomeZona(): string { return this._nomeZona; }
  public get vertices(): ReadonlyArray<GeoCoordenadas> { return this._vertices; }
  public get ativo(): boolean { return this._ativo; }
  public get updatedAt(): Date { return this._updatedAt; }

  /**
   * Algoritmo Ray-Casting puro (Point-in-Polygon) para verificar se um ponto está dentro do polígono
   */
  public contemPonto(ponto: GeoCoordenadas): boolean {
    if (!this._ativo) return false;

    const lat = ponto.latitude;
    const lng = ponto.longitude;
    let dentro = false;

    for (let i = 0, j = this._vertices.length - 1; i < this._vertices.length; j = i++) {
      const xi = this._vertices[i].longitude;
      const yi = this._vertices[i].latitude;
      const xj = this._vertices[j].longitude;
      const yj = this._vertices[j].latitude;

      const intercepta = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intercepta) dentro = !dentro;
    }

    return dentro;
  }
}
