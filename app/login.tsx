/**
 * app/login.tsx
 * -------------
 * Rota do Expo Router (Boundary de Entrada Visual).
 * Conecta as interações do usuário à LoginScreen da camada de adaptadores.
 */

import React from 'react';
import { LoginScreen } from '@/adapters/screens/LoginScreen';

export default function LoginRoute() {
  return <LoginScreen />;
}
