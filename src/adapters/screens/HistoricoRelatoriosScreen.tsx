/**
 * HistoricoRelatoriosScreen.tsx
 * -----------------------------
 * Camada de Adaptadores de Interface (UI): Tela de Histórico de Chamados
 * e Relatórios de Ordens de Serviço (OS).
 *
 * Atende aos requisitos:
 *  - UC06: Acompanhar Status e Histórico de OSs
 *  - RF07: Consulta ao histórico e status em tempo real de chamados
 *  - RF15: Indicadores e relatórios resumidos por status
 *  - Layout construído com <View>, <Text>, <TouchableOpacity>, <ScrollView>
 *  - Estilização exclusiva via StyleSheet e Flexbox (com flexDirection: 'column' como padrão)
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { sharedOsRepo, sharedClienteRepo, DEMO_CLIENTE_ID } from './mockStore';
import { ListarOrdensServicoUseCase } from '@/application/use-cases';
import { useAuth } from '@/adapters/context/AuthContext';
import { AppNavBar } from './components/AppNavBar';

export interface HistoricoRelatoriosScreenProps {
  usuarioId?: string;
  onNovoChamado?: () => void;
  onVoltar?: () => void;
  onSair?: () => void;
}

type StatusFiltro = 'TODOS' | 'PENDENTE' | 'EM_ATENDIMENTO' | 'CONCLUIDO';

export const TECNICOS_INFO: Record<string, { nome: string; telefone: string; funcao: string }> = {
  'tec-joao-01': {
    nome: 'João Santos',
    telefone: '(35) 99811-2233',
    funcao: 'Técnico de Campo - Fibra Óptica',
  },
  'tec-marcos-02': {
    nome: 'Marcos Oliveira',
    telefone: '(35) 99744-5566',
    funcao: 'Especialista em Redes & Fusão Óptica',
  },
};

export function getTecnicoInfo(tecnicoId?: string | null) {
  if (!tecnicoId) {
    return {
      nome: 'Aguardando Atribuição',
      telefone: '(35) 3855-1234 (Central CJnet)',
      funcao: 'Fila de atendimento de campo',
      atribuido: false,
    };
  }
  const tec = TECNICOS_INFO[tecnicoId];
  return {
    nome: tec?.nome ?? `Técnico #${tecnicoId}`,
    telefone: tec?.telefone ?? '(35) 3855-1234',
    funcao: tec?.funcao ?? 'Técnico de Campo Especializado',
    atribuido: true,
  };
}

export function HistoricoRelatoriosScreen({
  usuarioId = DEMO_CLIENTE_ID,
  onNovoChamado,
  onVoltar,
  onSair,
}: HistoricoRelatoriosScreenProps) {
  const { user, role, signOut } = useAuth();
  const activeUsuarioId = user?.id || usuarioId;
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtro, setFiltro] = useState<StatusFiltro>('TODOS');
  const [selectedOs, setSelectedOs] = useState<OrdemServico | null>(null);

  const carregarOrdens = async () => {
    setLoading(true);
    try {
      const useCase = new ListarOrdensServicoUseCase(sharedOsRepo, sharedClienteRepo);
      const resultado = await useCase.execute({ usuarioId: activeUsuarioId });
      setOrdens(resultado);
    } catch (err: unknown) {
      console.error('Erro ao listar chamados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, [activeUsuarioId]);

  // Métricas do Relatório
  const relatorio = useMemo(() => {
    const total = ordens.length;
    const pendentes = ordens.filter((os) => os.status.value === 'PENDENTE').length;
    const emAtendimento = ordens.filter((os) => os.status.value === 'EM_ATENDIMENTO').length;
    const concluidos = ordens.filter((os) => os.status.value === 'CONCLUIDO').length;
    return { total, pendentes, emAtendimento, concluidos };
  }, [ordens]);

  // Lista filtrada
  const ordensFiltradas = useMemo(() => {
    if (filtro === 'TODOS') return ordens;
    return ordens.filter((os) => os.status.value === filtro);
  }, [ordens, filtro]);

  const handleNovoChamado = () => {
    if (onNovoChamado) {
      onNovoChamado();
    } else {
      router.push('/atividades' as any);
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

  const getStatusBadgeStyle = (statusValor: string) => {
    switch (statusValor) {
      case 'PENDENTE':
        return {
          badge: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
          text: { color: '#b45309' },
          label: 'Pendente',
          icon: 'time-outline' as const,
        };
      case 'EM_ATENDIMENTO':
        return {
          badge: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
          text: { color: '#0369a1' },
          label: 'Em Atendimento',
          icon: 'construct-outline' as const,
        };
      case 'CONCLUIDO':
        return {
          badge: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
          text: { color: '#15803d' },
          label: 'Concluído',
          icon: 'checkmark-circle-outline' as const,
        };
      default:
        return {
          badge: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
          text: { color: '#64748b' },
          label: statusValor,
          icon: 'ellipse-outline' as const,
        };
    }
  };

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

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={styles.btnNovoChamado}
                onPress={handleNovoChamado}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.btnNovoChamadoText}>Abrir OS</Text>
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
          </View>

          <View style={styles.headerTexts}>
            <View style={styles.clientRoleRow}>
              <Ionicons
                name={role === 'tecnico' ? 'construct-outline' : role === 'admin' ? 'shield-checkmark-outline' : 'person-circle-outline'}
                size={14}
                color="#0284c7"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.badgeTop}>
                {role === 'tecnico'
                  ? 'PAINEL DO TÉCNICO'
                  : role === 'admin'
                  ? 'GESTÃO ADMINISTRATIVA'
                  : `ÁREA DO CLIENTE • ${user?.name ? user.name.toUpperCase() : 'MEUS CHAMADOS'}`}
              </Text>
            </View>
            <Text style={styles.headerTitle}>Histórico & Relatórios</Text>
            <Text style={styles.headerSubtitle}>
              {role === 'tecnico'
                ? 'Ordens de serviço sob sua responsabilidade técnica de campo'
                : role === 'admin'
                ? 'Painel geral de monitoramento e despacho de ordens da CJnet'
                : 'Acompanhe as OSs abertas por você, o andamento em tempo real e o técnico atribuído'}
            </Text>
          </View>
        </View>

        {/* Painel de Métricas e Relatórios (2 linhas organizadas para evitar sobreposição) */}
        <View style={styles.relatoriosSection}>
          <Text style={styles.sectionTitle}>Métricas de Atendimento</Text>
          <View style={styles.metricasRow}>
            <View style={[styles.metricaCard, { backgroundColor: '#0f172a' }]}>
              <Text style={[styles.metricaValor, { color: '#ffffff' }]}>{relatorio.total}</Text>
              <Text style={[styles.metricaLabel, { color: '#94a3b8' }]}>Total OSs</Text>
            </View>

            <View style={[styles.metricaCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <Text style={[styles.metricaValor, { color: '#b45309' }]}>
                {relatorio.pendentes}
              </Text>
              <Text style={[styles.metricaLabel, { color: '#b45309' }]}>Pendentes</Text>
            </View>
          </View>

          <View style={styles.metricasRow}>
            <View style={[styles.metricaCard, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
              <Text style={[styles.metricaValor, { color: '#0369a1' }]}>
                {relatorio.emAtendimento}
              </Text>
              <Text style={[styles.metricaLabel, { color: '#0369a1' }]}>Em Andamento</Text>
            </View>

            <View style={[styles.metricaCard, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
              <Text style={[styles.metricaValor, { color: '#15803d' }]}>
                {relatorio.concluidos}
              </Text>
              <Text style={[styles.metricaLabel, { color: '#15803d' }]}>Concluídas</Text>
            </View>
          </View>
        </View>

        {/* Filtros por Status */}
        <View style={styles.filtrosContainer}>
          {(['TODOS', 'PENDENTE', 'EM_ATENDIMENTO', 'CONCLUIDO'] as StatusFiltro[]).map((st) => {
            const isAtivo = filtro === st;
            const labels: Record<StatusFiltro, string> = {
              TODOS: 'Todas',
              PENDENTE: 'Pendentes',
              EM_ATENDIMENTO: 'Em Curso',
              CONCLUIDO: 'Concluídas',
            };

            return (
              <TouchableOpacity
                key={st}
                testID={`filtro-${st.toLowerCase()}`}
                style={[styles.filtroChip, isAtivo && styles.filtroChipAtivo]}
                onPress={() => setFiltro(st)}
              >
                <Text
                  style={[styles.filtroChipText, isAtivo && styles.filtroChipTextAtivo]}
                >
                  {labels[st]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de Chamados */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Atualizando chamados...</Text>
          </View>
        ) : ordensFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhum chamado encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Não há ordens de serviço correspondentes ao filtro selecionado.
            </Text>
          </View>
        ) : (
          <View style={styles.ordensList}>
            {ordensFiltradas.map((os) => {
              const statusInfo = getStatusBadgeStyle(os.status.value);
              const tecInfo = getTecnicoInfo(os.tecnicoId);

              return (
                <TouchableOpacity
                  key={os.idLocal}
                  testID={`os-card-${os.idLocal}`}
                  style={styles.osCard}
                  activeOpacity={0.7}
                  onPress={() => setSelectedOs(os)}
                >
                  {/* Linha superior: Protocolo e Badge */}
                  <View style={styles.osCardHeader}>
                    <View style={styles.protocoloBlock}>
                      <Text style={styles.protocoloLabel}>PROTOCOLO</Text>
                      <Text style={styles.protocoloId}>#{os.idLocal}</Text>
                    </View>

                    <View style={[styles.statusBadge, statusInfo.badge]}>
                      <Ionicons
                        name={statusInfo.icon}
                        size={14}
                        color={statusInfo.text.color}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.statusBadgeText, statusInfo.text]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Tipo de Problema */}
                  <View style={styles.tipoProblemaRow}>
                    <Ionicons name="warning-outline" size={16} color="#0284c7" />
                    <Text style={styles.tipoProblemaText}>
                      {os.tipoProblema.label}
                    </Text>
                  </View>

                  {/* Descrição resumida */}
                  <Text style={styles.osDescricao} numberOfLines={2}>{os.descricao}</Text>

                  {/* Informação do Técnico no Card */}
                  <View style={styles.cardTecnicoRow}>
                    <Ionicons
                      name={tecInfo.atribuido ? "person-circle" : "time-outline"}
                      size={18}
                      color={tecInfo.atribuido ? "#0284c7" : "#b45309"}
                    />
                    <Text style={styles.cardTecnicoText}>
                      {tecInfo.atribuido ? `Técnico Atribuído: ${tecInfo.nome}` : 'Aguardando Atribuição de Técnico'}
                    </Text>
                  </View>

                  {/* Parecer Técnico (quando disponível) */}
                  {os.parecerTecnico && (
                    <View style={styles.parecerTecnicoBox}>
                      <View style={styles.parecerHeader}>
                        <Ionicons name="shield-checkmark" size={14} color="#15803d" />
                        <Text style={styles.parecerTitulo}>PARECER TÉCNICO CJNET</Text>
                      </View>
                      <Text style={styles.parecerTexto} numberOfLines={2}>{os.parecerTecnico}</Text>
                    </View>
                  )}

                  {/* Rodapé do Card: Data e Ação */}
                  <View style={styles.osCardFooter}>
                    <View style={styles.osCardDataBlock}>
                      <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                      <Text style={styles.osDataText}>
                        {new Date(os.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(os.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <View style={styles.verDetalhesBadge}>
                      <Text style={styles.verDetalhesText}>Ver Andamento</Text>
                      <Ionicons name="chevron-forward" size={14} color="#0284c7" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal de Andamento e Detalhes da Ordem de Serviço */}
      <Modal
        visible={!!selectedOs}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedOs(null)}
      >
        {selectedOs && (() => {
          const tec = getTecnicoInfo(selectedOs.tecnicoId);
          const stInfo = getStatusBadgeStyle(selectedOs.status.value);
          const isPendente = selectedOs.status.value === 'PENDENTE';
          const isEmAtendimento = selectedOs.status.value === 'EM_ATENDIMENTO';
          const isConcluido = selectedOs.status.value === 'CONCLUIDO';

          return (
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                {/* Header do Modal */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalProtocoloLabel}>ORDEM DE SERVIÇO</Text>
                    <Text style={styles.modalProtocoloId}>#{selectedOs.idLocal}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedOs(null)}
                    accessibilityLabel="Fechar detalhes"
                    testID="btn-fechar-modal-os"
                  >
                    <Ionicons name="close" size={22} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  {/* Status Geral */}
                  <View style={styles.modalStatusRow}>
                    <View style={[styles.statusBadge, stInfo.badge, { paddingVertical: 6, paddingHorizontal: 12 }]}>
                      <Ionicons name={stInfo.icon} size={16} color={stInfo.text.color} style={{ marginRight: 6 }} />
                      <Text style={[styles.statusBadgeText, stInfo.text, { fontSize: 13 }]}>{stInfo.label}</Text>
                    </View>
                    <Text style={styles.modalDataAbertura}>
                      Aberto em {new Date(selectedOs.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(selectedOs.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {/* Linha do Tempo de Andamento */}
                  <Text style={styles.modalSectionTitle}>Andamento do Atendimento</Text>
                  <View style={styles.timelineContainer}>
                    {/* Passo 1: Abertura */}
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, styles.timelineDotActive]}>
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>1. Chamado Registrado no Sistema</Text>
                        <Text style={styles.timelineSubtitle}>
                          Registrado e gravado na fila de atendimento da CJnet.
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.timelineLine, (isEmAtendimento || isConcluido) && styles.timelineLineActive]} />

                    {/* Passo 2: Atribuição / Deslocamento */}
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, (isEmAtendimento || isConcluido) && styles.timelineDotActive]}>
                        <Ionicons
                          name={isEmAtendimento || isConcluido ? "construct" : "time-outline"}
                          size={13}
                          color={isEmAtendimento || isConcluido ? "#ffffff" : "#94a3b8"}
                        />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTitle, (isEmAtendimento || isConcluido) && styles.timelineTextActive]}>
                          2. Técnico em Campo / Atendimento
                        </Text>
                        <Text style={styles.timelineSubtitle}>
                          {isPendente
                            ? 'Aguardando despacho da equipe técnica pela central de suporte.'
                            : `${tec.nome} foi designado e está em atendimento.`}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.timelineLine, isConcluido && styles.timelineLineActive]} />

                    {/* Passo 3: Conclusão */}
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, isConcluido && styles.timelineDotSuccess]}>
                        <Ionicons
                          name={isConcluido ? "shield-checkmark" : "flag-outline"}
                          size={13}
                          color={isConcluido ? "#ffffff" : "#94a3b8"}
                        />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTitle, isConcluido && styles.timelineTextSuccess]}>
                          3. Resolução & Laudo Técnico
                        </Text>
                        <Text style={styles.timelineSubtitle}>
                          {isConcluido
                            ? selectedOs.dataFechamento
                              ? `Concluído em ${new Date(selectedOs.dataFechamento).toLocaleDateString('pt-BR')}`
                              : 'Atendimento finalizado com sucesso.'
                            : 'Aguardando validação e testes finais do sinal de fibra.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Card do Técnico Atribuído */}
                  <Text style={styles.modalSectionTitle}>Técnico Responsável</Text>
                  <View style={styles.tecnicoCard}>
                    <View style={styles.tecnicoAvatar}>
                      <Ionicons name="person" size={24} color="#0284c7" />
                    </View>
                    <View style={styles.tecnicoInfoCol}>
                      <Text style={styles.tecnicoNome}>{tec.nome}</Text>
                      <Text style={styles.tecnicoFuncao}>{tec.funcao}</Text>
                      <View style={styles.tecnicoContatoRow}>
                        <Ionicons name="call-outline" size={14} color="#64748b" />
                        <Text style={styles.tecnicoContato}>{tec.telefone}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Detalhes do Problema */}
                  <Text style={styles.modalSectionTitle}>Problema Relatado</Text>
                  <View style={styles.detalhesBox}>
                    <View style={styles.detalheItem}>
                      <Text style={styles.detalheLabel}>Tipo de Falha:</Text>
                      <Text style={styles.detalheValor}>{selectedOs.tipoProblema.label}</Text>
                    </View>
                    <View style={styles.detalheItem}>
                      <Text style={styles.detalheLabel}>Descrição:</Text>
                      <Text style={styles.detalheDescricao}>{selectedOs.descricao}</Text>
                    </View>
                  </View>

                  {/* Parecer Técnico (se houver) */}
                  {selectedOs.parecerTecnico && (
                    <>
                      <Text style={styles.modalSectionTitle}>Parecer Técnico do Especialista</Text>
                      <View style={styles.modalParecerBox}>
                        <Ionicons name="checkmark-circle" size={20} color="#15803d" style={{ marginRight: 8 }} />
                        <Text style={styles.modalParecerText}>{selectedOs.parecerTecnico}</Text>
                      </View>
                    </>
                  )}

                  {/* Botão de Fechar */}
                  <TouchableOpacity
                    style={styles.btnFecharModal}
                    onPress={() => setSelectedOs(null)}
                  >
                    <Text style={styles.btnFecharModalText}>Fechar Visualização</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          );
        })()}
      </Modal>
      <AppNavBar currentTab="historico" onSair={onSair} />
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
    marginBottom: 20,
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
  btnNovoChamado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnNovoChamadoText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: Platform.OS === 'ios' ? 44 : 0,
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
  clientRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeTop: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  relatoriosSection: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  metricasRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricaCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricaValor: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  filtrosContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filtroChipAtivo: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filtroChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  filtroChipTextAtivo: {
    color: '#ffffff',
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  ordensList: {
    flexDirection: 'column',
    gap: 14,
  },
  osCard: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  osCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  protocoloBlock: {
    flexDirection: 'column',
  },
  protocoloLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  protocoloId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipoProblemaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipoProblemaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
    marginLeft: 6,
  },
  osDescricao: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 12,
  },
  parecerTecnicoBox: {
    flexDirection: 'column',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    marginBottom: 12,
  },
  parecerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  parecerTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  parecerTexto: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  cardTecnicoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  cardTecnicoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  osCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  osCardDataBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  osDataText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
  verDetalhesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verDetalhesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  // Estilos do Modal de Detalhes da OS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalProtocoloLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  modalProtocoloId: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    marginTop: 14,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  modalDataAbertura: {
    fontSize: 12,
    color: '#64748b',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  timelineContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDotActive: {
    backgroundColor: '#0284c7',
  },
  timelineDotSuccess: {
    backgroundColor: '#16a34a',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  timelineTextActive: {
    color: '#0284c7',
  },
  timelineTextSuccess: {
    color: '#16a34a',
  },
  timelineSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 17,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#cbd5e1',
    marginLeft: 12,
    marginVertical: 4,
  },
  timelineLineActive: {
    backgroundColor: '#0284c7',
  },
  tecnicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    gap: 12,
  },
  tecnicoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tecnicoInfoCol: {
    flex: 1,
  },
  tecnicoNome: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369a1',
  },
  tecnicoFuncao: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 1,
  },
  tecnicoContatoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  tecnicoContato: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  detalhesBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  detalheItem: {
    flexDirection: 'column',
  },
  detalheLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  detalheValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  detalheDescricao: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  modalParecerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  modalParecerText: {
    flex: 1,
    fontSize: 13,
    color: '#15803d',
    lineHeight: 19,
    fontWeight: '500',
  },
  btnFecharModal: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  btnFecharModalText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
