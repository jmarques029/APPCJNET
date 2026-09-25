import { InvalidCoordinateError } from '../errors/DomainError';

export class GeoCoordenadas {
  private readonly _latitude: number;
  private readonly _longitude: number;

  private constructor(latitude: number, longitude: number) {
    this._latitude = latitude;
    this._longitude = longitude;
  }

  public static create(latitude: number, longitude: number): GeoCoordenadas {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new InvalidCoordinateError(latitude, longitude);
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new InvalidCoordinateError(latitude, longitude);
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new InvalidCoordinateError(latitude, longitude);
    }
    return new GeoCoordenadas(latitude, longitude);
  }

  public get latitude(): number {
    return this._latitude;
  }

  public get longitude(): number {
    return this._longitude;
  }

  /**
   * Calcula a distância em metros até outro ponto de coordenadas (Fórmula de Haversine)
   */
  public calcularDistanciaMetros(outro: GeoCoordenadas): number {
    const R = 6371e3; // Raio da Terra em metros
    const phi1 = (this._latitude * Math.PI) / 180;
    const phi2 = (outro._latitude * Math.PI) / 180;
    const deltaPhi = ((outro._latitude - this._latitude) * Math.PI) / 180;
    const deltaLambda = ((outro._longitude - this._longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
