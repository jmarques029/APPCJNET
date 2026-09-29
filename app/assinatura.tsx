/**
 * app/assinatura.tsx
 * ------------------
 * Rota do Expo Router (Boundary de Entrada Visual).
 * Conecta as interações do usuário à AssinaturaScreen (Vitrine de Planos & Assinatura)
 * da camada de adaptadores.
 */

import React from 'react';
import { AssinaturaScreen } from '@/adapters/screens/AssinaturaScreen';

export default function AssinaturaRoute() {
  return <AssinaturaScreen />;
}
