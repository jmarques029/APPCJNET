import * as Location from 'expo-location';

export interface LocalizacaoResultado {
  latitude: number;
  longitude: number;
  precisao?: number | null;
  isFallback?: boolean;
  mensagem?: string;
}

// Coordenadas centrais de Coqueiral/MG (Região de operação da CJnet)
export const COQUEIRAL_COORDENADAS_PADRAO = {
  latitude: -21.1850,
  longitude: -45.4350,
};

export class LocationService {
  /**
   * Obtém as coordenadas geográficas atuais do dispositivo via GPS/Rede.
   * Solicita permissão em primeiro plano caso ainda não tenha sido concedida.
   * Possui fallback gracioso para as coordenadas da matriz em Coqueiral/MG em caso de falha.
   */
  public static async obterLocalizacaoAtual(): Promise<LocalizacaoResultado> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return {
          ...COQUEIRAL_COORDENADAS_PADRAO,
          isFallback: true,
          mensagem: 'Permissão de localização não concedida. Posição definida para a central em Coqueiral/MG.',
        };
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        precisao: loc.coords.accuracy,
        isFallback: false,
      };
    } catch (err: unknown) {
      console.warn('Falha ao obter GPS do dispositivo, aplicando fallback para Coqueiral/MG:', err);
      return {
        ...COQUEIRAL_COORDENADAS_PADRAO,
        isFallback: true,
        mensagem: 'Sinal GPS indisponível no momento. Posição definida para a central em Coqueiral/MG.',
      };
    }
  }

  /**
   * Verifica se a permissão de localização em primeiro plano foi concedida.
   */
  public static async temPermissao(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }
}
