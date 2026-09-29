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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import { sharedOsRepo, sharedClienteRepo, DEMO_CLIENTE_ID } from './mockStore';
import { ListarOrdensServicoUseCase } from '@/application/use-cases';

export interface HistoricoRelatoriosScreenProps {
  usuarioId?: string;
  onNovoChamado?: () => void;
  onVoltar?: () => void;
}

type StatusFiltro = 'TODOS' | 'PENDENTE' | 'EM_ATENDIMENTO' | 'CONCLUIDO';

export function HistoricoRelatoriosScreen({
  usuarioId = DEMO_CLIENTE_ID,
  onNovoChamado,
  onVoltar,
}: HistoricoRelatoriosScreenProps) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtro, setFiltro] = useState<StatusFiltro>('TODOS');

  const carregarOrdens = async () => {
    setLoading(true);
    try {
      const useCase = new ListarOrdensServicoUseCase(sharedOsRepo, sharedClienteRepo);
      const resultado = await useCase.execute({ usuarioId });
      setOrdens(resultado);
    } catch (err: unknown) {
      console.error('Erro ao listar chamados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, [usuarioId]);

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
              style={styles.btnNovoChamado}
              onPress={handleNovoChamado}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.btnNovoChamadoText}>Abrir OS</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerTexts}>
            <Text style={styles.badgeTop}>CENTRAL DE ATENDIMENTO</Text>
            <Text style={styles.headerTitle}>Histórico & Relatórios</Text>
            <Text style={styles.headerSubtitle}>
              Monitore suas solicitações técnicas e indicadores de atendimento
            </Text>
          </View>
        </View>

        {/* Painel de Métricas e Relatórios */}
        <View style={styles.relatoriosSection}>
          <Text style={styles.sectionTitle}>Métricas de Atendimento</Text>
          <View style={styles.metricasGrid}>
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

              return (
                <View key={os.idLocal} style={styles.osCard}>
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

                  {/* Descrição */}
                  <Text style={styles.osDescricao}>{os.descricao}</Text>

                  {/* Parecer Técnico (quando disponível) */}
                  {os.parecerTecnico && (
                    <View style={styles.parecerTecnicoBox}>
                      <View style={styles.parecerHeader}>
                        <Ionicons name="shield-checkmark" size={14} color="#15803d" />
                        <Text style={styles.parecerTitulo}>PARECER TÉCNICO CJNET</Text>
                      </View>
                      <Text style={styles.parecerTexto}>{os.parecerTecnico}</Text>
                    </View>
                  )}

                  {/* Rodapé do Card: Data */}
                  <View style={styles.osCardFooter}>
                    <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                    <Text style={styles.osDataText}>
                      Aberto em: {new Date(os.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(os.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  btnNovoChamadoText: {
    color: '#ffffff',
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
  metricasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricaCard: {
    flex: 1,
    minWidth: '45%',
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
  osCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  osDataText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
});
