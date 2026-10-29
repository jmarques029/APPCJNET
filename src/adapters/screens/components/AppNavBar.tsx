/**
 * AppNavBar.tsx
 * -------------
 * Barra de navegação inferior compartilhada com atalhos para todas as abas
 * principais do aplicativo CJnet (Histórico, Nova OS, Planos) e botão Sair.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/adapters/context/AuthContext';

export interface AppNavBarProps {
  currentTab: 'cliente' | 'tecnico' | 'admin' | 'historico' | 'atividades' | 'assinatura';
  onSair?: () => void;
}

export function AppNavBar({ currentTab, onSair }: AppNavBarProps) {
  const { signOut, role } = useAuth();

  // Isola as opções de navegação com base no perfil autenticado
  // Cliente só vê Cliente; Técnico só vê Técnico; Admin só vê Admin.
  const effectiveRole = role || (currentTab === 'tecnico' ? 'tecnico' : currentTab === 'admin' ? 'admin' : 'cliente');

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
    <View style={styles.navContainer}>
      {/* Visualização restrita ao CLIENTE */}
      {effectiveRole === 'cliente' && (
        <>
          <TouchableOpacity
            style={[styles.navItem, currentTab === 'cliente' && styles.navItemActive]}
            onPress={() => router.push('/cliente' as any)}
            accessibilityLabel="Ir para Aba do Cliente"
            testID="tab-nav-cliente"
          >
            <Ionicons
              name={currentTab === 'cliente' ? 'person-circle' : 'person-circle-outline'}
              size={22}
              color={currentTab === 'cliente' ? '#0284c7' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'cliente' && styles.navLabelActive]}>
              Chamados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentTab === 'atividades' && styles.navItemActive]}
            onPress={() => router.push('/atividades' as any)}
            accessibilityLabel="Abrir Novo Chamado"
            testID="tab-nav-atividades"
          >
            <Ionicons
              name={currentTab === 'atividades' ? 'add-circle' : 'add-circle-outline'}
              size={22}
              color={currentTab === 'atividades' ? '#0284c7' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'atividades' && styles.navLabelActive]}>
              Abrir OS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentTab === 'historico' && styles.navItemActive]}
            onPress={() => router.push('/historico' as any)}
            accessibilityLabel="Histórico de Chamados"
            testID="tab-nav-historico"
          >
            <Ionicons
              name={currentTab === 'historico' ? 'time' : 'time-outline'}
              size={22}
              color={currentTab === 'historico' ? '#0284c7' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'historico' && styles.navLabelActive]}>
              Histórico
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentTab === 'assinatura' && styles.navItemActive]}
            onPress={() => router.push('/assinatura' as any)}
            accessibilityLabel="Ver Planos"
            testID="tab-nav-assinatura"
          >
            <Ionicons
              name={currentTab === 'assinatura' ? 'sparkles' : 'sparkles-outline'}
              size={22}
              color={currentTab === 'assinatura' ? '#0284c7' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'assinatura' && styles.navLabelActive]}>
              Planos
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Visualização restrita ao TÉCNICO */}
      {effectiveRole === 'tecnico' && (
        <TouchableOpacity
          style={[styles.navItem, currentTab === 'tecnico' && styles.navItemActive]}
          onPress={() => router.push('/tecnico' as any)}
          accessibilityLabel="Ir para Aba do Técnico"
          testID="tab-nav-tecnico"
        >
          <Ionicons
            name={currentTab === 'tecnico' ? 'construct' : 'construct-outline'}
            size={22}
            color={currentTab === 'tecnico' ? '#0284c7' : '#64748b'}
          />
          <Text style={[styles.navLabel, currentTab === 'tecnico' && styles.navLabelActive]}>
            Atendimentos
          </Text>
        </TouchableOpacity>
      )}

      {/* Visualização restrita ao ADMINISTRADOR */}
      {effectiveRole === 'admin' && (
        <>
          <TouchableOpacity
            style={[styles.navItem, currentTab === 'admin' && styles.navItemActive]}
            onPress={() => router.push('/admin' as any)}
            accessibilityLabel="Ir para Aba do Administrador"
            testID="tab-nav-admin"
          >
            <Ionicons
              name={currentTab === 'admin' ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={22}
              color={currentTab === 'admin' ? '#0284c7' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'admin' && styles.navLabelActive]}>
              Painel Admin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentTab === 'historico' && styles.navItemActive]}
            onPress={() => router.push('/historico' as any)}
            accessibilityLabel="Histórico Geral e Auditoria"
            testID="tab-nav-historico"
          >
            <Ionicons
              name={currentTab === 'historico' ? 'bar-chart' : 'bar-chart-outline'}
              size={22}
              color={currentTab === 'historico' ? '#0284c7' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'historico' && styles.navLabelActive]}>
              Histórico
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, currentTab === 'assinatura' && styles.navItemActive]}
            onPress={() => router.push('/assinatura' as any)}
            accessibilityLabel="Gestão de Planos"
            testID="tab-nav-assinatura"
          >
            <Ionicons
              name={currentTab === 'assinatura' ? 'sparkles' : 'sparkles-outline'}
              size={22}
              color={currentTab === 'assinatura' ? '#0284c7' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'assinatura' && styles.navLabelActive]}>
              Planos
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Botão Sair */}
      <TouchableOpacity
        style={[styles.navItem, styles.navItemSair]}
        onPress={handleSair}
        accessibilityLabel="Sair da conta"
        testID="tab-nav-sair"
      >
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={[styles.navLabel, styles.navLabelSair]}>
          Sair
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#f0f9ff',
  },
  navItemSair: {
    backgroundColor: '#fef2f2',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  navLabelSair: {
    color: '#ef4444',
    fontWeight: '700',
  },
});
