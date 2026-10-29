/**
 * app/index.tsx
 * -------------
 * Ponto de entrada inicial do aplicativo CJnet (Boundary Visual).
 * Renderiza a LoginScreen da camada de adaptadores e delega o ciclo de navegação.
 */

import React, { useEffect } from 'react';
import { LoginScreen } from '@/adapters/screens/LoginScreen';
import { useAuth } from '@/adapters/context/AuthContext';
import { router } from 'expo-router';

export default function IndexRoute() {
  const { isAuthenticated, role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      if (role === 'admin') {
        router.replace('/admin' as any);
      } else if (role === 'tecnico') {
        router.replace('/tecnico' as any);
      } else {
        router.replace('/cliente' as any);
      }
    }
  }, [isAuthenticated, role, isLoading]);

  return <LoginScreen />;
}