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
  currentTab: 'historico' | 'atividades' | 'assinatura';
  onSair?: () => void;
}

export function AppNavBar({ currentTab, onSair }: AppNavBarProps) {
  const { signOut } = useAuth();

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
      <TouchableOpacity
        style={[styles.navItem, currentTab === 'historico' && styles.navItemActive]}
        onPress={() => router.push('/historico' as any)}
        accessibilityLabel="Ir para Histórico de Chamados"
      >
        <Ionicons
          name={currentTab === 'historico' ? 'list' : 'list-outline'}
          size={22}
          color={currentTab === 'historico' ? '#0284c7' : '#64748b'}
        />
        <Text style={[styles.navLabel, currentTab === 'historico' && styles.navLabelActive]}>
          Histórico
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, currentTab === 'atividades' && styles.navItemActive]}
        onPress={() => router.push('/atividades' as any)}
        accessibilityLabel="Abrir Nova Ordem de Serviço"
      >
        <Ionicons
          name={currentTab === 'atividades' ? 'add-circle' : 'add-circle-outline'}
          size={22}
          color={currentTab === 'atividades' ? '#0284c7' : '#64748b'}
        />
        <Text style={[styles.navLabel, currentTab === 'atividades' && styles.navLabelActive]}>
          Nova OS
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, currentTab === 'assinatura' && styles.navItemActive]}
        onPress={() => router.push('/assinatura' as any)}
        accessibilityLabel="Ver Planos de Internet"
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

      <TouchableOpacity
        style={[styles.navItem, styles.navItemSair]}
        onPress={handleSair}
        accessibilityLabel="Sair da conta"
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
    paddingVertical: 10,
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
