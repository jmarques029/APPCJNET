/**
 * app/atividades.tsx
 * ------------------
 * Rota do Expo Router (Boundary de Entrada Visual).
 * Conecta as interações do usuário à AtividadesFormScreen (Abertura de Chamado Técnico / OS)
 * da camada de adaptadores.
 */

import React from 'react';
import { AtividadesFormScreen } from '@/adapters/screens/AtividadesFormScreen';

export default function AtividadesRoute() {
  return <AtividadesFormScreen />;
}
