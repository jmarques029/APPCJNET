/**
 * ClienteTabScreen.tsx
 * --------------------
 * Camada de Adaptadores de Interface (UI): Aba do Cliente.
 *
 * Requisito:
 * "o cliente só abre chamado e acompanha suas OS aberta, abre os e verifica o técnico que será atribuido."
 *
 * Funcionalidades:
 *  - Visualização e acompanhamento de Ordens de Serviço abertas do cliente logado.
 *  - Abertura de novos chamados com seleção de tipo de problema, descrição e foto do roteador/ONU.
 *  - Verificação detalhada da OS aberta e do técnico que será atribuído (ou já atribuído).
 *  - Troca de mensagens de suporte com a central da CJnet.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { TipoProblema, type TipoProblemaType } from '@/domain/value-objects/TipoProblema';
import {
  sharedOsRepo,
  sharedClienteRepo,
  sharedAreaRepo,
  DEMO_CLIENTE_ID,
  obterMensagensPorOS,
  enviarMensagemOS,
  type MensagemOS,
} from './mockStore';
import { AbrirOrdemServicoUseCase, VerificarCoberturaUseCase } from '@/application/use-cases';
import { useAuth } from '@/adapters/context/AuthContext';
import { AppNavBar } from './components/AppNavBar';
import { getTecnicoInfo } from './HistoricoRelatoriosScreen';
import { CameraCaptureModal, CapturedPhoto } from '@/adapters/components/CameraCaptureModal';
import { LocationService } from '@/infra/device/LocationService';
import { CameraDeviceService } from '@/infra/device/CameraDeviceService';
import {
  MapaDisponibilidadeModal,
  ResultadoLocalizacaoCobertura,
} from '@/adapters/components/MapaDisponibilidadeModal';
import { MapaVisualCobertura } from '@/adapters/components/MapaVisualCobertura';

export interface ClienteTabScreenProps {
  clienteId?: string;
  initialDescricao?: string;
  initialNovaMensagem?: string;
  initialSelectedOs?: OrdemServico | null;
  onNovoChamadoSuccess?: (os: OrdemServico) => void;
  onSair?: () => void;
}

const OPCOES_PROBLEMA: {
  valor: TipoProblemaType;
  titulo: string;
  subtitulo: string;
  icon: keyof typeof Ionicons.glyphMap;
  cor: string;
}[] = [
  {
    valor: 'SEM_SINAL',
    titulo: 'Sem Sinal de Internet',
    subtitulo: 'Luz PON apagada ou vermelha na ONU',
    icon: 'wifi-outline',
    cor: '#ef4444',
  },
  {
    valor: 'LENTIDAO',
    titulo: 'Lentidão na Conexão',
    subtitulo: 'Velocidade muito abaixo do contratado',
    icon: 'speedometer-outline',
    cor: '#f59e0b',
  },
  {
    valor: 'QUEDA',
    titulo: 'Quedas Frequentes',
    subtitulo: 'Sinal caindo repetidamente',
    icon: 'pulse-outline',
    cor: '#f97316',
  },
  {
    valor: 'OUTROS',
    titulo: 'Outro Motivo',
    subtitulo: 'Dúvidas, cabeamento ou suporte',
    icon: 'help-circle-outline',
    cor: '#3b82f6',
  },
];

export function ClienteTabScreen({
  clienteId = DEMO_CLIENTE_ID,
  initialDescricao,
  initialNovaMensagem,
  initialSelectedOs = null,
  onNovoChamadoSuccess,
  onSair,
}: ClienteTabScreenProps) {
  const { user, role, signOut } = useAuth();
  const activeClienteId = user?.id || clienteId;
  const activeClienteNome = user?.name || 'Carlos Eduardo Silva';

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalNovoChamado, setModalNovoChamado] = useState<boolean>(false);
  const [selectedOs, setSelectedOs] = useState<OrdemServico | null>(initialSelectedOs);

  // Formulário de Nova OS
  const [tipoProblema, setTipoProblema] = useState<TipoProblemaType>('SEM_SINAL');
  const [descricao, setDescricao] = useState<string>(initialDescricao ?? '');
  const [fotoAnexada, setFotoAnexada] = useState<boolean>(false);
  const [modalCameraVisible, setModalCameraVisible] = useState<boolean>(false);
  const [fotoCapturada, setFotoCapturada] = useState<CapturedPhoto | null>(null);
  const [coordenadasGps, setCoordenadasGps] = useState<{
    latitude: number;
    longitude: number;
    coberto: boolean;
    zonaAtendida?: string;
    precisao?: number | null;
    status: 'IDLE' | 'BUSCANDO' | 'OBTIDO' | 'ERRO';
    mensagem?: string;
  }>({
    latitude: -21.1850,
    longitude: -45.4350,
    coberto: true,
    zonaAtendida: 'Centro e Bairros Adjacentes (Coqueiral/MG)',
    status: 'OBTIDO',
    mensagem: 'Ponto de atendimento na rede de fibra óptica CJnet.',
  });
  const [modalMapaVisible, setModalMapaVisible] = useState<boolean>(false);
  const [criandoOS, setCriandoOS] = useState<boolean>(false);

  const handleConfirmarPontoMapa = (ponto: ResultadoLocalizacaoCobertura) => {
    setCoordenadasGps({
      latitude: ponto.latitude,
      longitude: ponto.longitude,
      coberto: ponto.coberto,
      zonaAtendida: ponto.zonaAtendida,
      precisao: 5,
      status: 'OBTIDO',
      mensagem: ponto.mensagem,
    });
    setModalMapaVisible(false);
  };

  const handleTirarFotoCelular = async () => {
    const res = await CameraDeviceService.abrirCameraCelular();
    if (res.sucesso && res.uri) {
      setFotoAnexada(true);
      setFotoCapturada({
        uri: res.uri,
        tamanhoKb: res.tamanhoKb || 620,
      });
    }
  };

  const handleRemoverFoto = () => {
    setFotoAnexada(false);
    setFotoCapturada(null);
  };

  const handleObterGps = async () => {
    setCoordenadasGps((prev) => ({ ...prev, status: 'BUSCANDO' }));
    const resultado = await LocationService.obterLocalizacaoAtual();
    const useCase = new VerificarCoberturaUseCase(sharedAreaRepo);
    const validacao = await useCase.execute({
      latitude: resultado.latitude,
      longitude: resultado.longitude,
    });

    setCoordenadasGps({
      latitude: resultado.latitude,
      longitude: resultado.longitude,
      coberto: validacao.coberto,
      zonaAtendida: validacao.zonaAtendida,
      precisao: resultado.precisao,
      status: resultado.isFallback ? 'ERRO' : 'OBTIDO',
      mensagem: validacao.mensagem,
    });
    if (!resultado.isFallback) {
      Alert.alert(
        'GPS CJnet 📍',
        `Localização capturada com sucesso!\n${validacao.coberto ? '✅ Fibra Óptica Disponível' : '⚠️ Fora da Área Cabeada'}`
      );
    }
  };

  const handleFotoCapturada = (photo: CapturedPhoto) => {
    setFotoCapturada(photo);
    setFotoAnexada(true);
  };

  // Chat com a Central dentro da OS
  const [mensagensOS, setMensagensOS] = useState<MensagemOS[]>([]);
  const [novaMensagem, setNovaMensagem] = useState<string>(initialNovaMensagem ?? '');

  const carregarOrdens = useCallback(async () => {
    setLoading(true);
    try {
      const todas = await sharedOsRepo.listarPorCliente(activeClienteId);
      setOrdens(todas);
    } catch (err: unknown) {
      console.error('Erro ao listar OS do cliente:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClienteId]);

  useEffect(() => {
    let isMounted = true;
    const carregar = async () => {
      setLoading(true);
      try {
        const todas = await sharedOsRepo.listarPorCliente(activeClienteId);
        if (isMounted) {
          setOrdens(todas);
        }
      } catch (err: unknown) {
        if (isMounted) console.error('Erro ao listar OS do cliente:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    carregar();
    return () => {
      isMounted = false;
    };
  }, [activeClienteId]);

  // Atualizar mensagens quando uma OS for selecionada
  useEffect(() => {
    if (selectedOs) {
      setMensagensOS(obterMensagensPorOS(selectedOs.idLocal));
    }
  }, [selectedOs]);

  // Filtra as OS abertas (PENDENTE ou EM_ATENDIMENTO)
  const ordensAbertas = useMemo(() => {
    return ordens.filter(
      (os) => os.status.value === 'PENDENTE' || os.status.value === 'EM_ATENDIMENTO'
    );
  }, [ordens]);

  const ordensConcluidas = useMemo(() => {
    return ordens.filter((os) => os.status.value === 'CONCLUIDO');
  }, [ordens]);

  const handleAbrirChamado = async () => {
    if (!descricao.trim()) {
      Alert.alert('Descrição Obrigatória', 'Por favor descreva o problema enfrentado.');
      return;
    }

    setCriandoOS(true);
    try {
      const useCase = new AbrirOrdemServicoUseCase(sharedOsRepo, sharedClienteRepo);
      const novaOS = await useCase.execute({
        clienteId: activeClienteId,
        tipoProblema,
        descricao: descricao.trim(),
        latitude: coordenadasGps.latitude,
        longitude: coordenadasGps.longitude,
        foto: fotoAnexada
          ? {
              id: `foto-${Date.now()}`,
              fotoLocalPath: fotoCapturada?.uri || 'file:///storage/emulated/0/cjnet/onu.jpg',
              tamanhoKb: fotoCapturada?.tamanhoKb || 620,
            }
          : undefined,
      });

      setModalNovoChamado(false);
      setDescricao('');
      setFotoAnexada(false);
      setFotoCapturada(null);
      await carregarOrdens();

      if (onNovoChamadoSuccess) {
        onNovoChamadoSuccess(novaOS);
      } else {
        Alert.alert(
          'Chamado Aberto com Sucesso! 🎫',
          `Protocolo: #${novaOS.idLocal}\n\nSeu chamado foi registrado e já está na fila de atendimento da central CJnet.`
        );
      }
    } catch (err: unknown) {
      console.error('ERRO NO ABRIR CHAMADO:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao registrar chamado';
      Alert.alert('Erro', msg);
    } finally {
      setCriandoOS(false);
    }
  };

  const handleEnviarMensagem = () => {
    if (!selectedOs || !novaMensagem.trim()) return;
    const msg = enviarMensagemOS(
      selectedOs.idLocal,
      activeClienteId,
      activeClienteNome,
      'CLIENTE',
      novaMensagem.trim()
    );
    setMensagensOS((prev) => [...prev, msg]);
    setNovaMensagem('');
  };

  // Guarda de Acesso RBAC: Cliente não acessa técnico/admin e vice-versa
  if (role && role !== 'cliente') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDeniedCard}>
          <Ionicons name="shield-outline" size={56} color="#ef4444" />
          <Text style={styles.accessDeniedTitle}>Acesso Restrito ao Cliente</Text>
          <Text style={styles.accessDeniedDesc}>
            Seu usuário está autenticado com o perfil de {role === 'admin' ? 'Administrador (NOC)' : 'Técnico de Campo'}.
            Para sua segurança, cada perfil possui acesso exclusivo aos seus próprios módulos.
          </Text>
          <TouchableOpacity
            style={styles.accessDeniedButton}
            onPress={() => router.replace(role === 'admin' ? '/admin' : '/tecnico')}
            accessibilityLabel="Ir para o Painel Autorizado"
          >
            <Text style={styles.accessDeniedButtonText}>
              Ir para o Painel do {role === 'admin' ? 'Administrador' : 'Técnico'}
            </Text>
          </TouchableOpacity>
        </View>
        <AppNavBar currentTab="cliente" onSair={onSair} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={carregarOrdens}
            colors={['#0284c7']}
            tintColor="#0284c7"
          />
        }
      >
        {/* Topo / Boas-vindas do Cliente */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.badgeCliente}>
              <Ionicons name="person-circle" size={14} color="#0284c7" />
              <Text style={styles.badgeClienteText}>PORTAL DO CLIENTE</Text>
            </View>
            <View style={styles.statusOnline}>
              <View style={styles.pontoVerde} />
              <Text style={styles.statusOnlineText}>Conexão Ativa</Text>
            </View>
          </View>
          <Text style={styles.tituloHeader}>Olá, {activeClienteNome}</Text>
          <Text style={styles.subtituloHeader}>
            Acompanhe o andamento das suas solicitações ou abra um novo chamado técnico para a CJnet.
          </Text>

          {/* Botão de Ação Primária: Abrir Chamado */}
          <TouchableOpacity
            style={styles.btnAbrirChamado}
            onPress={() => setModalNovoChamado(true)}
            testID="btn-abrir-novo-chamado"
            accessibilityLabel="Abrir novo chamado de suporte"
          >
            <View style={styles.btnAbrirChamadoIcon}>
              <Ionicons name="add-circle" size={24} color="#ffffff" />
            </View>
            <View style={styles.btnAbrirChamadoTexts}>
              <Text style={styles.btnAbrirChamadoTitulo}>Abrir Novo Chamado</Text>
              <Text style={styles.btnAbrirChamadoDesc}>
                Relatar sem sinal, lentidão ou queda de fibra
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Seção 1: Ordens de Serviço ABERTAS (Foco Principal do Cliente) */}
        <View style={styles.secao}>
          <View style={styles.secaoHeader}>
            <Ionicons name="time-outline" size={20} color="#0284c7" />
            <Text style={styles.secaoTitulo}>Minhas OSs em Aberto ({ordensAbertas.length})</Text>
          </View>
          <Text style={styles.secaoSubtitulo}>
            Chamados aguardando análise ou já em atendimento pela equipe técnica
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={styles.loadingText}>Carregando suas ordens de serviço...</Text>
            </View>
          ) : ordensAbertas.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={42} color="#10b981" />
              <Text style={styles.emptyTitulo}>Nenhuma OS aberta no momento</Text>
              <Text style={styles.emptyDesc}>
                Sua conexão de fibra óptica está operando normalmente. Caso precise de suporte, toque em "Abrir Novo Chamado".
              </Text>
            </View>
          ) : (
            <View style={styles.listaOrdens}>
              {ordensAbertas.map((os) => {
                const tecInfo = getTecnicoInfo(os.tecnicoId);
                const isEmAtendimento = os.status.value === 'EM_ATENDIMENTO';

                return (
                  <TouchableOpacity
                    key={os.idLocal}
                    style={styles.cardOS}
                    testID={`card-os-cliente-${os.idLocal}`}
                    onPress={() => setSelectedOs(os)}
                    activeOpacity={0.8}
                  >
                    {/* Linha superior: Protocolo e Status */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.protocoloTag}>
                        <Text style={styles.protocoloTagText}>#{os.idLocal}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isEmAtendimento ? styles.statusEmAtendimento : styles.statusPendente,
                        ]}
                      >
                        <Ionicons
                          name={isEmAtendimento ? 'construct-outline' : 'time-outline'}
                          size={13}
                          color={isEmAtendimento ? '#0369a1' : '#b45309'}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isEmAtendimento ? '#0369a1' : '#b45309' },
                          ]}
                        >
                          {isEmAtendimento ? 'Em Atendimento' : 'Pendente'}
                        </Text>
                      </View>
                    </View>

                    {/* Tipo e Descrição */}
                    <Text style={styles.cardTipo}>{os.tipoProblema.label}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {os.descricao}
                    </Text>

                    {/* Destaque do Técnico que será atribuído */}
                    <View
                      style={[
                        styles.cardTecnicoBox,
                        tecInfo.atribuido ? styles.cardTecnicoAtribuido : styles.cardTecnicoAguardando,
                      ]}
                      testID={`tecnico-info-${os.idLocal}`}
                    >
                      <Ionicons
                        name={tecInfo.atribuido ? 'person-circle' : 'hourglass-outline'}
                        size={20}
                        color={tecInfo.atribuido ? '#0284c7' : '#b45309'}
                      />
                      <View style={styles.cardTecnicoTexts}>
                        <Text style={styles.cardTecnicoTitulo}>
                          {tecInfo.atribuido ? 'Técnico Responsável' : 'Status da Equipe'}
                        </Text>
                        <Text style={styles.cardTecnicoNome}>
                          {tecInfo.atribuido
                            ? `${tecInfo.nome} (${tecInfo.funcao})`
                            : 'Aguardando atribuição de técnico pela central'}
                        </Text>
                      </View>
                    </View>

                    {/* Rodapé do Card */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardData}>
                        Aberto em {new Date(os.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(os.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <View
                        style={styles.cardAcao}
                        testID={`btn-ver-detalhes-${os.idLocal}`}
                      >
                        <Text style={styles.cardAcaoText}>Ver Detalhes</Text>
                        <Ionicons name="arrow-forward" size={14} color="#0284c7" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Seção 2: Histórico de Concluídas (caso existam) */}
        {ordensConcluidas.length > 0 && (
          <View style={[styles.secao, { marginTop: 16 }]}>
            <View style={styles.secaoHeader}>
              <Ionicons name="archive-outline" size={20} color="#10b981" />
              <Text style={styles.secaoTitulo}>Chamados Concluídos ({ordensConcluidas.length})</Text>
            </View>

            <View style={styles.listaOrdens}>
              {ordensConcluidas.map((os) => (
                <TouchableOpacity
                  key={os.idLocal}
                  style={[styles.cardOS, { borderLeftColor: '#10b981' }]}
                  onPress={() => setSelectedOs(os)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.protocoloTagText}>#{os.idLocal}</Text>
                    <View style={[styles.statusBadge, styles.statusConcluido]}>
                      <Ionicons name="checkmark-circle" size={13} color="#15803d" />
                      <Text style={[styles.statusBadgeText, { color: '#15803d' }]}>Concluído</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTipo}>{os.tipoProblema.label}</Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>{os.descricao}</Text>
                  {os.parecerTecnico && (
                    <Text style={styles.cardParecer} numberOfLines={2}>
                      Laudo: {os.parecerTecnico}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal 1: Abrir Novo Chamado */}
      <Modal
        visible={modalNovoChamado}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalNovoChamado(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitulo}>Abrir Chamado Técnico</Text>
                <Text style={styles.modalSubtitulo}>Informe o problema para nossa equipe</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalNovoChamado(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              {/* Seleção do Tipo de Problema */}
              <Text style={styles.formLabel}>Qual o problema com sua conexão?</Text>
              <View style={styles.gridProblemas}>
                {OPCOES_PROBLEMA.map((item) => {
                  const selecionado = tipoProblema === item.valor;
                  return (
                    <TouchableOpacity
                      key={item.valor}
                      style={[
                        styles.itemProblema,
                        selecionado && { borderColor: item.cor, backgroundColor: '#f8fafc' },
                      ]}
                      onPress={() => setTipoProblema(item.valor)}
                    >
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={selecionado ? item.cor : '#64748b'}
                      />
                      <Text style={[styles.itemProblemaTitulo, selecionado && { color: item.cor }]}>
                        {item.titulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Descrição Detalhada */}
              <Text style={styles.formLabel}>Descreva detalhadamente o que ocorre:</Text>
              <TextInput
                style={styles.inputArea}
                placeholder="Ex: Desde as 14h a luz PON da ONU está piscando em vermelho e não há acesso à internet..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={descricao}
                onChangeText={setDescricao}
                testID="input-descricao-os"
              />

              {/* Anexo de Foto do Roteador / ONU (Autodiagnóstico) */}
              <Text style={styles.formLabel}>Foto do Roteador / ONU (Autodiagnóstico):</Text>
              <TouchableOpacity
                style={[styles.btnAnexarFoto, fotoAnexada && styles.btnAnexarFotoAtivo]}
                onPress={handleTirarFotoCelular}
                testID="btn-anexar-foto-roteador"
              >
                <Ionicons
                  name={fotoAnexada ? 'checkmark-circle' : 'camera-outline'}
                  size={20}
                  color={fotoAnexada ? '#10b981' : '#0284c7'}
                />
                <Text
                  style={[
                    styles.btnAnexarFotoText,
                    fotoAnexada && { color: '#10b981', fontWeight: '700' },
                  ]}
                >
                  {fotoAnexada
                    ? `Foto do Roteador Anexada (${fotoCapturada?.tamanhoKb || 620} KB)`
                    : 'Tirar Foto das Luzes do Roteador / ONU'}
                </Text>
              </TouchableOpacity>

              {/* Botão para Câmera Real do Celular */}
              <TouchableOpacity
                style={styles.btnCameraClienteReal}
                onPress={handleTirarFotoCelular}
                testID="btn-abrir-camera-cliente"
              >
                <Ionicons name="camera" size={16} color="#0284c7" />
                <Text style={styles.btnCameraClienteRealText}>
                  {fotoAnexada ? 'Fotografar Novamente com a Câmera do Celular' : 'Abrir Câmera do Celular'}
                </Text>
              </TouchableOpacity>

              {/* Miniatura da Foto Anexada com Badge de Corte e Compressão */}
              {fotoAnexada && fotoCapturada?.uri && (
                <View style={styles.previewFotoContainer}>
                  <Image source={{ uri: fotoCapturada.uri }} style={styles.previewFotoMini} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.previewFotoTitulo}>Foto Pronta para Envio ✂️</Text>
                    <Text style={styles.previewFotoSub}>
                      {fotoCapturada.tamanhoKb} KB • Cortada & Comprimida (RNF09 &lt;= 1 MB)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleTirarFotoCelular}
                    style={{ padding: 6, marginRight: 4 }}
                    testID="btn-recortar-foto-cliente"
                    accessibilityLabel="Recortar ou fotografar novamente"
                  >
                    <Ionicons name="crop" size={18} color="#0284c7" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRemoverFoto}
                    style={{ padding: 6 }}
                    testID="btn-remover-foto-cliente"
                    accessibilityLabel="Remover foto"
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Geolocalização GPS do Ponto de Atendimento com Mapa Visual */}
              <Text style={styles.formLabel}>Ponto de Atendimento (Localização no Mapa):</Text>
              <View style={styles.gpsCardCliente} testID="box-gps-cliente">
                <MapaVisualCobertura
                  latitude={coordenadasGps.latitude}
                  longitude={coordenadasGps.longitude}
                  coberto={coordenadasGps.coberto}
                  zonaAtendida={coordenadasGps.zonaAtendida}
                  mensagem={coordenadasGps.mensagem}
                  onChangeCoordenadas={({ latitude, longitude }) => {
                    const useCase = new VerificarCoberturaUseCase(sharedAreaRepo);
                    useCase.execute({ latitude, longitude }).then((res) => {
                      setCoordenadasGps({
                        latitude,
                        longitude,
                        coberto: res.coberto,
                        zonaAtendida: res.zonaAtendida,
                        precisao: 5,
                        status: 'OBTIDO',
                        mensagem: res.mensagem,
                      });
                    });
                  }}
                  onExpandirMapa={() => setModalMapaVisible(true)}
                  altura={200}
                />

                <View style={styles.gpsRowCliente}>
                  <TouchableOpacity
                    style={styles.btnGpsCliente}
                    onPress={handleObterGps}
                    testID="btn-obter-gps-cliente"
                  >
                    {coordenadasGps.status === 'BUSCANDO' ? (
                      <ActivityIndicator size="small" color="#0284c7" />
                    ) : (
                      <>
                        <Ionicons name="locate" size={14} color="#0284c7" />
                        <Text style={styles.btnGpsClienteText}>Atualizar Meu GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAbrirMapaCliente}
                    onPress={() => setModalMapaVisible(true)}
                    testID="btn-abrir-mapa-cliente"
                  >
                    <Ionicons name="expand" size={14} color="#0284c7" />
                    <Text style={styles.btnAbrirMapaClienteText}>Expandir Mapa ⛶</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.gpsSubCliente}>
                  Ponto de atendimento georreferenciado e vinculado ao chamado para deslocamento do técnico.
                </Text>
              </View>

              {/* Botão de Enviar */}
              <TouchableOpacity
                style={[styles.btnConfirmarAbertura, criandoOS && { opacity: 0.6 }]}
                onPress={handleAbrirChamado}
                disabled={criandoOS}
                testID="btn-confirmar-abrir-os"
              >
                {criandoOS ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={20} color="#ffffff" />
                    <Text style={styles.btnConfirmarAberturaText}>Enviar Chamado</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Detalhes da OS do Cliente & Verificação do Técnico */}
      <Modal
        visible={!!selectedOs}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedOs(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOs && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitulo}>Ordem de Serviço #{selectedOs.idLocal}</Text>
                    <Text style={styles.modalSubtitulo}>{selectedOs.tipoProblema.label}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedOs(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
                  {/* Status do Técnico Atribuído */}
                  {(() => {
                    const tecInfo = getTecnicoInfo(selectedOs.tecnicoId);
                    return (
                      <View
                        style={[
                          styles.detalheTecnicoCard,
                          tecInfo.atribuido ? styles.detalheTecnicoAtribuido : styles.detalheTecnicoPendente,
                        ]}
                        testID="modal-tecnico-detalhes"
                      >
                        <Ionicons
                          name={tecInfo.atribuido ? 'shield-checkmark' : 'alert-circle'}
                          size={24}
                          color={tecInfo.atribuido ? '#0284c7' : '#b45309'}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.detalheTecnicoRotulo}>
                            {tecInfo.atribuido ? 'TÉCNICO ATRIBUÍDO' : 'AGUARDANDO ATRIBUIÇÃO'}
                          </Text>
                          <Text style={styles.detalheTecnicoNomePrincipal}>{tecInfo.nome}</Text>
                          <Text style={styles.detalheTecnicoSub}>{tecInfo.funcao}</Text>
                          <Text style={styles.detalheTecnicoContato}>Contato: {tecInfo.telefone}</Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Relato do Problema */}
                  <View style={styles.blocoDetalhe}>
                    <Text style={styles.blocoDetalheTitulo}>Descrição Relatada:</Text>
                    <Text style={styles.blocoDetalheTexto}>{selectedOs.descricao}</Text>
                  </View>

                  {/* Localização GPS do Chamado */}
                  {selectedOs.coordenadas && (
                    <View style={styles.blocoDetalhe}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="location" size={16} color="#0284c7" />
                        <Text style={styles.blocoDetalheTitulo}>Localização do Atendimento (GPS):</Text>
                      </View>
                      <Text style={styles.blocoDetalheTexto}>
                        Lat: {selectedOs.coordenadas.latitude.toFixed(4)} | Lng: {selectedOs.coordenadas.longitude.toFixed(4)} • Coqueiral/MG
                      </Text>
                    </View>
                  )}

                  {/* Fotos Registradas na Ordem de Serviço */}
                  {selectedOs.fotos && selectedOs.fotos.length > 0 && (
                    <View style={styles.blocoDetalhe}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Ionicons name="images" size={16} color="#0284c7" />
                        <Text style={styles.blocoDetalheTitulo}>
                          Fotos Registradas na OS ({selectedOs.fotos.length}):
                        </Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {selectedOs.fotos.map((f) => (
                          <View key={f.id} style={styles.fotoThumbCard}>
                            <Image
                              source={{ uri: f.fotoLocalPath }}
                              style={styles.fotoThumbImage}
                              resizeMode="cover"
                            />
                            <Text style={styles.fotoThumbTipo}>
                              {f.tipo === 'CLIENTE_ROTEADOR' ? 'Foto da ONU' : 'Foto do Reparo'}
                            </Text>
                            <Text style={styles.fotoThumbKb}>{f.tamanhoKb} KB</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Se houver laudo de fechamento */}
                  {selectedOs.parecerTecnico && (
                    <View style={[styles.blocoDetalhe, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                      <Text style={[styles.blocoDetalheTitulo, { color: '#15803d' }]}>
                        Resolução & Parecer Técnico:
                      </Text>
                      <Text style={[styles.blocoDetalheTexto, { color: '#166534' }]}>
                        {selectedOs.parecerTecnico}
                      </Text>
                    </View>
                  )}

                  {/* Chat / Mensagens com a Central CJnet */}
                  <View style={styles.chatSecao}>
                    <Text style={styles.blocoDetalheTitulo}>
                      Conversa com a Central CJnet ({mensagensOS.length})
                    </Text>
                    {mensagensOS.length === 0 ? (
                      <Text style={styles.chatVazioText}>
                        Ainda não há mensagens nesta ordem de serviço.
                      </Text>
                    ) : (
                      <View style={styles.chatLista}>
                        {mensagensOS.map((msg) => {
                          const isMinha = msg.remetenteId === activeClienteId;
                          return (
                            <View
                              key={msg.id}
                              style={[
                                styles.chatBolha,
                                isMinha ? styles.chatBolhaCliente : styles.chatBolhaAdmin,
                              ]}
                            >
                              <Text style={styles.chatAutor}>
                                {msg.remetenteNome} ({msg.papel})
                              </Text>
                              <Text style={styles.chatTexto}>{msg.texto}</Text>
                              <Text style={styles.chatHora}>
                                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Enviar Mensagem para a Central */}
                    <View style={styles.chatInputRow}>
                      <TextInput
                        style={styles.chatInput}
                        placeholder="Enviar mensagem para a central..."
                        placeholderTextColor="#94a3b8"
                        value={novaMensagem}
                        onChangeText={setNovaMensagem}
                        testID="input-mensagem-cliente"
                      />
                      <TouchableOpacity
                        style={styles.btnChatEnviar}
                        onPress={handleEnviarMensagem}
                        testID="btn-enviar-mensagem-cliente"
                      >
                        <Ionicons name="send" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Câmera Nativa Expo v57 */}
      <CameraCaptureModal
        visible={modalCameraVisible}
        onClose={() => setModalCameraVisible(false)}
        onCapture={handleFotoCapturada}
        titulo="Foto do Roteador / ONU"
        subtitulo="Fotografe as luzes PON e LOS do equipamento"
        fallbackFilename="onu.jpg"
        fallbackTamanhoKb={620}
      />

      {/* Modal de Mapa e Disponibilidade Técnica CJnet */}
      <MapaDisponibilidadeModal
        visible={modalMapaVisible}
        onClose={() => setModalMapaVisible(false)}
        initialLatitude={coordenadasGps.latitude}
        initialLongitude={coordenadasGps.longitude}
        onConfirmar={handleConfirmarPontoMapa}
        titulo="Localização do Ponto de Atendimento"
      />

      {/* Barra de Navegação Inferior */}
      <AppNavBar currentTab="cliente" onSair={onSair} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeClienteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  statusOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pontoVerde: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusOnlineText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  tituloHeader: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  subtituloHeader: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  btnAbrirChamado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnAbrirChamadoIcon: {
    marginRight: 12,
  },
  btnAbrirChamadoTexts: {
    flex: 1,
  },
  btnAbrirChamadoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnAbrirChamadoDesc: {
    fontSize: 12,
    color: '#e0f2fe',
    marginTop: 2,
  },
  secao: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secaoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  secaoSubtitulo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 13,
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  listaOrdens: {
    gap: 12,
  },
  cardOS: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocoloTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  protocoloTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusPendente: {
    backgroundColor: '#fef3c7',
  },
  statusEmAtendimento: {
    backgroundColor: '#e0f2fe',
  },
  statusConcluido: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTipo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  cardTecnicoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  cardTecnicoAtribuido: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  cardTecnicoAguardando: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  cardTecnicoTexts: {
    marginLeft: 8,
    flex: 1,
  },
  cardTecnicoTitulo: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  cardTecnicoNome: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardData: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAcaoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  cardParecer: {
    fontSize: 12,
    color: '#166534',
    backgroundColor: '#dcfce7',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitulo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 8,
  },
  gridProblemas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemProblema: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  itemProblemaTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },
  inputArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  btnAnexarFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    backgroundColor: '#f0f9ff',
  },
  btnAnexarFotoAtivo: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  btnAnexarFotoText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '600',
  },
  btnConfirmarAbertura: {
    backgroundColor: '#0284c7',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  btnConfirmarAberturaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  detalheTecnicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  detalheTecnicoAtribuido: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  detalheTecnicoPendente: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  detalheTecnicoRotulo: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  detalheTecnicoNomePrincipal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  detalheTecnicoSub: {
    fontSize: 12,
    color: '#475569',
  },
  detalheTecnicoContato: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 2,
  },
  blocoDetalhe: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  blocoDetalheTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  blocoDetalheTexto: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
  },
  chatSecao: {
    marginTop: 10,
    marginBottom: 20,
  },
  chatVazioText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  chatLista: {
    gap: 8,
    marginVertical: 10,
  },
  chatBolha: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '85%',
  },
  chatBolhaCliente: {
    alignSelf: 'flex-end',
    backgroundColor: '#e0f2fe',
    borderBottomRightRadius: 2,
  },
  chatBolhaAdmin: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 2,
  },
  chatAutor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  chatTexto: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 17,
  },
  chatHora: {
    fontSize: 9,
    color: '#94a3b8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  btnChatEnviar: {
    backgroundColor: '#0284c7',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCameraClienteReal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 8,
    gap: 6,
  },
  btnCameraClienteRealText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  previewFotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewFotoMini: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  previewFotoTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  previewFotoSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  gpsCardCliente: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  gpsRowCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsCoordenadasClienteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  btnGpsCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  btnGpsClienteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  gpsSubCliente: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  fotoThumbCard: {
    width: 110,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  fotoThumbImage: {
    width: 98,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    marginBottom: 6,
  },
  fotoThumbTipo: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  fotoThumbKb: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  accessDeniedCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f8fafc',
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  accessDeniedButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  accessDeniedButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* Estilos do Mapa na Aba Cliente */
  btnAbrirMapaCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 6,
  },
  btnAbrirMapaClienteText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '700',
  },
});
