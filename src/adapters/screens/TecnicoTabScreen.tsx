/**
 * TecnicoTabScreen.tsx
 * --------------------
 * Camada de Adaptadores de Interface (UI): Aba do Técnico de Campo.
 *
 * Requisito:
 * "Na aba tecnico ele visualiza a OS que foi atribuida, fecha OS e tira foto da resolução do problema"
 *
 * Funcionalidades:
 *  - Visualização das Ordens de Serviço atribuídas ao técnico.
 *  - Verificação de detalhes do chamado de campo (cliente, problema, protocolo).
 *  - Encerramento / fechamento da OS com parecer técnico obrigatório.
 *  - Captura e anexo de foto comprovando a resolução do problema (RNF09 <= 1MB).
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { sharedOsRepo, sharedClienteRepo } from './mockStore';
import { ConcluirAtendimentoUseCase } from '@/application/use-cases';
import { useAuth } from '@/adapters/context/AuthContext';
import { AppNavBar } from './components/AppNavBar';
import { CameraCaptureModal, CapturedPhoto } from '@/adapters/components/CameraCaptureModal';
import { CameraDeviceService } from '@/infra/device/CameraDeviceService';

export interface TecnicoTabScreenProps {
  tecnicoId?: string;
  initialParecer?: string;
  initialFotoResolucao?: boolean;
  onConcluirOSSuccess?: (os: OrdemServico) => void;
  onSair?: () => void;
}

export function TecnicoTabScreen({
  tecnicoId = 'tec-joao-01',
  initialParecer,
  initialFotoResolucao,
  onConcluirOSSuccess,
  onSair,
}: TecnicoTabScreenProps) {
  const { user, role } = useAuth();
  const activeTecnicoId = user?.id?.startsWith('tec-') ? user.id : tecnicoId;
  const activeTecnicoNome = user?.name || 'João Santos';

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOs, setSelectedOs] = useState<OrdemServico | null>(null);

  // Modal de Fechamento de OS
  const [modalFecharOS, setModalFecharOS] = useState<boolean>(false);
  const [osParaFechar, setOsParaFechar] = useState<OrdemServico | null>(null);
  const [parecerTecnico, setParecerTecnico] = useState<string>(initialParecer ?? '');
  const [fotoResolucao, setFotoResolucao] = useState<{
    anexada: boolean;
    caminho: string;
    tamanhoKb: number;
  }>({
    anexada: initialFotoResolucao ?? false,
    caminho: initialFotoResolucao ? 'file:///storage/emulated/0/cjnet/reparo-fibra-cto04.jpg' : '',
    tamanhoKb: initialFotoResolucao ? 450 : 0,
  });
  const [modalCameraVisible, setModalCameraVisible] = useState<boolean>(false);
  const [concluindo, setConcluindo] = useState<boolean>(false);

  const handleFotoCapturada = (photo: CapturedPhoto) => {
    setFotoResolucao({
      anexada: true,
      caminho: photo.uri,
      tamanhoKb: photo.tamanhoKb,
    });
  };

  const carregarOrdensTecnico = useCallback(async () => {
    setLoading(true);
    try {
      const todas = await sharedOsRepo.listarTodas();
      const atribuidas = todas.filter(
        (os) => os.tecnicoId === activeTecnicoId || (os.status.value === 'EM_ATENDIMENTO' && !os.tecnicoId)
      );
      setOrdens(atribuidas);
    } catch (err: unknown) {
      console.error('Erro ao listar OS do técnico:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTecnicoId]);

  useEffect(() => {
    let isMounted = true;
    const carregar = async () => {
      setLoading(true);
      try {
        const todas = await sharedOsRepo.listarTodas();
        const atribuidas = todas.filter(
          (os) => os.tecnicoId === activeTecnicoId || (os.status.value === 'EM_ATENDIMENTO' && !os.tecnicoId)
        );
        if (isMounted) {
          setOrdens(atribuidas);
        }
      } catch (err: unknown) {
        if (isMounted) console.error('Erro ao listar OS do técnico:', err);
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
  }, [activeTecnicoId]);

  // Separação entre OSs abertas (para atender/fechar) e concluídas
  const osAbertas = useMemo(() => {
    return ordens.filter((os) => os.status.value !== 'CONCLUIDO');
  }, [ordens]);

  const osConcluidas = useMemo(() => {
    return ordens.filter((os) => os.status.value === 'CONCLUIDO');
  }, [ordens]);

  const abrirModalFechamento = (os: OrdemServico) => {
    setOsParaFechar(os);
    if (!initialParecer) setParecerTecnico('');
    if (!initialFotoResolucao) setFotoResolucao({ anexada: false, caminho: '', tamanhoKb: 0 });
    setModalFecharOS(true);
  };

  const handleTirarFotoCelular = async () => {
    const res = await CameraDeviceService.abrirCameraCelular();
    if (res.sucesso && res.uri) {
      setFotoResolucao({
        anexada: true,
        caminho: res.uri,
        tamanhoKb: res.tamanhoKb || 450,
      });
    }
  };

  const handleConfirmarFechamento = async () => {
    if (!osParaFechar) return;

    if (!parecerTecnico.trim() || parecerTecnico.trim().length < 5) {
      Alert.alert(
        'Parecer Obrigatório',
        'Por favor descreva o parecer técnico da resolução (mínimo de 5 caracteres).'
      );
      return;
    }

    if (!fotoResolucao.anexada) {
      Alert.alert(
        'Foto da Resolução Necessária',
        'Por favor tire uma foto comprovando a resolução do problema antes de fechar a OS.'
      );
      return;
    }

    setConcluindo(true);
    try {
      const useCase = new ConcluirAtendimentoUseCase(sharedOsRepo, sharedClienteRepo);
      const osConcluida = await useCase.execute({
        idLocal: osParaFechar.idLocal,
        tecnicoId: activeTecnicoId,
        parecerTecnico: parecerTecnico.trim(),
        foto: {
          id: `foto-rep-${Date.now()}`,
          fotoLocalPath: fotoResolucao.caminho,
          tamanhoKb: fotoResolucao.tamanhoKb,
        },
      });

      setModalFecharOS(false);
      setOsParaFechar(null);
      await carregarOrdensTecnico();

      if (onConcluirOSSuccess) {
        onConcluirOSSuccess(osConcluida);
      } else {
        Alert.alert(
          'OS Fechada com Sucesso! 🔧✅',
          `Ordem de Serviço #${osConcluida.idLocal} foi concluída com laudo técnico e foto anexada.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao encerrar chamado';
      Alert.alert('Erro ao Fechar OS', msg);
    } finally {
      setConcluindo(false);
    }
  };

  // Guarda de Acesso RBAC: Técnico não acessa cliente/admin e vice-versa
  if (role && role !== 'tecnico') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDeniedCard}>
          <Ionicons name="shield-outline" size={56} color="#ef4444" />
          <Text style={styles.accessDeniedTitle}>Acesso Restrito a Técnicos</Text>
          <Text style={styles.accessDeniedDesc}>
            Seu usuário está autenticado com o perfil de {role === 'admin' ? 'Administrador (NOC)' : 'Cliente'}.
            Este painel é de uso exclusivo da equipe técnica de campo da CJnet.
          </Text>
          <TouchableOpacity
            style={styles.accessDeniedButton}
            onPress={() => router.replace(role === 'admin' ? '/admin' : '/cliente')}
            accessibilityLabel="Ir para o Painel Autorizado"
          >
            <Text style={styles.accessDeniedButtonText}>
              Ir para o Painel do {role === 'admin' ? 'Administrador' : 'Cliente'}
            </Text>
          </TouchableOpacity>
        </View>
        <AppNavBar currentTab="tecnico" onSair={onSair} />
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
            onRefresh={carregarOrdensTecnico}
            colors={['#0284c7']}
            tintColor="#0284c7"
          />
        }
      >
        {/* Topo do Técnico */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.badgeTecnico}>
              <Ionicons name="construct" size={14} color="#0369a1" />
              <Text style={styles.badgeTecnicoText}>PAINEL DO TÉCNICO DE CAMPO</Text>
            </View>
            <View style={styles.badgeEmRota}>
              <Ionicons name="radio" size={12} color="#16a34a" />
              <Text style={styles.badgeEmRotaText}>Disponível para Rota</Text>
            </View>
          </View>
          <Text style={styles.tituloHeader}>{activeTecnicoNome}</Text>
          <Text style={styles.subtituloHeader}>
            Gerencie as Ordens de Serviço atribuídas ao seu turno, registre a solução e anexe a foto da resolução.
          </Text>

          {/* Cards de Métricas Rápidas */}
          <View style={styles.metricasRow}>
            <View style={[styles.metricaCard, { backgroundColor: '#e0f2fe' }]}>
              <Text style={[styles.metricaValor, { color: '#0369a1' }]}>{osAbertas.length}</Text>
              <Text style={styles.metricaLabel}>Atribuídas Abertas</Text>
            </View>
            <View style={[styles.metricaCard, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.metricaValor, { color: '#15803d' }]}>{osConcluidas.length}</Text>
              <Text style={styles.metricaLabel}>OSs Concluídas</Text>
            </View>
          </View>
        </View>

        {/* Lista de OSs Atribuídas ABERTAS (Foco Principal do Técnico) */}
        <View style={styles.secao}>
          <View style={styles.secaoHeader}>
            <Ionicons name="clipboard-outline" size={20} color="#0284c7" />
            <Text style={styles.secaoTitulo}>OSs Atribuídas para Execução ({osAbertas.length})</Text>
          </View>
          <Text style={styles.secaoSubtitulo}>
            Ordens de serviço sob sua responsabilidade para visita de campo e reparo
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={styles.loadingText}>Carregando chamados atribuídos...</Text>
            </View>
          ) : osAbertas.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color="#10b981" />
              <Text style={styles.emptyTitulo}>Nenhuma OS atribuída pendente</Text>
              <Text style={styles.emptyDesc}>
                Você não possui ordens de serviço pendentes no momento. Novas atribuições pela central aparecerão aqui.
              </Text>
            </View>
          ) : (
            <View style={styles.listaOrdens}>
              {osAbertas.map((os) => {
                return (
                  <View
                    key={os.idLocal}
                    style={styles.cardOS}
                    testID={`card-os-tecnico-${os.idLocal}`}
                  >
                    {/* Linha superior: Protocolo e Status */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.protocoloTag}>
                        <Text style={styles.protocoloTagText}>#{os.idLocal}</Text>
                      </View>
                      <View style={styles.statusEmAtendimento}>
                        <Ionicons name="construct-outline" size={13} color="#0369a1" />
                        <Text style={styles.statusEmAtendimentoText}>Atribuída / Em Curso</Text>
                      </View>
                    </View>

                    {/* Dados do Chamado */}
                    <Text style={styles.cardTipo}>{os.tipoProblema.label}</Text>
                    <Text style={styles.cardDesc}>{os.descricao}</Text>

                    {/* Localização / Cliente */}
                    <View style={styles.infoClienteBox}>
                      <Ionicons name="location-outline" size={16} color="#64748b" />
                      <Text style={styles.infoClienteText}>
                        Cliente: Carlos Eduardo Silva • Coqueiral/MG
                        {os.coordenadas
                          ? ` (Lat: ${os.coordenadas.latitude.toFixed(4)}, Lng: ${os.coordenadas.longitude.toFixed(4)})`
                          : ''}
                      </Text>
                    </View>

                    {/* Badge de Fotos do Cliente (se houver) */}
                    {os.fotos && os.fotos.length > 0 && (
                      <View style={styles.badgeFotosCliente}>
                        <Ionicons name="image-outline" size={14} color="#0284c7" />
                        <Text style={styles.badgeFotosClienteText}>
                          {os.fotos.length} foto(s) do roteador anexada(s) pelo cliente
                        </Text>
                      </View>
                    )}

                    {/* Ação: Fechar OS e Tirar Foto da Resolução */}
                    <View style={styles.acoesContainer}>
                      <TouchableOpacity
                        style={styles.btnFecharOS}
                        onPress={() => abrirModalFechamento(os)}
                        testID={`btn-fechar-os-${os.idLocal}`}
                        accessibilityLabel="Fechar Ordem de Serviço e Tirar Foto"
                      >
                        <Ionicons name="camera-outline" size={18} color="#ffffff" />
                        <Text style={styles.btnFecharOSText}>Fechar OS & Tirar Foto</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Lista de OSs Já Concluídas pelo Técnico */}
        {osConcluidas.length > 0 && (
          <View style={[styles.secao, { marginTop: 20 }]}>
            <View style={styles.secaoHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#15803d" />
              <Text style={styles.secaoTitulo}>OSs Concluídas por Você ({osConcluidas.length})</Text>
            </View>
            <View style={styles.listaOrdens}>
              {osConcluidas.map((os) => (
                <View key={os.idLocal} style={[styles.cardOS, { borderLeftColor: '#10b981' }]}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.protocoloTagText}>#{os.idLocal}</Text>
                    <View style={styles.statusConcluido}>
                      <Ionicons name="checkmark-circle" size={13} color="#15803d" />
                      <Text style={styles.statusConcluidoText}>Concluída</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTipo}>{os.tipoProblema.label}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{os.descricao}</Text>
                  {os.parecerTecnico && (
                    <View style={styles.parecerBox}>
                      <Text style={styles.parecerTitulo}>Laudo Técnico de Resolução:</Text>
                      <Text style={styles.parecerTexto}>{os.parecerTecnico}</Text>
                    </View>
                  )}
                  {os.fotos && os.fotos.length > 0 && (
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="images-outline" size={14} color="#10b981" />
                      <Text style={{ fontSize: 11, color: '#047857', fontWeight: '600' }}>
                        {os.fotos.length} foto(s) arquivada(s) com sucesso na OS
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: Fechar OS & Tirar Foto da Resolução do Problema */}
      <Modal
        visible={modalFecharOS}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalFecharOS(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {osParaFechar && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitulo}>Concluir OS #{osParaFechar.idLocal}</Text>
                    <Text style={styles.modalSubtitulo}>{osParaFechar.tipoProblema.label}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalFecharOS(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
                  {/* Descrição do Problema Relatado */}
                  <View style={styles.blocoProblema}>
                    <Text style={styles.blocoProblemaTitulo}>Problema a Resolver:</Text>
                    <Text style={styles.blocoProblemaTexto}>{osParaFechar.descricao}</Text>
                  </View>

                  {/* Foto prévia do cliente (autodiagnóstico da ONU) */}
                  {osParaFechar.fotos && osParaFechar.fotos.length > 0 && (
                    <View style={styles.blocoProblema}>
                      <Text style={styles.blocoProblemaTitulo}>Foto Anexada pelo Cliente:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 }}>
                        <Image
                          source={{ uri: osParaFechar.fotos[0].fotoLocalPath }}
                          style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: '#0f172a' }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                            Luzes da ONU / Roteador
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {osParaFechar.fotos[0].tamanhoKb} KB • Enviada no chamado
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* 1. Tirar Foto da Resolução do Problema (Requisito Explícito) */}
                  <Text style={styles.formLabel}>
                    1. Foto da Resolução do Problema (Obrigatório):
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.btnCapturaFoto,
                      fotoResolucao.anexada && styles.btnCapturaFotoSucesso,
                    ]}
                    onPress={handleTirarFotoCelular}
                    testID="btn-tirar-foto-resolucao"
                  >
                    <Ionicons
                      name={fotoResolucao.anexada ? 'checkmark-circle' : 'camera'}
                      size={24}
                      color={fotoResolucao.anexada ? '#10b981' : '#0284c7'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.btnCapturaFotoTitulo,
                          fotoResolucao.anexada && { color: '#10b981' },
                        ]}
                      >
                        {fotoResolucao.anexada
                          ? 'Foto da Resolução Anexada! 📸'
                          : 'Tirar Foto da Resolução / Reparo'}
                      </Text>
                      <Text style={styles.btnCapturaFotoSub}>
                        {fotoResolucao.anexada
                          ? `reparo-fibra-cto04.jpg (${fotoResolucao.tamanhoKb} KB <= 1MB)`
                          : 'Abra a câmera do dispositivo para fotografar o conserto'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Botão Câmera Real do Celular para o Técnico */}
                  <TouchableOpacity
                    style={styles.btnCameraTecnicoReal}
                    onPress={() => setModalCameraVisible(true)}
                    testID="btn-abrir-camera-tecnico"
                  >
                    <Ionicons name="camera" size={16} color="#0284c7" />
                    <Text style={styles.btnCameraTecnicoRealText}>
                      {fotoResolucao.anexada ? 'Fotografar Novamente com a Câmera' : 'Abrir Câmera do Dispositivo'}
                    </Text>
                  </TouchableOpacity>

                  {/* Preview da Foto de Resolução Anexada */}
                  {fotoResolucao.anexada && fotoResolucao.caminho && (
                    <View style={styles.previewFotoReparoContainer}>
                      <Image
                        source={{ uri: fotoResolucao.caminho }}
                        style={styles.previewFotoReparo}
                        resizeMode="cover"
                      />
                      <View style={styles.previewFotoReparoBadge}>
                        <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                        <Text style={styles.previewFotoReparoBadgeText}>
                          Comprovante de Reparo • {fotoResolucao.tamanhoKb} KB
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 2. Parecer Técnico da Resolução */}
                  <Text style={styles.formLabel}>2. Parecer Técnico da Solução:</Text>
                  <TextInput
                    style={styles.inputParecer}
                    placeholder="Descreva a ação realizada (ex: Conector óptico na CTO refeito, potência em -19.4 dBm, navegação normalizada)..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                    value={parecerTecnico}
                    onChangeText={setParecerTecnico}
                    testID="input-parecer-tecnico"
                  />

                  {/* Botão de Confirmação */}
                  <TouchableOpacity
                    style={[
                      styles.btnConfirmarFechamento,
                      (!fotoResolucao.anexada || parecerTecnico.trim().length < 5 || concluindo) && {
                        opacity: 0.6,
                      },
                    ]}
                    onPress={handleConfirmarFechamento}
                    disabled={concluindo || !fotoResolucao.anexada || parecerTecnico.trim().length < 5}
                    testID="btn-confirmar-fechamento-os"
                  >
                    {concluindo ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                        <Text style={styles.btnConfirmarFechamentoText}>
                          Fechar Ordem de Serviço
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
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
        titulo="Foto da Resolução do Problema"
        subtitulo="Fotografe o conector óptico ou equipamento consertado"
        fallbackFilename="reparo-fibra-cto04.jpg"
        fallbackTamanhoKb={450}
      />

      {/* Barra de Navegação Inferior */}
      <AppNavBar currentTab="tecnico" onSair={onSair} />
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
  badgeTecnico: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeTecnicoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  badgeEmRota: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeEmRotaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
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
  metricasRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metricaCard: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricaValor: {
    fontSize: 24,
    fontWeight: '800',
  },
  metricaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
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
  statusEmAtendimento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusEmAtendimentoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  statusConcluido: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusConcluidoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  cardTipo: {
    fontSize: 16,
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
  infoClienteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  infoClienteText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  acoesContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnFecharOS: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  btnFecharOSText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  parecerBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  parecerTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  parecerTexto: {
    fontSize: 12,
    color: '#15803d',
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
    maxHeight: '88%',
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
  blocoProblema: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  blocoProblemaTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  blocoProblemaTexto: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 6,
  },
  btnCapturaFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f0f9ff',
    marginBottom: 16,
  },
  btnCapturaFotoSucesso: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
    borderStyle: 'solid',
  },
  btnCapturaFotoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
  },
  btnCapturaFotoSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  inputParecer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  btnConfirmarFechamento: {
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  btnConfirmarFechamentoText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  badgeFotosCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignSelf: 'flex-start',
  },
  badgeFotosClienteText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  btnCameraTecnicoReal: {
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
  btnCameraTecnicoRealText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  previewFotoReparoContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 120,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  previewFotoReparo: {
    width: '100%',
    height: '100%',
  },
  previewFotoReparoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  previewFotoReparoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
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
});
