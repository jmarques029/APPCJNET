/**
 * AdminTabScreen.tsx
 * ------------------
 * Camada de Adaptadores de Interface (UI): Aba do Administrador (NOC / Gerência).
 *
 * Requisito:
 * "Na aba admin ele controla todas as os aberta, atribui a um técnico, pode chegar a
 * conversar com o cliente e fica analisando todo o historico da OS até a conclusão"
 *
 * Funcionalidades:
 *  - Controle de todas as Ordens de Serviço abertas de todos os clientes.
 *  - Atribuição direta de técnicos de campo para chamados pendentes.
 *  - Chat / mensagens diretas com o cliente da OS.
 *  - Análise cronológica e auditoria completa do histórico da OS até a conclusão.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import {
  sharedOsRepo,
  TECNICOS_DISPONIVEIS,
  obterMensagensPorOS,
  enviarMensagemOS,
  type MensagemOS,
} from './mockStore';
import { useAuth } from '@/adapters/context/AuthContext';
import { AppNavBar } from './components/AppNavBar';
import { getTecnicoInfo } from './HistoricoRelatoriosScreen';

export interface AdminTabScreenProps {
  initialFiltro?: FiltroAdmin;
  initialTecnicoSelecionado?: string;
  initialTextoMensagem?: string;
  onSair?: () => void;
}

type FiltroAdmin = 'TODAS' | 'ABERTAS' | 'SEM_TECNICO' | 'CONCLUIDAS';

export function AdminTabScreen({
  initialFiltro = 'ABERTAS',
  initialTecnicoSelecionado = 'tec-joao-01',
  initialTextoMensagem,
  onSair,
}: AdminTabScreenProps) {
  const { user, role } = useAuth();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtro, setFiltro] = useState<FiltroAdmin>(initialFiltro);
  const [busca, setBusca] = useState<string>('');

  // 1. Modal de Atribuição de Técnico
  const [modalAtribuir, setModalAtribuir] = useState<boolean>(false);
  const [osParaAtribuir, setOsParaAtribuir] = useState<OrdemServico | null>(null);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<string>(initialTecnicoSelecionado);

  // 2. Modal de Conversa com Cliente
  const [modalConversa, setModalConversa] = useState<boolean>(false);
  const [osParaConversa, setOsParaConversa] = useState<OrdemServico | null>(null);
  const [mensagensChat, setMensagensChat] = useState<MensagemOS[]>([]);
  const [textoMensagem, setTextoMensagem] = useState<string>(initialTextoMensagem ?? '');

  // 3. Modal de Histórico e Auditoria até a Conclusão
  const [modalHistorico, setModalHistorico] = useState<boolean>(false);
  const [osHistorico, setOsHistorico] = useState<OrdemServico | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const carregarTodasOrdens = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const todas = await sharedOsRepo.listarTodas();
      if (isMountedRef.current) {
        setOrdens(todas);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        console.error('Erro ao listar OSs no Admin:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    carregarTodasOrdens();
  }, [carregarTodasOrdens]);

  // Métricas do Painel Admin
  const metricas = useMemo(() => {
    const total = ordens.length;
    const abertas = ordens.filter((os) => os.status.value !== 'CONCLUIDO').length;
    const semTecnico = ordens.filter(
      (os) => os.status.value !== 'CONCLUIDO' && !os.tecnicoId
    ).length;
    const concluidas = ordens.filter((os) => os.status.value === 'CONCLUIDO').length;
    return { total, abertas, semTecnico, concluidas };
  }, [ordens]);

  // Lista Filtrada
  const ordensFiltradas = useMemo(() => {
    let lista = [...ordens];

    if (filtro === 'ABERTAS') {
      lista = lista.filter((os) => os.status.value !== 'CONCLUIDO');
    } else if (filtro === 'SEM_TECNICO') {
      lista = lista.filter((os) => os.status.value !== 'CONCLUIDO' && !os.tecnicoId);
    } else if (filtro === 'CONCLUIDAS') {
      lista = lista.filter((os) => os.status.value === 'CONCLUIDO');
    }

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      lista = lista.filter(
        (os) =>
          os.idLocal.toLowerCase().includes(termo) ||
          os.descricao.toLowerCase().includes(termo) ||
          os.tipoProblema.label.toLowerCase().includes(termo)
      );
    }

    return lista;
  }, [ordens, filtro, busca]);

  // ─── Ações de Atribuição de Técnico ─────────────────────────────────────────

  const abrirModalAtribuicao = (os: OrdemServico) => {
    setOsParaAtribuir(os);
    setTecnicoSelecionado(os.tecnicoId || initialTecnicoSelecionado);
    setModalAtribuir(true);
  };

  const handleConfirmarAtribuicao = async () => {
    if (!osParaAtribuir) return;

    try {
      // Inicia atendimento e define o técnico na OS
      osParaAtribuir.iniciarAtendimento(tecnicoSelecionado);
      await sharedOsRepo.salvar(osParaAtribuir);

      // Adiciona mensagem automática no chat informando o cliente
      const tecInfo = getTecnicoInfo(tecnicoSelecionado);
      enviarMensagemOS(
        osParaAtribuir.idLocal,
        'adm-01',
        'Gerência CJnet',
        'ADMIN',
        `Olá! Sua ordem de serviço #${osParaAtribuir.idLocal} foi atribuída ao técnico ${tecInfo.nome} (${tecInfo.telefone}).`
      );

      if (isMountedRef.current) {
        setOrdens((prev) =>
          prev.map((item) => (item.idLocal === osParaAtribuir.idLocal ? osParaAtribuir : item))
        );
        setModalAtribuir(false);
        setOsParaAtribuir(null);

        Alert.alert(
          'Técnico Atribuído com Sucesso! 👷',
          `A OS foi atribuída a ${tecInfo.nome} e o status avançou para Em Atendimento.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atribuir técnico';
      if (isMountedRef.current) {
        Alert.alert('Erro', msg);
      }
    }
  };

  // ─── Ações de Conversa com o Cliente ────────────────────────────────────────

  const abrirConversaComCliente = (os: OrdemServico) => {
    setOsParaConversa(os);
    setMensagensChat(obterMensagensPorOS(os.idLocal));
    setTextoMensagem(initialTextoMensagem ?? '');
    setModalConversa(true);
  };

  const handleEnviarMensagemAdmin = () => {
    if (!osParaConversa || !textoMensagem.trim()) return;

    const nova = enviarMensagemOS(
      osParaConversa.idLocal,
      user?.id || 'adm-01',
      'Central CJnet',
      'ADMIN',
      textoMensagem.trim()
    );

    setMensagensChat((prev) => [...prev, nova]);
    setTextoMensagem('');
  };

  // ─── Ações de Análise do Histórico da OS até a Conclusão ─────────────────────

  const abrirHistoricoOS = (os: OrdemServico) => {
    setOsHistorico(os);
    setModalHistorico(true);
  };

  // Guarda de Acesso RBAC: Admin não acessa cliente/tecnico e vice-versa
  if (role && role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDeniedCard}>
          <Ionicons name="shield-outline" size={56} color="#ef4444" />
          <Text style={styles.accessDeniedTitle}>Acesso Restrito a Administradores</Text>
          <Text style={styles.accessDeniedDesc}>
            Seu usuário está autenticado com o perfil de {role === 'tecnico' ? 'Técnico de Campo' : 'Cliente'}.
            Este painel é de controle gerencial e operacional restrito à equipe de administração e NOC.
          </Text>
          <TouchableOpacity
            style={styles.accessDeniedButton}
            onPress={() => router.replace(role === 'tecnico' ? '/tecnico' : '/cliente')}
            accessibilityLabel="Ir para o Painel Autorizado"
          >
            <Text style={styles.accessDeniedButtonText}>
              Ir para o Painel do {role === 'tecnico' ? 'Técnico' : 'Cliente'}
            </Text>
          </TouchableOpacity>
        </View>
        <AppNavBar currentTab="admin" onSair={onSair} />
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
            onRefresh={carregarTodasOrdens}
            colors={['#0284c7']}
            tintColor="#0284c7"
          />
        }
      >
        {/* Topo Administrativo */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.badgeAdmin}>
              <Ionicons name="shield-checkmark" size={14} color="#0284c7" />
              <Text style={styles.badgeAdminText}>CENTRAL DE CONTROLE • CJNET</Text>
            </View>
            <View style={styles.badgeNoc}>
              <Ionicons name="pulse" size={12} color="#0284c7" />
              <Text style={styles.badgeNocText}>NOC Operacional</Text>
            </View>
          </View>
          <Text style={styles.tituloHeader}>Gestão de Ordens de Serviço</Text>
          <Text style={styles.subtituloHeader}>
            Controle todas as OSs abertas, atribua técnicos de campo, converse diretamente com clientes e analise o histórico completo.
          </Text>

          {/* Cards de Métricas em Tempo Real */}
          <View style={styles.metricasGrid}>
            <View style={[styles.metricaCard, { backgroundColor: '#0f172a' }]}>
              <Text style={[styles.metricaValor, { color: '#ffffff' }]}>{metricas.abertas}</Text>
              <Text style={[styles.metricaLabel, { color: '#94a3b8' }]}>OSs Abertas</Text>
            </View>
            <View style={[styles.metricaCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <Text style={[styles.metricaValor, { color: '#b45309' }]}>
                {metricas.semTecnico}
              </Text>
              <Text style={[styles.metricaLabel, { color: '#b45309' }]}>Sem Técnico</Text>
            </View>
            <View style={[styles.metricaCard, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
              <Text style={[styles.metricaValor, { color: '#15803d' }]}>
                {metricas.concluidas}
              </Text>
              <Text style={[styles.metricaLabel, { color: '#15803d' }]}>Concluídas</Text>
            </View>
          </View>

          {/* Campo de Busca Rápida */}
          <View style={styles.buscaRow}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.inputBusca}
              placeholder="Buscar por protocolo, problema ou descrição..."
              placeholderTextColor="#94a3b8"
              value={busca}
              onChangeText={setBusca}
              testID="input-busca-admin"
            />
            {busca.length > 0 && (
              <TouchableOpacity onPress={() => setBusca('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filtros por Categoria de Gestão */}
        <View style={styles.filtrosRow}>
          {(
            [
              { id: 'ABERTAS', label: `Abertas (${metricas.abertas})` },
              { id: 'SEM_TECNICO', label: `Sem Técnico (${metricas.semTecnico})` },
              { id: 'CONCLUIDAS', label: `Concluídas (${metricas.concluidas})` },
              { id: 'TODAS', label: `Todas (${metricas.total})` },
            ] as { id: FiltroAdmin; label: string }[]
          ).map((item) => {
            const ativo = filtro === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filtroBtn, ativo && styles.filtroBtnAtivo]}
                onPress={() => setFiltro(item.id)}
                testID={`filtro-admin-${item.id.toLowerCase()}`}
              >
                <Text style={[styles.filtroBtnText, ativo && styles.filtroBtnTextAtivo]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de Ordens de Serviço sob Controle do Admin */}
        <View style={styles.secao}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={styles.loadingText}>Carregando chamados do sistema...</Text>
            </View>
          ) : ordensFiltradas.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="file-tray-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitulo}>Nenhuma OS encontrada</Text>
              <Text style={styles.emptyDesc}>Não há ordens de serviço para o filtro selecionado.</Text>
            </View>
          ) : (
            <View style={styles.listaOrdens}>
              {ordensFiltradas.map((os) => {
                const tecInfo = getTecnicoInfo(os.tecnicoId);
                const isConcluida = os.status.value === 'CONCLUIDO';
                const temTecnico = !!os.tecnicoId;

                return (
                  <View
                    key={os.idLocal}
                    style={[
                      styles.cardOS,
                      isConcluida && { borderLeftColor: '#10b981' },
                      !temTecnico && !isConcluida && { borderLeftColor: '#f59e0b' },
                    ]}
                    testID={`card-os-admin-${os.idLocal}`}
                  >
                    {/* Cabeçalho do Card da OS */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.protocoloTag}>
                        <Text style={styles.protocoloTagText}>#{os.idLocal}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isConcluida
                            ? styles.statusConcluido
                            : temTecnico
                            ? styles.statusEmAtendimento
                            : styles.statusPendente,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: isConcluida
                                ? '#15803d'
                                : temTecnico
                                ? '#0369a1'
                                : '#b45309',
                            },
                          ]}
                        >
                          {isConcluida
                            ? 'Concluída'
                            : temTecnico
                            ? 'Em Atendimento'
                            : 'Pendente de Técnico'}
                        </Text>
                      </View>
                    </View>

                    {/* Informações da OS */}
                    <Text style={styles.cardTipo}>{os.tipoProblema.label}</Text>
                    <Text style={styles.cardDesc}>{os.descricao}</Text>

                    {/* Informações do Técnico Atribuído */}
                    <View
                      style={[
                        styles.tecnicoLinha,
                        temTecnico ? styles.tecnicoAtribuido : styles.tecnicoNaoAtribuido,
                      ]}
                      testID={`admin-tecnico-badge-${os.idLocal}`}
                    >
                      <Ionicons
                        name={temTecnico ? 'person' : 'alert-circle'}
                        size={16}
                        color={temTecnico ? '#0284c7' : '#b45309'}
                      />
                      <Text style={styles.tecnicoTexto}>
                        {temTecnico
                          ? `Técnico Atribuído: ${tecInfo.nome}`
                          : 'Nenhum técnico atribuído a esta OS'}
                      </Text>
                    </View>

                    {/* Barra de Ações do Administrador */}
                    <View style={styles.acoesAdminRow}>
                      {/* Ação 1: Atribuir a um Técnico */}
                      {!isConcluida && (
                        <TouchableOpacity
                          style={[styles.btnAcao, styles.btnAtribuir]}
                          onPress={() => abrirModalAtribuicao(os)}
                          testID={`btn-atribuir-tecnico-${os.idLocal}`}
                          accessibilityLabel="Atribuir a um técnico"
                        >
                          <Ionicons name="person-add" size={15} color="#ffffff" />
                          <Text style={styles.btnAcaoText}>
                            {temTecnico ? 'Reatribuir' : 'Atribuir Técnico'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Ação 2: Conversar com o Cliente */}
                      <TouchableOpacity
                        style={[styles.btnAcao, styles.btnConversar]}
                        onPress={() => abrirConversaComCliente(os)}
                        testID={`btn-conversar-cliente-${os.idLocal}`}
                        accessibilityLabel="Conversar com o cliente"
                      >
                        <Ionicons name="chatbubbles" size={15} color="#ffffff" />
                        <Text style={styles.btnAcaoText}>Conversar</Text>
                      </TouchableOpacity>

                      {/* Ação 3: Analisar Histórico até Conclusão */}
                      <TouchableOpacity
                        style={[styles.btnAcao, styles.btnHistorico]}
                        onPress={() => abrirHistoricoOS(os)}
                        testID={`btn-historico-os-${os.idLocal}`}
                        accessibilityLabel="Analisar histórico da OS"
                      >
                        <Ionicons name="time" size={15} color="#0f172a" />
                        <Text style={[styles.btnAcaoText, { color: '#0f172a' }]}>Histórico</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Modal 1: Atribuir a um Técnico ───────────────────────────────────── */}
      <Modal
        visible={modalAtribuir}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalAtribuir(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {osParaAtribuir && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitulo}>Atribuir Técnico de Campo</Text>
                    <Text style={styles.modalSubtitulo}>
                      OS #{osParaAtribuir.idLocal} • {osParaAtribuir.tipoProblema.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalAtribuir(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDesc}>
                  Selecione o técnico disponível da CJnet para atender esta solicitação:
                </Text>

                {/* Lista de Técnicos Disponíveis */}
                <View style={styles.listaTecnicosSelecao}>
                  {TECNICOS_DISPONIVEIS.map((tec) => {
                    const isSelected = tecnicoSelecionado === tec.id;
                    return (
                      <TouchableOpacity
                        key={tec.id}
                        style={[
                          styles.cardTecnicoItem,
                          isSelected && styles.cardTecnicoItemSelected,
                        ]}
                        onPress={() => setTecnicoSelecionado(tec.id)}
                        testID={`opcao-tecnico-${tec.id}`}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={isSelected ? '#0284c7' : '#94a3b8'}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.cardTecnicoNome}>{tec.nome}</Text>
                          <Text style={styles.cardTecnicoFuncao}>{tec.funcao}</Text>
                          <Text style={styles.cardTecnicoEsp}>
                            {tec.especialidade} • {tec.telefone}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.btnConfirmarAtribuicao}
                  onPress={handleConfirmarAtribuicao}
                  testID="btn-confirmar-atribuicao"
                >
                  <Ionicons name="checkmark-sharp" size={20} color="#ffffff" />
                  <Text style={styles.btnConfirmarAtribuicaoText}>
                    Confirmar Despacho do Técnico
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Modal 2: Conversar com o Cliente ──────────────────────────────────── */}
      <Modal
        visible={modalConversa}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalConversa(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {osParaConversa && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitulo}>Conversa com Cliente</Text>
                    <Text style={styles.modalSubtitulo}>
                      OS #{osParaConversa.idLocal} • Carlos Eduardo Silva
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalConversa(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Histórico do Chat */}
                <ScrollView style={styles.chatScroll} showsVerticalScrollIndicator={false}>
                  {mensagensChat.length === 0 ? (
                    <Text style={styles.chatVazioText}>
                      Nenhuma mensagem enviada ainda. Inicie o contato com o cliente abaixo.
                    </Text>
                  ) : (
                    mensagensChat.map((m) => {
                      const isAdmin = m.papel === 'ADMIN';
                      return (
                        <View
                          key={m.id}
                          style={[
                            styles.bolhaMsg,
                            isAdmin ? styles.bolhaAdmin : styles.bolhaCliente,
                          ]}
                        >
                          <Text style={styles.bolhaAutor}>
                            {m.remetenteNome} ({m.papel})
                          </Text>
                          <Text style={styles.bolhaTexto}>{m.texto}</Text>
                          <Text style={styles.bolhaHora}>
                            {new Date(m.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* Input de Envio de Mensagem pelo Admin */}
                <View style={styles.inputChatRow}>
                  <TextInput
                    style={styles.inputChat}
                    placeholder="Digite uma mensagem para o cliente..."
                    placeholderTextColor="#94a3b8"
                    value={textoMensagem}
                    onChangeText={setTextoMensagem}
                    testID="input-mensagem-admin"
                  />
                  <TouchableOpacity
                    style={styles.btnChatSend}
                    onPress={handleEnviarMensagemAdmin}
                    testID="btn-enviar-mensagem-admin"
                  >
                    <Ionicons name="send" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Modal 3: Analisar Todo o Histórico da OS até a Conclusão ─────────── */}
      <Modal
        visible={modalHistorico}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalHistorico(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {osHistorico && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitulo}>Histórico Completo da OS</Text>
                    <Text style={styles.modalSubtitulo}>
                      Protocolo #{osHistorico.idLocal} • Análise de Ciclo de Vida
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalHistorico(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.timelineScroll}>
                  {/* Etapa 1: Abertura */}
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineDot}>
                      <Ionicons name="add" size={14} color="#ffffff" />
                    </View>
                    <View style={styles.timelineConteudo}>
                      <Text style={styles.timelineEtapa}>1. Abertura do Chamado</Text>
                      <Text style={styles.timelineData}>
                        {new Date(osHistorico.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(osHistorico.createdAt).toLocaleTimeString('pt-BR')}
                      </Text>
                      <Text style={styles.timelineTexto}>
                        Problema: {osHistorico.tipoProblema.label}
                      </Text>
                      <Text style={styles.timelineTextoSub}>
                        Relato: "{osHistorico.descricao}"
                      </Text>
                    </View>
                  </View>

                  {/* Etapa 2: Atribuição do Técnico */}
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        osHistorico.tecnicoId ? { backgroundColor: '#0284c7' } : { backgroundColor: '#cbd5e1' },
                      ]}
                    >
                      <Ionicons name="person" size={12} color="#ffffff" />
                    </View>
                    <View style={styles.timelineConteudo}>
                      <Text style={styles.timelineEtapa}>2. Atribuição de Técnico</Text>
                      <Text style={styles.timelineData}>
                        {osHistorico.tecnicoId ? 'Técnico Vinculado pela Central' : 'Pendente de Atribuição'}
                      </Text>
                      <Text style={styles.timelineTexto}>
                        {osHistorico.tecnicoId
                          ? `${getTecnicoInfo(osHistorico.tecnicoId).nome} (${getTecnicoInfo(osHistorico.tecnicoId).funcao})`
                          : 'Aguardando despacho pelo Admin'}
                      </Text>
                    </View>
                  </View>

                  {/* Etapa 3: Andamento / Visita de Campo */}
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        osHistorico.status.value === 'EM_ATENDIMENTO' || osHistorico.status.value === 'CONCLUIDO'
                          ? { backgroundColor: '#0284c7' }
                          : { backgroundColor: '#cbd5e1' },
                      ]}
                    >
                      <Ionicons name="construct" size={12} color="#ffffff" />
                    </View>
                    <View style={styles.timelineConteudo}>
                      <Text style={styles.timelineEtapa}>3. Atendimento de Campo</Text>
                      <Text style={styles.timelineData}>
                        Status: {osHistorico.status.value}
                      </Text>
                      <Text style={styles.timelineTexto}>
                        Técnico em deslocamento e testes na infraestrutura óptica
                      </Text>
                    </View>
                  </View>

                  {/* Etapa 4: Conclusão e Resolução com Foto */}
                  <View style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        osHistorico.status.value === 'CONCLUIDO'
                          ? { backgroundColor: '#16a34a' }
                          : { backgroundColor: '#cbd5e1' },
                      ]}
                    >
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                    <View style={styles.timelineConteudo}>
                      <Text style={styles.timelineEtapa}>4. Conclusão & Laudo Final</Text>
                      <Text style={styles.timelineData}>
                        {osHistorico.dataFechamento
                          ? `Fechada em ${new Date(osHistorico.dataFechamento).toLocaleDateString('pt-BR')} às ${new Date(osHistorico.dataFechamento).toLocaleTimeString('pt-BR')}`
                          : 'Chamado ainda não finalizado'}
                      </Text>
                      {osHistorico.parecerTecnico ? (
                        <View style={styles.laudoBox}>
                          <Text style={styles.laudoTitulo}>PARECER TÉCNICO REGISTRADO:</Text>
                          <Text style={styles.laudoTexto}>{osHistorico.parecerTecnico}</Text>
                          <Text style={styles.fotoInfo}>
                            Foto da Resolução: Anexada pelo técnico de campo (reparo.jpg • &lt; 1MB)
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.timelineTextoSub}>
                          Aguardando finalização pelo técnico com foto e parecer.
                        </Text>
                      )}
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Barra de Navegação Inferior */}
      <AppNavBar currentTab="admin" onSair={onSair} />
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
  badgeAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeAdminText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  badgeNoc: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeNocText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
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
  metricasGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  metricaCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricaValor: {
    fontSize: 22,
    fontWeight: '800',
  },
  metricaLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  buscaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  inputBusca: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  filtrosRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filtroBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filtroBtnAtivo: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filtroBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filtroBtnTextAtivo: {
    color: '#ffffff',
  },
  secao: {
    paddingHorizontal: 16,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
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
  tecnicoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  tecnicoAtribuido: {
    backgroundColor: '#f0f9ff',
  },
  tecnicoNaoAtribuido: {
    backgroundColor: '#fffbeb',
  },
  tecnicoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  acoesAdminRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnAcao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  btnAtribuir: {
    backgroundColor: '#0284c7',
  },
  btnConversar: {
    backgroundColor: '#059669',
  },
  btnHistorico: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnAcaoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
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
    marginBottom: 14,
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
  modalDesc: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  listaTecnicosSelecao: {
    gap: 10,
    marginBottom: 18,
  },
  cardTecnicoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  cardTecnicoItemSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  cardTecnicoNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardTecnicoFuncao: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '600',
  },
  cardTecnicoEsp: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  btnConfirmarAtribuicao: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  btnConfirmarAtribuicaoText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  chatScroll: {
    maxHeight: 280,
    marginBottom: 12,
  },
  chatVazioText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  bolhaMsg: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: '85%',
  },
  bolhaAdmin: {
    alignSelf: 'flex-end',
    backgroundColor: '#e0f2fe',
    borderBottomRightRadius: 2,
  },
  bolhaCliente: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 2,
  },
  bolhaAutor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  bolhaTexto: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 17,
  },
  bolhaHora: {
    fontSize: 9,
    color: '#94a3b8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inputChat: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  btnChatSend: {
    backgroundColor: '#059669',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineScroll: {
    maxHeight: 360,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  timelineConteudo: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineEtapa: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  timelineData: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 2,
  },
  timelineTexto: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
  },
  timelineTextoSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontStyle: 'italic',
  },
  laudoBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  laudoTitulo: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
  },
  laudoTexto: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  fotoInfo: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
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
