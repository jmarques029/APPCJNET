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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlanoInternet } from '@/domain/entities/PlanoInternet';
import { sharedPlanoRepo } from './mockStore';
import { ConsultarPlanosPublicosUseCase } from '@/application/use-cases';
import { useAuth } from '@/adapters/context/AuthContext';
import { AppNavBar } from './components/AppNavBar';

export interface AssinaturaScreenProps {
  onVoltar?: () => void;
  onAssinarPlano?: (plano: PlanoInternet) => void;
  onSair?: () => void;
}

export function AssinaturaScreen({ onVoltar, onAssinarPlano, onSair }: AssinaturaScreenProps) {
  const { signOut } = useAuth();
  const [planos, setPlanos] = useState<PlanoInternet[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>('plano-400');
  const [loading, setLoading] = useState<boolean>(true);
  const [sucessoModal, setSucessoModal] = useState<string | null>(null);

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

  const handleAssinar = (plano: PlanoInternet) => {
    if (onAssinarPlano) {
      onAssinarPlano(plano);
      return;
    }
    setSucessoModal(plano.nome);
    Alert.alert(
      'Assinatura Solicitada! 🎉',
      `Você selecionou o "${plano.nome}" (${plano.labelVelocidade}) por ${plano.precoMensal.formatado}/mês.\n\nNossa equipe entrará em contato para agendar a instalação 100% gratuita em Coqueiral/MG!`,
      [
        {
          text: 'Concluir',
          onPress: () => setSucessoModal(null),
        },
      ]
    );
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
      <AppNavBar currentTab="assinatura" onSair={onSair} />
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
});
