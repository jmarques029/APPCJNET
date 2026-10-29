import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider } from '@/adapters/context/AuthContext';
import { ClienteTabScreen } from '@/adapters/screens/ClienteTabScreen';
import { TecnicoTabScreen } from '@/adapters/screens/TecnicoTabScreen';
import { AdminTabScreen } from '@/adapters/screens/AdminTabScreen';
import { initializeSharedStore } from '@/adapters/screens/mockStore';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

describe('Controle de Acesso Baseado em Papéis (RBAC)', () => {
  beforeEach(() => {
    initializeSharedStore(true);
    jest.clearAllMocks();
  });

  describe('Restrições de Acesso do CLIENTE', () => {
    const sessaoCliente = {
      accessToken: 'token-cliente',
      refreshToken: 'refresh-cliente',
      userId: 'cli-cjnet-01',
      role: 'cliente' as const,
      name: 'Carlos Eduardo Silva',
    };

    it('cliente NÃO deve ter acesso ao painel do Técnico e deve ver tela de bloqueio', async () => {
      const { getByText, queryByText, unmount } = await render(
        <AuthProvider autoRestore={false} initialSession={sessaoCliente}>
          <TecnicoTabScreen />
        </AuthProvider>
      );

      expect(getByText('Acesso Restrito a Técnicos')).toBeTruthy();
      expect(
        getByText(/Seu usuário está autenticado com o perfil de Cliente/)
      ).toBeTruthy();
      expect(queryByText('PAINEL DO TÉCNICO DE CAMPO')).toBeNull();
      unmount();
    });

    it('cliente NÃO deve ter acesso ao painel do Administrador e deve ver tela de bloqueio', async () => {
      const { getByText, queryByText, unmount } = await render(
        <AuthProvider autoRestore={false} initialSession={sessaoCliente}>
          <AdminTabScreen />
        </AuthProvider>
      );

      expect(getByText('Acesso Restrito a Administradores')).toBeTruthy();
      expect(
        getByText(/Seu usuário está autenticado com o perfil de Cliente/)
      ).toBeTruthy();
      expect(queryByText('CENTRAL DE CONTROLE • CJNET')).toBeNull();
      unmount();
    });
  });

  describe('Restrições de Acesso do TÉCNICO', () => {
    const sessaoTecnico = {
      accessToken: 'token-tecnico',
      refreshToken: 'refresh-tecnico',
      userId: 'tec-joao-01',
      role: 'tecnico' as const,
      name: 'João Santos',
    };

    it('técnico NÃO deve ter acesso ao painel do Cliente e deve ver tela de bloqueio', async () => {
      const { getByText, queryByText, unmount } = await render(
        <AuthProvider autoRestore={false} initialSession={sessaoTecnico}>
          <ClienteTabScreen />
        </AuthProvider>
      );

      expect(getByText('Acesso Restrito ao Cliente')).toBeTruthy();
      expect(
        getByText(/Seu usuário está autenticado com o perfil de Técnico de Campo/)
      ).toBeTruthy();
      expect(queryByText('PORTAL DO CLIENTE')).toBeNull();
      unmount();
    });

    it('técnico NÃO deve ter acesso ao painel do Administrador e deve ver tela de bloqueio', async () => {
      const { getByText, queryByText, unmount } = await render(
        <AuthProvider autoRestore={false} initialSession={sessaoTecnico}>
          <AdminTabScreen />
        </AuthProvider>
      );

      expect(getByText('Acesso Restrito a Administradores')).toBeTruthy();
      expect(
        getByText(/Seu usuário está autenticado com o perfil de Técnico de Campo/)
      ).toBeTruthy();
      expect(queryByText('CENTRAL DE CONTROLE • CJNET')).toBeNull();
      unmount();
    });
  });

  describe('Restrições de Acesso do ADMINISTRADOR', () => {
    const sessaoAdmin = {
      accessToken: 'token-admin',
      refreshToken: 'refresh-admin',
      userId: 'adm-01',
      role: 'admin' as const,
      name: 'Administrador CJnet',
    };

    it('administrador NÃO deve ter acesso ao painel do Cliente e deve ver tela de bloqueio', async () => {
      const { getByText, queryByText, unmount } = await render(
        <AuthProvider autoRestore={false} initialSession={sessaoAdmin}>
          <ClienteTabScreen />
        </AuthProvider>
      );

      expect(getByText('Acesso Restrito ao Cliente')).toBeTruthy();
      expect(
        getByText(/Seu usuário está autenticado com o perfil de Administrador \(NOC\)/)
      ).toBeTruthy();
      expect(queryByText('PORTAL DO CLIENTE')).toBeNull();
      unmount();
    });

    it('administrador NÃO deve ter acesso ao painel do Técnico e deve ver tela de bloqueio', async () => {
      const { getByText, queryByText, unmount } = await render(
        <AuthProvider autoRestore={false} initialSession={sessaoAdmin}>
          <TecnicoTabScreen />
        </AuthProvider>
      );

      expect(getByText('Acesso Restrito a Técnicos')).toBeTruthy();
      expect(
        getByText(/Seu usuário está autenticado com o perfil de Administrador \(NOC\)/)
      ).toBeTruthy();
      expect(queryByText('PAINEL DO TÉCNICO DE CAMPO')).toBeNull();
      unmount();
    });
  });
});
