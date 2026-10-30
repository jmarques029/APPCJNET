/**
 * MapaVisualCobertura.tsx
 * -----------------------
 * Componente visual de mapa para apresentação interativa de geolocalização e
 * verificação de disponibilidade de fibra óptica.
 *
 * Elimina a exibição fria de números brutos de latitude/longitude e exibe
 * um mapa cartográfico vivo com o ponto da pessoa e o status de disponibilidade.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationService } from '@/infra/device/LocationService';

// Import condicional do react-native-maps para plataformas nativas
let MapView: any = null;
let Marker: any = null;
let Polygon: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps.MapView;
    Marker = Maps.Marker;
    Polygon = Maps.Polygon;
  } catch (err) {
    // Modo universal / fallback
  }
}

export interface MapaVisualCoberturaProps {
  latitude: number;
  longitude: number;
  onChangeCoordenadas?: (coords: { latitude: number; longitude: number }) => void;
  coberto: boolean;
  zonaAtendida?: string;
  mensagem?: string;
  onExpandirMapa?: () => void;
  altura?: number;
  modoInline?: boolean;
}

// Zonas da fibra CJnet em Coqueiral/MG
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

export const MapaVisualCobertura: React.FC<MapaVisualCoberturaProps> = ({
  latitude,
  longitude,
  onChangeCoordenadas,
  coberto,
  zonaAtendida,
  mensagem,
  onExpandirMapa,
  altura = 240,
  modoInline = false,
}) => {
  const [buscandoGps, setBuscandoGps] = useState<boolean>(false);

  // Calcula nome descritivo do bairro/região sem números técnicos
  const nomeLocal = React.useMemo(() => {
    if (coberto) {
      return zonaAtendida || 'Centro, Coqueiral - MG';
    }
    return 'Zona Rural / Fora do Perímetro Urbano (Coqueiral - MG)';
  }, [coberto, zonaAtendida]);

  const handleBuscarMeuGps = async () => {
    setBuscandoGps(true);
    try {
      const loc = await LocationService.obterLocalizacaoAtual();
      if (onChangeCoordenadas) {
        onChangeCoordenadas({ latitude: loc.latitude, longitude: loc.longitude });
      }
    } catch (err) {
      console.warn('Erro ao obter GPS:', err);
    } finally {
      setBuscandoGps(false);
    }
  };

  const handlePontoCentro = () => {
    if (onChangeCoordenadas) {
      onChangeCoordenadas({ latitude: -21.1850, longitude: -45.4350 });
    }
  };

  const handlePontoRural = () => {
    if (onChangeCoordenadas) {
      onChangeCoordenadas({ latitude: -21.2500, longitude: -45.5000 });
    }
  };

  // Posição percentual visual do marcador no mapa interativo
  // Centro = ~44%, Rural = ~76%
  const pinPosTop = coberto ? '44%' : '76%';
  const pinPosLeft = coberto ? '48%' : '78%';

  return (
    <View style={[styles.container, { height: altura }]} testID="mapa-visual-container">
      {/* 1. MAPA REAL OU MAPA CARTOGRÁFICO INTERATIVO */}
      {MapView ? (
        <MapView
          style={StyleSheet.absoluteFill}
          testID="mapa-cobertura-view"
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}
          onPress={(e: any) => {
            const c = e?.nativeEvent?.coordinate;
            if (c && onChangeCoordenadas) {
              onChangeCoordenadas({ latitude: c.latitude, longitude: c.longitude });
            }
          }}
        >
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
          <Marker
            coordinate={{ latitude, longitude }}
            draggable
            onDragEnd={(e: any) => {
              const c = e?.nativeEvent?.coordinate;
              if (c && onChangeCoordenadas) {
                onChangeCoordenadas({ latitude: c.latitude, longitude: c.longitude });
              }
            }}
            testID="marcador-posicao-usuario"
            title="Sua Localização"
            pinColor={coberto ? '#10b981' : '#ef4444'}
          />
        </MapView>
      ) : (
        /* Camada Cartográfica Rica e Interativa (Web, Expo Go e Universal) */
        <TouchableOpacity
          activeOpacity={0.95}
          style={styles.cartografiaContainer}
          testID="mapa-cobertura-fallback"
          onPress={coberto ? handlePontoRural : handlePontoCentro}
          accessibilityLabel="Mapa de cobertura. Toque para alternar posição no mapa"
        >
          {/* Malha Viária de Coqueiral (Ruas e Quarteirões) */}
          <View style={styles.ruaHorizontal1} />
          <View style={styles.ruaHorizontal2} />
          <View style={styles.ruaHorizontal3} />
          <View style={styles.ruaVertical1} />
          <View style={styles.ruaVertical2} />
          <View style={styles.ruaVertical3} />

          {/* Rótulos de Ruas Reais de Coqueiral */}
          <Text style={styles.labelRuaPrincipal}>Av. Minas Gerais</Text>
          <Text style={styles.labelRuaSecundaria}>Rua Direita</Text>
          <Text style={styles.labelRuaCentro}>Praça 7 de Setembro</Text>

          {/* Área Verde / Praça da Matriz */}
          <View style={styles.areaVerdePraca}>
            <Ionicons name="leaf" size={12} color="#15803d" />
            <Text style={styles.areaVerdeTexto}>Matriz</Text>
          </View>

          {/* Polígono da Zona Central de Fibra Óptica CJnet */}
          <View style={styles.poligonoZonaCentral}>
            <View style={styles.tagFibraCentral}>
              <Ionicons name="flash" size={10} color="#0284c7" />
              <Text style={styles.tagFibraCentralText}>REDE DE FIBRA ÓPTICA CJNET</Text>
            </View>
          </View>

          {/* Marcador Visual com Radar de Pulso ("Você está aqui") */}
          <View
            style={[
              styles.marcadorPin,
              { top: pinPosTop as any, left: pinPosLeft as any },
            ]}
            testID="marcador-posicao-usuario"
          >
            {/* Efeito de pulso de sinal GPS */}
            <View
              style={[
                styles.pulsoGps,
                coberto ? styles.pulsoGpsVerde : styles.pulsoGpsVermelho,
              ]}
            />
            {/* Ícone do Pin 3D */}
            <View
              style={[
                styles.pinIconeBox,
                coberto ? styles.pinIconeVerde : styles.pinIconeVermelho,
              ]}
            >
              <Ionicons name="location" size={24} color="#ffffff" />
            </View>
            <View style={styles.pinSombra} />

            {/* Balão "Você está aqui" */}
            <View style={styles.pinBalao}>
              <Text style={styles.pinBalaoTexto}>
                {coberto ? '📍 Você está aqui' : '📍 Ponto Marcado'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* 2. OVERLAY SUPERIOR: STATUS DE DISPONIBILIDADE EM TEMPO REAL */}
      <View style={styles.overlayTopo}>
        <View
          style={[
            styles.badgeDisponibilidade,
            coberto ? styles.badgeDisponivel : styles.badgeIndisponivel,
          ]}
          testID="badge-disponibilidade-mapa"
        >
          <Ionicons
            name={coberto ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={coberto ? '#15803d' : '#b91c1c'}
          />
          <View style={{ marginLeft: 6, flex: 1 }}>
            <Text
              style={[
                styles.badgeStatusTitulo,
                coberto ? { color: '#15803d' } : { color: '#b91c1c' },
              ]}
            >
              {coberto ? 'Disponibilidade Confirmada! 🎉' : 'Sem Cobertura Técnica ⚠️'}
            </Text>
            <Text
              style={[
                styles.badgeStatusSub,
                coberto ? { color: '#166534' } : { color: '#991b1b' },
              ]}
              numberOfLines={1}
            >
              {coberto ? 'Fibra Óptica até 600M pronta para instalação' : 'Endereço fora da rede cabeada atual'}
            </Text>
          </View>
        </View>

        {/* Botão de Expandir Mapa */}
        {onExpandirMapa && (
          <TouchableOpacity
            style={styles.btnAcaoFlutuante}
            onPress={onExpandirMapa}
            accessibilityLabel="Expandir mapa"
            testID="btn-expandir-mapa"
          >
            <Ionicons name="expand" size={16} color="#0284c7" />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. OVERLAY INFERIOR: LOCALIZAÇÃO AMIGÁVEL & CONTROLES */}
      <View style={styles.overlayRodape}>
        <View style={styles.localizacaoAmigavelCard}>
          <View style={styles.localizacaoRow}>
            <Ionicons name="business" size={16} color="#0284c7" style={{ marginRight: 6 }} />
            <Text style={styles.localizacaoTexto} numberOfLines={1}>
              {nomeLocal}
            </Text>
          </View>

          {/* Botões Rápidos: Meu GPS e Simulações */}
          <View style={styles.controlesRow}>
            <TouchableOpacity
              style={styles.btnGpsRapido}
              onPress={handleBuscarMeuGps}
              disabled={buscandoGps}
              testID="btn-meu-gps-mapa"
            >
              {buscandoGps ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 4 }} />
              ) : (
                <Ionicons name="locate" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.btnGpsRapidoText}>Meu GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnAlternarPonto, coberto && styles.btnAlternarPontoAtivo]}
              onPress={handlePontoCentro}
              testID="btn-mapa-testar-centro"
            >
              <Text style={[styles.btnAlternarPontoText, coberto && styles.btnAlternarPontoTextAtivo]}>
                Centro (Coberto)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnAlternarPonto, !coberto && styles.btnAlternarPontoAtivo]}
              onPress={handlePontoRural}
              testID="btn-mapa-testar-fora"
            >
              <Text style={[styles.btnAlternarPontoText, !coberto && styles.btnAlternarPontoTextAtivo]}>
                Rural (Fora)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginVertical: 10,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },

  /* Cartografia / Simulação de Mapa Rico */
  cartografiaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  ruaHorizontal1: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  ruaHorizontal2: {
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#94a3b8',
  },
  ruaHorizontal3: {
    position: 'absolute',
    top: '76%',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  ruaVertical1: {
    position: 'absolute',
    left: '20%',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#cbd5e1',
  },
  ruaVertical2: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 16,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#94a3b8',
  },
  ruaVertical3: {
    position: 'absolute',
    left: '75%',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#cbd5e1',
  },

  labelRuaPrincipal: {
    position: 'absolute',
    top: '53%',
    left: 8,
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelRuaSecundaria: {
    position: 'absolute',
    left: '51%',
    top: 12,
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  labelRuaCentro: {
    position: 'absolute',
    top: '30%',
    left: '28%',
    fontSize: 8,
    fontWeight: '600',
    color: '#94a3b8',
  },

  areaVerdePraca: {
    position: 'absolute',
    top: '33%',
    left: '24%',
    width: 55,
    height: 34,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaVerdeTexto: {
    fontSize: 8,
    fontWeight: '700',
    color: '#15803d',
  },

  /* Polígono de Cobertura */
  poligonoZonaCentral: {
    position: 'absolute',
    top: '20%',
    left: '16%',
    width: '66%',
    height: '52%',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#0284c7',
    borderRadius: 14,
    padding: 6,
  },
  tagFibraCentral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  tagFibraCentralText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0284c7',
  },

  /* Marcador do Usuário */
  marcadorPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -45,
  },
  pulsoGps: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    opacity: 0.35,
  },
  pulsoGpsVerde: {
    backgroundColor: '#10b981',
  },
  pulsoGpsVermelho: {
    backgroundColor: '#ef4444',
  },
  pinIconeBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  pinIconeVerde: {
    backgroundColor: '#16a34a',
  },
  pinIconeVermelho: {
    backgroundColor: '#dc2626',
  },
  pinSombra: {
    width: 14,
    height: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginTop: 2,
  },
  pinBalao: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 3,
  },
  pinBalaoTexto: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },

  /* Overlay Topo */
  overlayTopo: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeDisponibilidade: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeDisponivel: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  badgeIndisponivel: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  badgeStatusTitulo: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeStatusSub: {
    fontSize: 10,
    fontWeight: '600',
  },

  btnAcaoFlutuante: {
    backgroundColor: '#ffffff',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  /* Overlay Rodapé */
  overlayRodape: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  localizacaoAmigavelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  localizacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  localizacaoTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },

  controlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnGpsRapido: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnGpsRapidoText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  btnAlternarPonto: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnAlternarPontoAtivo: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  btnAlternarPontoText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  btnAlternarPontoTextAtivo: {
    color: '#0284c7',
    fontWeight: '700',
  },
});
