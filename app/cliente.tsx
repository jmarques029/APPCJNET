/**
 * app/cliente.tsx
 * ---------------
 * Rota do Expo Router: Aba do Cliente.
 * "o cliente só abre chamado e acompanha suas OS aberta, abre os e verifica o técnico que será atribuido."
 */

import React from 'react';
import { ClienteTabScreen } from '@/adapters/screens/ClienteTabScreen';

export default function ClienteRoute() {
  return <ClienteTabScreen />;
}
