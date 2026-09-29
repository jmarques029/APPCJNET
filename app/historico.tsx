/**
 * app/historico.tsx
 * -----------------
 * Rota do Expo Router (Boundary de Entrada Visual).
 * Conecta as interações do usuário à HistoricoRelatoriosScreen (Histórico de Atendimentos
 * e Relatórios de Ordens de Serviço) da camada de adaptadores.
 */

import React from 'react';
import { HistoricoRelatoriosScreen } from '@/adapters/screens/HistoricoRelatoriosScreen';

export default function HistoricoRoute() {
  return <HistoricoRelatoriosScreen />;
}
