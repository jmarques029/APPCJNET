/**
 * app/index.tsx
 * -------------
 * Ponto de entrada inicial do aplicativo CJnet (Boundary Visual).
 * Renderiza a LoginScreen da camada de adaptadores e delega o ciclo de navegação.
 */

import React from 'react';
import { LoginScreen } from '@/adapters/screens/LoginScreen';

export default function IndexRoute() {
  return <LoginScreen />;
}