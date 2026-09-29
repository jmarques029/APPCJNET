import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/adapters/context/AuthContext';
import 'react-native-reanimated';

/**
 * RootLayout
 * ----------
 * Layout raiz do Expo Router (fronteira visual de navegação).
 * Configura o AuthProvider para controle de estado global e o Stack de telas.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="assinatura" />
          <Stack.Screen name="atividades" />
          <Stack.Screen name="historico" />
        </Stack>
        <StatusBar style="dark" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}