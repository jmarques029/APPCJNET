import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/adapters/context/AuthContext';
import { SyncProvider } from '@/adapters/context/SyncContext';
import {
  initDatabase,
  SqliteSyncQueueRepository,
  SqliteOrdemServicoRepository,
  OfflineSyncManager,
} from '@/infra';
import 'react-native-reanimated';

/**
 * RootLayout
 * ----------
 * Layout raiz do Expo Router (fronteira visual de navegação).
 * Configura:
 *  - Inicialização do Banco de Dados Local SQLite (ecofield.db)
 *  - AuthProvider para autenticação e sessão segura
 *  - SyncProvider com suporte a Offline-First via SqliteSyncQueueRepository
 *  - Stack de navegação de telas do aplicativo
 */
export default function RootLayout() {
  const [syncQueueRepo, setSyncQueueRepo] = useState<SqliteSyncQueueRepository | undefined>(undefined);
  const [syncManager, setSyncManager] = useState<OfflineSyncManager | undefined>(undefined);

  useEffect(() => {
    async function setupDatabase() {
      try {
        const db = await initDatabase();
        const sqRepo = new SqliteSyncQueueRepository(db);
        const osRepo = new SqliteOrdemServicoRepository(db);
        const manager = new OfflineSyncManager(sqRepo, osRepo);
        setSyncQueueRepo(sqRepo);
        setSyncManager(manager);
      } catch (err) {
        console.error('Erro ao inicializar banco SQLite local:', err);
      }
    }
    setupDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SyncProvider
          syncQueueRepository={syncQueueRepo}
          onSync={syncManager ? () => syncManager.processQueue(true).then(() => {}) : undefined}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="cliente" />
            <Stack.Screen name="tecnico" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="assinatura" />
            <Stack.Screen name="atividades" />
            <Stack.Screen name="historico" />
          </Stack>
          <StatusBar style="dark" />
        </SyncProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}