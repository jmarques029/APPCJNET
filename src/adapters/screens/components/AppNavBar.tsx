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

  const isClienteTab = currentTab === 'cliente' || currentTab === 'historico' || currentTab === 'atividades';
  const isTecnicoTab = currentTab === 'tecnico';
  const isAdminTab = currentTab === 'admin';

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
      {/* Aba Cliente: só abre chamado e acompanha suas OS aberta, verifica o técnico atribuído */}
      <TouchableOpacity
        style={[styles.navItem, isClienteTab && styles.navItemActive]}
        onPress={() => router.push('/cliente' as any)}
        accessibilityLabel="Ir para Aba do Cliente"
        testID="tab-nav-cliente"
      >
        <Ionicons
          name={isClienteTab ? 'person-circle' : 'person-circle-outline'}
          size={22}
          color={isClienteTab ? '#0284c7' : '#64748b'}
        />
        <Text style={[styles.navLabel, isClienteTab && styles.navLabelActive]}>
          Cliente
        </Text>
      </TouchableOpacity>

      {/* Aba Técnico: visualiza OS atribuída, fecha OS e tira foto da resolução do problema */}
      <TouchableOpacity
        style={[styles.navItem, isTecnicoTab && styles.navItemActive]}
        onPress={() => router.push('/tecnico' as any)}
        accessibilityLabel="Ir para Aba do Técnico"
        testID="tab-nav-tecnico"
      >
        <Ionicons
          name={isTecnicoTab ? 'construct' : 'construct-outline'}
          size={22}
          color={isTecnicoTab ? '#0284c7' : '#64748b'}
        />
        <Text style={[styles.navLabel, isTecnicoTab && styles.navLabelActive]}>
          Técnico
        </Text>
      </TouchableOpacity>

      {/* Aba Admin: controla todas as OS abertas, atribui a um técnico, conversa com cliente, analisa histórico */}
      <TouchableOpacity
        style={[styles.navItem, isAdminTab && styles.navItemActive]}
        onPress={() => router.push('/admin' as any)}
        accessibilityLabel="Ir para Aba do Administrador"
        testID="tab-nav-admin"
      >
        <Ionicons
          name={isAdminTab ? 'shield-checkmark' : 'shield-checkmark-outline'}
          size={22}
          color={isAdminTab ? '#0284c7' : '#64748b'}
        />
        <Text style={[styles.navLabel, isAdminTab && styles.navLabelActive]}>
          Admin
        </Text>
      </TouchableOpacity>

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
