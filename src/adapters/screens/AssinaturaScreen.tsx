/**
 * AssinaturaScreen.tsx
 * --------------------
 * Camada de Adaptadores de Interface (UI): Tela de Planos e Assinatura de Fibra Óptica.
 *
 * Atende aos requisitos:
 *  - UC14: Consultar Planos na Tela de Login
 *  - RF11: Consulta pública de velocidades, preços e benefícios dos planos de fibra óptica
 *  - Layout construído com <View>, <Text>, <TouchableOpacity>, <ScrollView>
 *  - Estilização exclusiva via StyleSheet e Flexbox (com flexDirection: 'column' como padrão)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { sharedPlanoRepo, sharedAreaRepo, sharedPreCadastroRepo } from './mockStore';
import {
  ConsultarPlanosPublicosUseCase,
  VerificarCoberturaUseCase,
  SolicitarPreCadastroUseCase,
} from '@/application/use-cases';
import { useAuth } from '@/adapters/context/AuthContext';
import {
  MapaDisponibilidadeModal,
  ResultadoLocalizacaoCobertura,
} from '@/adapters/components/MapaDisponibilidadeModal';
import { MapaVisualCobertura } from '@/adapters/components/MapaVisualCobertura';

export interface AssinaturaScreenProps {
  onVoltar?: () => void;
  onAssinarPlano?: (plano: PlanoInternet) => void;
  onSair?: () => void;
}

interface CoberturaGpsState {
  status: 'IDLE' | 'BUSCANDO' | 'SUCESSO' | 'ERRO';
  latitude?: number;
  longitude?: number;
  coberto?: boolean;
  zonaAtendida?: string;
  mensagem?: string;
}

export function AssinaturaScreen({ onVoltar, onAssinarPlano, onSair }: AssinaturaScreenProps) {
  const { user, signOut } = useAuth();
  const [planos, setPlanos] = useState<PlanoInternet[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>('plano-400');
  const [loading, setLoading] = useState<boolean>(true);

  // Estados do Formulário de Contratação
  const [modalContratacaoVisible, setModalContratacaoVisible] = useState<boolean>(false);
  const [planoEmContratacao, setPlanoEmContratacao] = useState<PlanoInternet | null>(null);
  const [nomeCliente, setNomeCliente] = useState<string>(user?.name || 'Carlos Eduardo Silva');
  const [cpfCliente, setCpfCliente] = useState<string>('529.982.247-25');
  const [telefoneCliente, setTelefoneCliente] = useState<string>('(35) 99876-5432');
  const [enderecoCliente, setEnderecoCliente] = useState<string>('Rua Direita, 120, Centro - Coqueiral/MG');
  const [submetendo, setSubmetendo] = useState<boolean>(false);

  // Estado da Verificação por Geolocalização
  const [coberturaGps, setCoberturaGps] = useState<CoberturaGpsState>({
    status: 'SUCESSO',
    latitude: -21.1850,
    longitude: -45.4350,
    coberto: true,
    zonaAtendida: 'Centro e Bairros Adjacentes (Coqueiral/MG)',
    mensagem: 'Endereço dentro da zona de atendimento de fibra óptica CJnet.',
  });
  const [modalMapaVisible, setModalMapaVisible] = useState<boolean>(false);
  const [mapaExpandido, setMapaExpandido] = useState<boolean>(false);

  const handleConfirmarDoMapa = (res: ResultadoLocalizacaoCobertura) => {
    setCoberturaGps({
      status: 'SUCESSO',
      latitude: res.latitude,
      longitude: res.longitude,
      coberto: res.coberto,
      zonaAtendida: res.zonaAtendida,
      mensagem: res.mensagem,
    });
    setModalMapaVisible(false);
  };

  useEffect(() => {
    async function carregar() {
      try {
        const useCase = new ConsultarPlanosPublicosUseCase(sharedPlanoRepo);
        const resultado = await useCase.execute();
        setPlanos(resultado);
      } catch (err: unknown) {
        console.error('Erro ao carregar planos:', err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const verificarCoberturaPorCoordenadas = async (lat: number, lng: number) => {
    try {
      const useCase = new VerificarCoberturaUseCase(sharedAreaRepo);
      const resultado = await useCase.execute({ latitude: lat, longitude: lng });

      setCoberturaGps({
        status: 'SUCESSO',
        latitude: lat,
        longitude: lng,
        coberto: resultado.coberto,
        zonaAtendida: resultado.zonaAtendida,
        mensagem: resultado.mensagem,
      });
    } catch (err: unknown) {
      console.error('Erro ao verificar cobertura:', err);
      setCoberturaGps({
        status: 'ERRO',
        mensagem: err instanceof Error ? err.message : 'Falha ao consultar cobertura',
      });
    }
  };

  const handleObterLocalizacaoGps = async () => {
    setCoberturaGps({ status: 'BUSCANDO' });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCoberturaGps({
          status: 'ERRO',
          mensagem: 'Permissão de localização negada. Ative o GPS no dispositivo ou use a simulação abaixo.',
        });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      await verificarCoberturaPorCoordenadas(latitude, longitude);
    } catch (err: unknown) {
      console.warn('Erro ao ler GPS do dispositivo, usando fallback para Coqueiral/MG:', err);
      await verificarCoberturaPorCoordenadas(-21.1850, -45.4350);
    }
  };

  const handleSimularPonto = async (dentro: boolean) => {
    setCoberturaGps({ status: 'BUSCANDO' });
    const lat = dentro ? -21.1850 : -21.2500;
    const lng = dentro ? -45.4350 : -45.5000;
    setTimeout(async () => {
      await verificarCoberturaPorCoordenadas(lat, lng);
    }, 350);
  };

  const handleAssinar = (plano: PlanoInternet) => {
    if (onAssinarPlano) {
      onAssinarPlano(plano);
      return;
    }
    setPlanoEmContratacao(plano);
    setCoberturaGps({ status: 'IDLE' });
    setModalContratacaoVisible(true);
  };

  const handleConfirmarContratacao = async () => {
    if (!planoEmContratacao) return;

    if (!nomeCliente.trim() || !cpfCliente.trim() || !telefoneCliente.trim() || !enderecoCliente.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os dados de contato e endereço para a instalação.');
      return;
    }

    // Regra: A tela de planos é somente para assinar se a área de cobertura for compatível
    if (coberturaGps.status === 'IDLE') {
      Alert.alert(
        'Verificação de Cobertura Necessária 📍',
        'Por favor, utilize o botão "Usar Meu GPS" ou ajuste o ponto no mapa para verificar a viabilidade técnica antes de assinar.'
      );
      return;
    }

    if (!coberturaGps.coberto) {
      Alert.alert(
        'Assinatura Indisponível ⚠️',
        'Este endereço está fora da área de cobertura técnica de fibra óptica da CJnet no momento. A assinatura de planos só é permitida onde a cobertura for compatível.'
      );
      return;
    }

    setSubmetendo(true);
    try {
      const useCase = new SolicitarPreCadastroUseCase(
        sharedPreCadastroRepo,
        sharedPlanoRepo,
        sharedAreaRepo
      );

      const preCadastro = await useCase.execute({
        planoId: planoEmContratacao.id,
        nome: nomeCliente.trim(),
        cpfCnpj: cpfCliente.replace(/\D/g, '') || '52998224725',
        telefone: telefoneCliente.trim(),
        enderecoCompleto: enderecoCliente.trim(),
        latitude: coberturaGps.latitude,
        longitude: coberturaGps.longitude,
      });

      setModalContratacaoVisible(false);

      const msg = `Protocolo: #${preCadastro.id}\n\n✅ Cobertura Confirmada na zona "${coberturaGps.zonaAtendida}"!\n\nNossa equipe em Coqueiral/MG entrará em contato para agendar sua instalação 100% gratuita!`;

      Alert.alert('Contratação Solicitada com Sucesso! 🎉', msg, [{ text: 'Concluir' }]);
    } catch (err: unknown) {
      Alert.alert('Erro ao Contratar', err instanceof Error ? err.message : 'Falha ao processar solicitação');
    } finally {
      setSubmetendo(false);
    }
  };

  const handleVoltar = () => {
    if (onVoltar) {
      onVoltar();
    } else {
      router.back();
    }
  };

  const handleSair = async () => {
    if (onSair) {
      onSair();
      return;
    }
    const executarLogout = async () => {
      await signOut();
      router.replace('/login' as any);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Deseja realmente sair da sua conta?')) {
        await executarLogout();
      }
    } else {
      Alert.alert(
        'Encerrar Sessão',
        'Deseja realmente sair da sua conta CJnet?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: executarLogout,
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleVoltar}
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSairHeader}
              onPress={handleSair}
              accessibilityLabel="Sair da conta"
              testID="btn-sair-header"
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.btnSairHeaderText}>Sair</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.badgeTop}>CJNET FIBRA ÓPTICA</Text>
            <Text style={styles.headerTitle}>Planos & Assinaturas</Text>
            <Text style={styles.headerSubtitle}>
              Conexão ultra veloz e estável para sua residência ou empresa em Coqueiral/MG
            </Text>
          </View>
        </View>

        {/* Indicador de Carregamento */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Carregando planos de fibra...</Text>
          </View>
        ) : (
          <View style={styles.planosListContainer}>
            {planos.map((plano) => {
              const isSelected = planoSelecionado === plano.id;
              const isDestaque = plano.destaque;

              return (
                <TouchableOpacity
                  key={plano.id}
                  activeOpacity={0.9}
                  onPress={() => setPlanoSelecionado(plano.id)}
                  style={[
                    styles.cardPlano,
                    isSelected && styles.cardPlanoSelected,
                    isDestaque && styles.cardPlanoDestaque,
                  ]}
                >
                  {/* Badge de Destaque / Recomendado */}
                  {isDestaque && (
                    <View style={styles.destaqueBadge}>
                      <Ionicons name="star" size={14} color="#ffffff" style={styles.iconStar} />
                      <Text style={styles.destaqueBadgeText}>PLANO MAIS POPULAR</Text>
                    </View>
                  )}

                  {/* Topo do Card: Nome e Velocidade */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleBlock}>
                      <Text style={styles.planoNome}>{plano.nome}</Text>
                      <View style={styles.velocidadeTag}>
                        <Ionicons name="flash" size={16} color="#0284c7" />
                        <Text style={styles.velocidadeText}>{plano.labelVelocidade}</Text>
                      </View>
                    </View>

                    {/* Preço Mensal */}
                    <View style={styles.precoContainer}>
                      <Text style={styles.precoPrefixo}>R$</Text>
                      <Text style={styles.precoValor}>
                        {plano.precoMensal.valorReais.toFixed(2).replace('.', ',')}
                      </Text>
                      <Text style={styles.precoSufixo}>/mês</Text>
                    </View>
                  </View>

                  {/* Divisor */}
                  <View style={styles.cardDivider} />

                  {/* Lista de Benefícios */}
                  <View style={styles.beneficiosContainer}>
                    {plano.beneficios.map((beneficio, index) => (
                      <View key={index} style={styles.beneficioItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                        <Text style={styles.beneficioTexto}>{beneficio}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Botão de Ação do Plano */}
                  <TouchableOpacity
                    style={[
                      styles.btnAssinar,
                      isDestaque ? styles.btnAssinarDestaque : styles.btnAssinarNormal,
                    ]}
                    onPress={() => handleAssinar(plano)}
                  >
                    <Text
                      style={[
                        styles.btnAssinarTexto,
                        isDestaque ? styles.btnAssinarTextoDestaque : styles.btnAssinarTextoNormal,
                      ]}
                    >
                      Assinar Este Plano
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={isDestaque ? '#ffffff' : '#0284c7'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Rodapé Informativo */}
        <View style={styles.footerInfo}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#64748b" />
          <Text style={styles.footerInfoTitle}>Garantia CJnet de Qualidade</Text>
          <Text style={styles.footerInfoText}>
            Sem taxa de adesão, suporte local com técnicos em Coqueiral/MG e garantia de fibra óptica 100% dedicada.
          </Text>
        </View>
      </ScrollView>

      {/* Modal / Formulário de Contratação com Geolocalização por GPS */}
      <Modal
        visible={modalContratacaoVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalContratacaoVisible(false)}
      >
        {planoEmContratacao && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Topo do Modal */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubtitulo}>CONTRATAÇÃO DE FIBRA ÓPTICA</Text>
                  <Text style={styles.modalTitulo}>{planoEmContratacao.nome}</Text>
                  <Text style={styles.modalPrecoBadge}>
                    {planoEmContratacao.labelVelocidade} • {planoEmContratacao.precoMensal.formatado}/mês
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalContratacaoVisible(false)}
                  accessibilityLabel="Fechar formulário"
                  testID="btn-fechar-modal-contratacao"
                >
                  <Ionicons name="close" size={22} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. SEÇÃO DE GEOLOCALIZAÇÃO POR GPS (Principal requisito) */}
                <View style={styles.geoSection}>
                  <View style={styles.geoSectionHeader}>
                    <Ionicons name="location" size={20} color="#0284c7" />
                    <Text style={styles.geoSectionTitle}>Verificação de Cobertura por GPS</Text>
                  </View>
                  <Text style={styles.geoSectionDesc}>
                    Veja visualmente no mapa onde você está e a disponibilidade imediata de portas de fibra óptica (CTO) no imóvel.
                  </Text>

                  {/* MAPA VISUAL INTEGRADO COM PIN E DISPONIBILIDADE */}
                  <MapaVisualCobertura
                    latitude={coberturaGps.latitude || -21.1850}
                    longitude={coberturaGps.longitude || -45.4350}
                    coberto={coberturaGps.coberto ?? true}
                    zonaAtendida={coberturaGps.zonaAtendida}
                    mensagem={coberturaGps.mensagem}
                    onChangeCoordenadas={({ latitude, longitude }) => {
                      verificarCoberturaPorCoordenadas(latitude, longitude);
                    }}
                    expandido={mapaExpandido}
                    onToggleExpandir={setMapaExpandido}
                    onExpandirMapa={() => setMapaExpandido(true)}
                    altura={220}
                  />

                  {/* Botões de Ação Rápida */}
                  <View style={styles.simulacaoRow}>
                    <TouchableOpacity
                      style={styles.btnGpsDetect}
                      onPress={handleObterLocalizacaoGps}
                      disabled={coberturaGps.status === 'BUSCANDO'}
                      testID="btn-obter-gps"
                    >
                      {coberturaGps.status === 'BUSCANDO' ? (
                        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                      ) : (
                        <Ionicons name="navigate-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.btnGpsDetectText}>
                        {coberturaGps.status === 'BUSCANDO' ? 'Consultando GPS...' : 'Usar Meu GPS'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnAbrirMapa}
                      onPress={() => setMapaExpandido(true)}
                      testID="btn-abrir-mapa-cobertura"
                    >
                      <Ionicons name="expand" size={16} color="#0284c7" style={{ marginRight: 6 }} />
                      <Text style={styles.btnAbrirMapaText}>Expandir Mapa ⛶</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Atalhos para simulação / testes rápidos */}
                  <View style={styles.simulacaoBtns}>
                    <TouchableOpacity
                      style={styles.btnSimularItem}
                      onPress={() => handleSimularPonto(true)}
                      testID="btn-simular-centro"
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                      <Text style={styles.btnSimularText}>Coqueiral Centro (Com Cobertura)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnSimularItem}
                      onPress={() => handleSimularPonto(false)}
                      testID="btn-simular-fora"
                    >
                      <Ionicons name="close-circle-outline" size={14} color="#f59e0b" />
                      <Text style={styles.btnSimularText}>Zona Rural (Fora da Área)</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Card de Resultado da Disponibilidade */}
                  {coberturaGps.status === 'SUCESSO' && (
                    <View
                      style={[
                        styles.resultadoGpsCard,
                        coberturaGps.coberto ? styles.resultadoGpsCardSucesso : styles.resultadoGpsCardAlerta,
                      ]}
                      testID="card-resultado-cobertura"
                    >
                      <View style={styles.resultadoGpsHeader}>
                        <Ionicons
                          name={coberturaGps.coberto ? 'shield-checkmark' : 'alert-circle'}
                          size={22}
                          color={coberturaGps.coberto ? '#15803d' : '#b45309'}
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.resultadoGpsStatus,
                              coberturaGps.coberto ? { color: '#15803d' } : { color: '#b45309' },
                            ]}
                          >
                            {coberturaGps.coberto ? 'COBERTURA CONFIRMADA! ✅' : 'ÁREA EM ESTUDO DE EXPANSÃO ⚠️'}
                          </Text>
                          <Text style={styles.resultadoGpsZona}>
                            {coberturaGps.zonaAtendida || 'Região de Coqueiral/MG'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.resultadoGpsMensagem}>{coberturaGps.mensagem}</Text>

                      {/* Botão para ver/ajustar o ponto no mapa interativo */}
                      <TouchableOpacity
                        style={styles.btnVerNoMapaMini}
                        onPress={() => setMapaExpandido(true)}
                        testID="btn-ver-no-mapa"
                      >
                        <Ionicons name="map-outline" size={14} color="#0284c7" style={{ marginRight: 4 }} />
                        <Text style={styles.btnVerNoMapaMiniText}>Ver / Ajustar Ponto no Mapa</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {coberturaGps.status === 'ERRO' && (
                    <View style={styles.resultadoGpsCardErro}>
                      <Ionicons name="warning-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                      <Text style={styles.resultadoGpsErroText}>{coberturaGps.mensagem}</Text>
                    </View>
                  )}
                </View>

                {/* 2. DADOS DO CLIENTE E INSTALAÇÃO */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Dados do Titular da Instalação</Text>

                  <Text style={styles.inputLabel}>Nome Completo</Text>
                  <TextInput
                    style={styles.textInput}
                    value={nomeCliente}
                    onChangeText={setNomeCliente}
                    placeholder="Nome completo do titular"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.inputLabel}>CPF do Titular</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cpfCliente}
                    onChangeText={setCpfCliente}
                    placeholder="000.000.000-00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>Telefone / WhatsApp para Agendamento</Text>
                  <TextInput
                    style={styles.textInput}
                    value={telefoneCliente}
                    onChangeText={setTelefoneCliente}
                    placeholder="(35) 99999-9999"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>Endereço Completo de Instalação</Text>
                  <TextInput
                    style={[styles.textInput, { height: 70 }]}
                    value={enderecoCliente}
                    onChangeText={setEnderecoCliente}
                    placeholder="Rua, número, complemento e bairro"
                    placeholderTextColor="#94a3b8"
                    multiline
                  />
                </View>

                {/* Botão de Finalização */}
                <TouchableOpacity
                  style={[
                    styles.btnFinalizarContrato,
                    (!coberturaGps.coberto && coberturaGps.status === 'SUCESSO') && styles.btnFinalizarBloqueado,
                    submetendo && { opacity: 0.7 },
                  ]}
                  onPress={handleConfirmarContratacao}
                  disabled={submetendo}
                  testID="btn-finalizar-contratacao"
                >
                  {submetendo ? (
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  ) : (
                    <Ionicons
                      name={coberturaGps.coberto ? 'checkmark-done-circle' : 'alert-circle-outline'}
                      size={22}
                      color="#ffffff"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text style={styles.btnFinalizarContratoText}>
                    {submetendo
                      ? 'Registrando Solicitação...'
                      : (!coberturaGps.coberto && coberturaGps.status === 'SUCESSO')
                      ? 'Assinatura Bloqueada (Fora de Cobertura)'
                      : 'Confirmar Contratação & Instalação'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnCancelarContrato}
                  onPress={() => setModalContratacaoVisible(false)}
                >
                  <Text style={styles.btnCancelarContratoText}>Voltar para Planos</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Modal com Mapa Interativo de Cobertura e Disponibilidade */}
      <MapaDisponibilidadeModal
        visible={modalMapaVisible}
        onClose={() => setModalMapaVisible(false)}
        initialLatitude={coberturaGps.latitude || -21.1850}
        initialLongitude={coberturaGps.longitude || -45.4350}
        onConfirmar={handleConfirmarDoMapa}
        titulo="Mapa de Cobertura CJnet"
      />

      {/* Barra Inferior Pública (Exclusiva da Vitrine de Planos - Sem acesso a chamados do cliente) */}
      <View style={styles.barraInferiorPublica}>
        <TouchableOpacity
          style={styles.btnVoltarAoLoginBarra}
          onPress={handleVoltar}
          testID="btn-voltar-ao-login"
        >
          <Ionicons name="arrow-back-circle" size={20} color="#0284c7" />
          <Text style={styles.btnVoltarAoLoginBarraText}>Voltar ao Início / Login</Text>
        </TouchableOpacity>
        <Text style={styles.textoInformativoPublico}>
          Vitrine Comercial • Assinatura sujeita à cobertura técnica
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollContent: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'column',
    marginBottom: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnSairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: Platform.OS === 'ios' ? 44 : 0,
  },
  btnSairHeaderText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerTexts: {
    flexDirection: 'column',
  },
  badgeTop: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  planosListContainer: {
    flexDirection: 'column',
    gap: 20,
  },
  cardPlano: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPlanoSelected: {
    borderColor: '#0284c7',
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  cardPlanoDestaque: {
    borderColor: '#0284c7',
    borderWidth: 2,
    backgroundColor: '#ffffff',
  },
  destaqueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconStar: {
    marginRight: 4,
  },
  destaqueBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'column',
    marginBottom: 14,
  },
  cardTitleBlock: {
    flexDirection: 'column',
    marginBottom: 10,
  },
  planoNome: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  velocidadeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  velocidadeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
    marginLeft: 4,
  },
  precoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  precoPrefixo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 2,
  },
  precoValor: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
  },
  precoSufixo: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  beneficiosContainer: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  beneficioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  beneficioTexto: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 8,
    flex: 1,
  },
  btnAssinar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnAssinarDestaque: {
    backgroundColor: '#0284c7',
  },
  btnAssinarNormal: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  btnAssinarTexto: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  btnAssinarTextoDestaque: {
    color: '#ffffff',
  },
  btnAssinarTextoNormal: {
    color: '#0284c7',
  },
  footerInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 20,
    marginTop: 28,
  },
  footerInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  footerInfoText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Estilos do Modal de Contratação com Geolocalização */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    flexDirection: 'column',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSubtitulo: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalPrecoBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    flexDirection: 'column',
  },

  /* Seção de Geolocalização */
  geoSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    flexDirection: 'column',
  },
  geoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  geoSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 8,
  },
  geoSectionDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
  },
  btnGpsDetect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnGpsDetectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  simulacaoRow: {
    flexDirection: 'column',
    marginTop: 4,
    marginBottom: 10,
  },
  simulacaoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  simulacaoBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btnSimularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnSimularText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  resultadoGpsCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    marginTop: 8,
    flexDirection: 'column',
  },
  resultadoGpsCardSucesso: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  resultadoGpsCardAlerta: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  resultadoGpsCardErro: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  resultadoGpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultadoGpsStatus: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultadoGpsZona: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  resultadoGpsCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultadoGpsCoordsText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  resultadoGpsMensagem: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginTop: 4,
  },
  resultadoGpsErroText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
    lineHeight: 16,
  },

  /* Formulário de Dados */
  formSection: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },

  /* Botões de Ação do Formulário */
  btnFinalizarContrato: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  btnFinalizarContratoText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnCancelarContrato: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  btnCancelarContratoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },

  /* Estilos do Mapa de Disponibilidade */
  btnAbrirMapa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  btnAbrirMapaText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '700',
  },
  btnVerNoMapaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  btnVerNoMapaMiniText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '600',
  },
  btnFinalizarBloqueado: {
    backgroundColor: '#b45309',
    shadowColor: '#b45309',
  },

  /* Barra Inferior Pública (Sem acesso à área do cliente) */
  barraInferiorPublica: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  btnVoltarAoLoginBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    width: '100%',
    marginBottom: 6,
  },
  btnVoltarAoLoginBarraText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '700',
  },
  textoInformativoPublico: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
});
