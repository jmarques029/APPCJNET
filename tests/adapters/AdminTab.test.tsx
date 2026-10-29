import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import {
  AdminTabScreen,
  initializeSharedStore,
  sharedOsRepo,
} from '@/adapters/screens';
import { AppNavBar } from '@/adapters/screens/components/AppNavBar';
import { AuthProvider } from '@/adapters/context/AuthContext';
import { router } from 'expo-router';

// Mock do expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

describe('Aba do Administrador (AdminTabScreen) & AppNavBar', () => {
  beforeEach(() => {
    initializeSharedStore(true);
    jest.clearAllMocks();
  });

  it('deve carregar métricas gerais e listar todas as OSs abertas do sistema', async () => {
    const { getByText, getByTestId, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <AdminTabScreen />
      </AuthProvider>
    );

    await waitFor(
      () => {
        expect(getByText('CENTRAL DE CONTROLE • CJNET')).toBeTruthy();
        expect(getByText('OSs Abertas')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    expect(getByTestId('card-os-admin-OS-1001')).toBeTruthy();

    unmount();
  });

  it('deve abrir modal e atribuir um técnico a uma OS aberta', async () => {
    const { getByTestId, getByText, queryByText, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <AdminTabScreen initialTecnicoSelecionado="tec-marcos-02" />
      </AuthProvider>
    );

    await waitFor(
      () => {
        expect(getByTestId('btn-atribuir-tecnico-OS-1001')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    // Clica em Atribuir Técnico na OS-1001
    await act(async () => {
      fireEvent.press(getByTestId('btn-atribuir-tecnico-OS-1001'));
    });

    await waitFor(
      () => {
        expect(getByText('Atribuir Técnico de Campo')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    // Seleciona o técnico Marcos Oliveira
    const opcaoMarcos = getByTestId('opcao-tecnico-tec-marcos-02');
    await act(async () => {
      fireEvent.press(opcaoMarcos);
    });

    // Confirma despacho
    const btnConfirmar = getByTestId('btn-confirmar-atribuicao');
    await act(async () => {
      fireEvent.press(btnConfirmar);
    });

    await waitFor(
      async () => {
        const osAtualizada = await sharedOsRepo.buscarPorIdLocal('OS-1001');
        expect(osAtualizada?.tecnicoId).toBe('tec-marcos-02');
      },
      { timeout: 4000 }
    );

    await waitFor(
      () => {
        expect(queryByText('Atribuir Técnico de Campo')).toBeNull();
      },
      { timeout: 4000 }
    );

    unmount();
  });

  it('deve abrir conversa com cliente e permitir ao admin enviar mensagem direta', async () => {
    const { getByTestId, getByText, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <AdminTabScreen
          initialTextoMensagem="Olá Carlos, nosso técnico está a caminho!"
        />
      </AuthProvider>
    );

    await waitFor(
      () => {
        expect(getByTestId('btn-conversar-cliente-OS-1002')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    // Abre conversa da OS-1002
    await act(async () => {
      fireEvent.press(getByTestId('btn-conversar-cliente-OS-1002'));
    });

    await waitFor(
      () => {
        expect(getByText('Conversa com Cliente')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    // Dispara envio de mensagem do admin
    const btnSend = getByTestId('btn-enviar-mensagem-admin');
    await act(async () => {
      fireEvent.press(btnSend);
    });

    await waitFor(
      () => {
        expect(getByText('Olá Carlos, nosso técnico está a caminho!')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    unmount();
  });

  it('deve abrir histórico e timeline completo da OS até a conclusão', async () => {
    const { getByTestId, getByText, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <AdminTabScreen initialFiltro="TODAS" />
      </AuthProvider>
    );

    // Clica explicitamente no filtro "Todas"
    await waitFor(
      () => {
        expect(getByTestId('filtro-admin-todas')).toBeTruthy();
      },
      { timeout: 4000 }
    );
    await act(async () => {
      fireEvent.press(getByTestId('filtro-admin-todas'));
    });

    await waitFor(
      () => {
        expect(getByTestId('btn-historico-os-OS-1003')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    // Abre histórico da OS-1003 (já concluída)
    await act(async () => {
      fireEvent.press(getByTestId('btn-historico-os-OS-1003'));
    });

    await waitFor(
      () => {
        expect(getByText('Histórico Completo da OS')).toBeTruthy();
        expect(getByText('1. Abertura do Chamado')).toBeTruthy();
        expect(getByText('2. Atribuição de Técnico')).toBeTruthy();
        expect(getByText('3. Atendimento de Campo')).toBeTruthy();
        expect(getByText('4. Conclusão & Laudo Final')).toBeTruthy();
      },
      { timeout: 4000 }
    );

    unmount();
  });

  it('deve exibir apenas abas do cliente para o perfil cliente', async () => {
    const sessaoCliente = {
      accessToken: 'token-cli',
      refreshToken: 'ref-cli',
      userId: 'cli-01',
      role: 'cliente' as const,
      name: 'Cliente Demo',
    };
    const { getByTestId, queryByTestId, unmount } = await render(
      <AuthProvider autoRestore={false} initialSession={sessaoCliente}>
        <AppNavBar currentTab="cliente" />
      </AuthProvider>
    );

    expect(getByTestId('tab-nav-cliente')).toBeTruthy();
    expect(getByTestId('tab-nav-atividades')).toBeTruthy();
    expect(queryByTestId('tab-nav-tecnico')).toBeNull();
    expect(queryByTestId('tab-nav-admin')).toBeNull();

    const tabAtividades = getByTestId('tab-nav-atividades');
    await act(async () => {
      fireEvent.press(tabAtividades);
    });
    expect(router.push).toHaveBeenCalledWith('/atividades');
    unmount();
  });

  it('deve exibir apenas abas do técnico para o perfil técnico', async () => {
    const sessaoTecnico = {
      accessToken: 'token-tec',
      refreshToken: 'ref-tec',
      userId: 'tec-01',
      role: 'tecnico' as const,
      name: 'Tecnico Demo',
    };
    const { getByTestId, queryByTestId, unmount } = await render(
      <AuthProvider autoRestore={false} initialSession={sessaoTecnico}>
        <AppNavBar currentTab="tecnico" />
      </AuthProvider>
    );
    expect(getByTestId('tab-nav-tecnico')).toBeTruthy();
    expect(queryByTestId('tab-nav-cliente')).toBeNull();
    expect(queryByTestId('tab-nav-admin')).toBeNull();
    unmount();
  });

  it('deve exibir apenas abas do administrador para o perfil administrador', async () => {
    const sessaoAdmin = {
      accessToken: 'token-adm',
      refreshToken: 'ref-adm',
      userId: 'adm-01',
      role: 'admin' as const,
      name: 'Admin Demo',
    };
    const { getByTestId, queryByTestId, unmount } = await render(
      <AuthProvider autoRestore={false} initialSession={sessaoAdmin}>
        <AppNavBar currentTab="admin" />
      </AuthProvider>
    );
    expect(getByTestId('tab-nav-admin')).toBeTruthy();
    expect(queryByTestId('tab-nav-cliente')).toBeNull();
    expect(queryByTestId('tab-nav-tecnico')).toBeNull();
    unmount();
  });
});
