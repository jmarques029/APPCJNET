/**
 * app/admin.tsx
 * -------------
 * Rota do Expo Router: Aba do Administrador.
 * "Na aba admin ele controla todas as os aberta, atribui a um técnico, pode chegar a conversar com o cliente e fica analisando todo o historico da OS até a conclusão"
 */

import React from 'react';
import { AdminTabScreen } from '@/adapters/screens/AdminTabScreen';

export default function AdminRoute() {
  return <AdminTabScreen />;
}
