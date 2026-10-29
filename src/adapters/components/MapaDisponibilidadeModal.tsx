/**
 * MapaDisponibilidadeModal.tsx
 * ----------------------------
 * Componente modal de mapa interativo para detecção de geolocalização e
 * verificação em tempo real de disponibilidade de fibra óptica CJnet.
 *
 * Funcionalidades:
 *  - Abre o mapa centrado na localização GPS do usuário (ou Coqueiral/MG).
 *  - Desenha visualmente as áreas de cobertura de fibra óptica ativas.
 *  - Permite arrastar o marcador (pin) ou tocar no mapa para ajustar o ponto exato do imóvel.
 *  - Analisa e informa em tempo real se o local possui viabilidade técnica e portas de fibra disponíveis.
 *  - Compatível com Android, iOS e fallback visual para Web.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LocationService } from '@/infra/device/LocationService';
import { sharedAreaRepo } from '@/adapters/screens/mockStore';
import { VerificarCoberturaUseCase } from '@/application/use-cases/cobertura/VerificarCoberturaUseCase';
import { ResultadoValidacaoCobertura } from '@/domain/services/ValidacaoCoberturaService';

// Import condicional do react-native-maps para suporte universal
let MapView: any = null;
let Marker: any = null;
let Polygon: any = null;
let Circle: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps.MapView;
    Marker = Maps.Marker;
    Polygon = Maps.Polygon;
    Circle = Maps.Circle;
  } catch (err) {
    console.warn('react-native-maps não disponível no ambiente atual, usando visualização alternativa:', err);
  }
}

export interface ResultadoLocalizacaoCobertura {
  latitude: number;
  longitude: number;
  coberto: boolean;
  zonaAtendida?: string;
  mensagem: string;
}

export interface MapaDisponibilidadeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmar?: (resultado: ResultadoLocalizacaoCobertura) => void;
  initialLatitude?: number;
  initialLongitude?: number;
  titulo?: string;
}

const COQUEIRAL_CENTRO_PADRAO = {
  latitude: -21.1850,
  longitude: -45.4350,
};

// Zonas de cobertura padrão para exibição no mapa (Coqueiral/MG)
const POLIGONO_ZONA_CENTRO = [
  { latitude: -21.1800, longitude: -45.4450 },
  { latitude: -21.1800, longitude: -45.4300 },
  { latitude: -21.1950, longitude: -45.4300 },
  { latitude: -21.1950, longitude: -45.4450 },
];

const POLIGONO_ZONA_SUL = [
  { latitude: -21.1950, longitude: -45.4500 },
  { latitude: -21.1950, longitude: -45.4250 },
  { latitude: -21.2100, longitude: -45.4250 },
  { latitude: -21.2100, longitude: -45.4500 },
];

export const MapaDisponibilidadeModal: React.FC<MapaDisponibilidadeModalProps> = ({
  visible,
  onClose,
  onConfirmar,
  initialLatitude = COQUEIRAL_CENTRO_PADRAO.latitude,
  initialLongitude = COQUEIRAL_CENTRO_PADRAO.longitude,
  titulo = 'Verificar Cobertura no Mapa',
}) => {
  const [coordenadas, setCoordenadas] = useState<{ latitude: number; longitude: number }>({
    latitude: initialLatitude,
    longitude: initialLongitude,
  });

  const [resultado, setResultado] = useState<ResultadoValidacaoCobertura>({
    coberto: true,
    zonaAtendida: 'Centro e Bairros Adjacentes (Coqueiral/MG)',
    mensagem: 'Endereço dentro da zona de atendimento de fibra óptica CJnet.',
  });

  const [buscandoGps, setBuscandoGps] = useState<boolean>(false);
  const [verificando, setVerificando] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  // Executa o caso de uso de verificação para a coordenada selecionada
  const avaliarPonto = useCallback(async (lat: number, lng: number) => {
    setVerificando(true);
    try {
      const useCase = new VerificarCoberturaUseCase(sharedAreaRepo);
      const res = await useCase.execute({ latitude: lat, longitude: lng });
      setResultado(res);
    } catch (err: unknown) {
      console.warn('Erro ao avaliar cobertura de fibra:', err);
    } finally {
      setVerificando(false);
    }
  }, []);

  // Inicializa a coordenada quando o modal é aberto
  useEffect(() => {
    if (visible) {
      const lat = initialLatitude || COQUEIRAL_CENTRO_PADRAO.latitude;
      const lng = initialLongitude || COQUEIRAL_CENTRO_PADRAO.longitude;
      setCoordenadas({ latitude: lat, longitude: lng });
      avaliarPonto(lat, lng);
    }
  }, [visible, initialLatitude, initialLongitude, avaliarPonto]);

  // Obtém a posição GPS real do usuário
  const handleDetectarMinhaPosicao = async () => {
    setBuscandoGps(true);
    try {
      const loc = await LocationService.obterLocalizacaoAtual();
      const novoPonto = { latitude: loc.latitude, longitude: loc.longitude };
      setCoordenadas(novoPonto);
      await avaliarPonto(loc.latitude, loc.longitude);

      if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion({
          ...novoPonto,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }, 800);
      }
    } catch (err) {
      console.warn('Falha ao obter posição:', err);
    } finally {
      setBuscandoGps(false);
    }
  };

  // Trata toque no mapa
  const handlePressMapa = (e: any) => {
    const coords = e?.nativeEvent?.coordinate;
    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      setCoordenadas({ latitude: coords.latitude, longitude: coords.longitude });
      avaliarPonto(coords.latitude, coords.longitude);
    }
  };

  // Trata arrastar do marcador
  const handleMarkerDragEnd = (e: any) => {
    const coords = e?.nativeEvent?.coordinate;
    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      setCoordenadas({ latitude: coords.latitude, longitude: coords.longitude });
      avaliarPonto(coords.latitude, coords.longitude);
    }
  };

  // Atalho de teste: Centro (Com Cobertura)
  const handleTestarCentro = () => {
    const ponto = { latitude: -21.1850, longitude: -45.4350 };
    setCoordenadas(ponto);
    avaliarPonto(ponto.latitude, ponto.longitude);
    if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
      mapRef.current.animateToRegion({ ...ponto, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600);
    }
  };

  // Atalho de teste: Zona Rural (Sem Cobertura)
  const handleTestarFora = () => {
    const ponto = { latitude: -21.2500, longitude: -45.5000 };
    setCoordenadas(ponto);
    avaliarPonto(ponto.latitude, ponto.longitude);
    if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
      mapRef.current.animateToRegion({ ...ponto, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600);
    }
  };

  const handleConfirmar = () => {
    if (onConfirmar) {
      onConfirmar({
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
        coberto: resultado.coberto,
        zonaAtendida: resultado.zonaAtendida,
        mensagem: resultado.mensagem,
      });
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Superior */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.btnFechar}
            onPress={onClose}
            testID="btn-fechar-mapa-modal"
            accessibilityLabel="Fechar mapa de cobertura"
          >
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>{titulo}</Text>
            <Text style={styles.headerSubtitulo}>Rede de Fibra Óptica • Coqueiral/MG</Text>
          </View>
          <TouchableOpacity
            style={styles.btnGpsIcone}
            onPress={handleDetectarMinhaPosicao}
            disabled={buscandoGps}
            testID="btn-minha-posicao-mapa"
            accessibilityLabel="Obter minha localização GPS"
          >
            {buscandoGps ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : (
              <Ionicons name="locate" size={22} color="#0284c7" />
            )}
          </TouchableOpacity>
        </View>

        {/* Área do Mapa */}
        <View style={styles.mapContainer} testID="area-do-mapa">
          {MapView ? (
            <MapView
              ref={mapRef}
              style={styles.mapView}
              testID="mapa-cobertura-view"
              initialRegion={{
                latitude: coordenadas.latitude,
                longitude: coordenadas.longitude,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              onPress={handlePressMapa}
            >
              {/* Polígonos de Zonas de Atendimento CJnet */}
              <Polygon
                coordinates={POLIGONO_ZONA_CENTRO}
                fillColor="rgba(2, 132, 199, 0.22)"
                strokeColor="#0284c7"
                strokeWidth={2}
              />
              <Polygon
                coordinates={POLIGONO_ZONA_SUL}
                fillColor="rgba(16, 185, 129, 0.22)"
                strokeColor="#10b981"
                strokeWidth={2}
              />

              {/* Marcador interativo da localização do usuário */}
              <Marker
                coordinate={coordenadas}
                draggable
                onDragEnd={handleMarkerDragEnd}
                testID="marcador-posicao-usuario"
                title="Sua Localização"
                description={resultado.coberto ? 'Com Cobertura CJnet' : 'Fora da Área de Fibra'}
                pinColor={resultado.coberto ? '#10b981' : '#ef4444'}
              />
            </MapView>
          ) : (
            /* Visualização Interativa para Web / Emuladores sem módulo nativo */
            <View style={styles.webMapFallback} testID="mapa-cobertura-fallback">
              <View style={styles.webMapHeader}>
                <Ionicons name="map-outline" size={32} color="#0284c7" />
                <Text style={styles.webMapTitulo}>Simulador de Mapa Geográfico</Text>
                <Text style={styles.webMapSub}>
                  Coordenadas atuais: Lat {coordenadas.latitude.toFixed(4)} | Lng {coordenadas.longitude.toFixed(4)}
                </Text>
              </View>

              <View style={styles.webMapGrid}>
                <View
                  style={[
                    styles.webMapAreaCoverage,
                    resultado.coberto ? styles.webMapAreaActive : styles.webMapAreaInactive,
                  ]}
                >
                  <Text style={styles.webMapAreaLabel}>
                    ZONA DE FIBRA ÓPTICA CJNET (COQUEIRAL/MG)
                  </Text>
                  <View style={styles.webMapPinBox}>
                    <Ionicons
                      name="location"
                      size={36}
                      color={resultado.coberto ? '#10b981' : '#ef4444'}
                    />
                    <Text style={styles.webMapPinText}>
                      {resultado.coberto ? 'Você está aqui (Coberto)' : 'Você está aqui (Fora)'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Dica flutuante para o usuário */}
          <View style={styles.dicaFlutuante}>
            <Ionicons name="information-circle" size={16} color="#0284c7" />
            <Text style={styles.dicaFlutuanteText}>
              Toque no mapa ou arraste o marcador para ajustar o local exato do imóvel
            </Text>
          </View>

          {/* Botões rápidos de teste no rodapé do mapa */}
          <View style={styles.botoesTesteFlutuantes}>
            <TouchableOpacity
              style={styles.btnSimularMini}
              onPress={handleTestarCentro}
              testID="btn-mapa-testar-centro"
            >
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.btnSimularMiniText}>Centro (Coberto)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSimularMini}
              onPress={handleTestarFora}
              testID="btn-mapa-testar-fora"
            >
              <Ionicons name="close-circle" size={14} color="#f59e0b" />
              <Text style={styles.btnSimularMiniText}>Rural (Fora)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Inferior de Disponibilidade em Tempo Real */}
        <View
          style={[
            styles.cardDisponibilidade,
            resultado.coberto ? styles.cardCoberturaSucesso : styles.cardCoberturaAlerta,
          ]}
          testID="card-disponibilidade-mapa"
        >
          <View style={styles.disponibilidadeHeader}>
            <View
              style={[
                styles.iconeStatusBox,
                resultado.coberto ? styles.iconeStatusSucesso : styles.iconeStatusAlerta,
              ]}
            >
              {verificando ? (
                <ActivityIndicator size="small" color={resultado.coberto ? '#15803d' : '#b45309'} />
              ) : (
                <Ionicons
                  name={resultado.coberto ? 'shield-checkmark' : 'alert-circle'}
                  size={24}
                  color={resultado.coberto ? '#15803d' : '#b45309'}
                />
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[
                  styles.tituloDisponibilidade,
                  resultado.coberto ? { color: '#15803d' } : { color: '#b45309' },
                ]}
              >
                {resultado.coberto ? 'Disponibilidade Confirmada! 🎉' : 'Fora da Área de Cobertura ⚠️'}
              </Text>
              <Text style={styles.subtituloDisponibilidade}>
                {resultado.coberto
                  ? `Atendimento disponível na ${resultado.zonaAtendida || 'rede central'}`
                  : 'Nossa rede de fibra ainda não chegou a este ponto específico'}
              </Text>
            </View>
          </View>

          <Text style={styles.mensagemDetalhe}>
            {resultado.mensagem}
          </Text>

          {/* Coordenadas Técnicas */}
          <View style={styles.coordenadasInfoRow}>
            <Ionicons name="navigate-outline" size={14} color="#64748b" />
            <Text style={styles.coordenadasInfoText}>
              Lat: {coordenadas.latitude.toFixed(5)} | Lng: {coordenadas.longitude.toFixed(5)} • Ponto Georreferenciado
            </Text>
          </View>

          {/* Botão de Ação Primária */}
          <TouchableOpacity
            style={[
              styles.btnConfirmarLocal,
              resultado.coberto ? styles.btnConfirmarSucesso : styles.btnConfirmarAlerta,
            ]}
            onPress={handleConfirmar}
            testID="btn-confirmar-localizacao-mapa"
          >
            <Ionicons
              name={resultado.coberto ? 'checkmark-circle' : 'flag-outline'}
              size={20}
              color="#ffffff"
            />
            <Text style={styles.btnConfirmarLocalText}>
              {resultado.coberto
                ? 'Confirmar Localização e Continuar'
                : 'Salvar Ponto para Pré-Cadastro de Expansão'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  btnFechar: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTextos: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitulo: {
    fontSize: 12,
    color: '#64748b',
  },
  btnGpsIcone: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  webMapFallback: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  webMapTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  webMapSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  webMapGrid: {
    width: '100%',
    maxWidth: 400,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapAreaCoverage: {
    width: '85%',
    height: '80%',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  webMapAreaActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderColor: '#0284c7',
  },
  webMapAreaInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
  },
  webMapAreaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    textAlign: 'center',
  },
  webMapPinBox: {
    alignItems: 'center',
    marginTop: 10,
  },
  webMapPinText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  dicaFlutuante: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dicaFlutuanteText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  botoesTesteFlutuantes: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  btnSimularMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  btnSimularMiniText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  cardDisponibilidade: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cardCoberturaSucesso: {
    borderTopColor: '#10b981',
  },
  cardCoberturaAlerta: {
    borderTopColor: '#f59e0b',
  },
  disponibilidadeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconeStatusBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconeStatusSucesso: {
    backgroundColor: '#dcfce7',
  },
  iconeStatusAlerta: {
    backgroundColor: '#fef3c7',
  },
  tituloDisponibilidade: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtituloDisponibilidade: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  mensagemDetalhe: {
    fontSize: 13,
    color: '#334155',
    marginTop: 10,
    lineHeight: 18,
  },
  coordenadasInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  coordenadasInfoText: {
    fontSize: 11,
    color: '#64748b',
  },
  btnConfirmarLocal: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnConfirmarSucesso: {
    backgroundColor: '#10b981',
  },
  btnConfirmarAlerta: {
    backgroundColor: '#0284c7',
  },
  btnConfirmarLocalText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
