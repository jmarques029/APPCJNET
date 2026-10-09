import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  ClienteTabScreen,
  initializeSharedStore,
  DEMO_CLIENTE_ID,
} from '@/adapters/screens';
import { AuthProvider } from '@/adapters/context/AuthContext';

// Mock do expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

describe('Aba do Cliente (ClienteTabScreen)', () => {
  beforeEach(() => {
    initializeSharedStore(true);
    jest.clearAllMocks();
  });

  it('deve listar chamados abertos do cliente e exibir status e técnico atribuído ou pendente', async () => {
    const { getByText, getByTestId, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <ClienteTabScreen clienteId={DEMO_CLIENTE_ID} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('Minhas OSs em Aberto (2)')).toBeTruthy();
    });

    expect(getByTestId('card-os-cliente-OS-1001')).toBeTruthy();
    expect(getByTestId('tecnico-info-OS-1001')).toBeTruthy();
    expect(getByTestId('card-os-cliente-OS-1002')).toBeTruthy();
    expect(getByTestId('tecnico-info-OS-1002')).toBeTruthy();

    unmount();
  });

  it('deve permitir abrir modal e criar um novo chamado com descrição e foto de roteador', async () => {
    const mockSuccess = jest.fn();
    const { getByTestId, getByText, queryByText, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <ClienteTabScreen
          clienteId={DEMO_CLIENTE_ID}
          initialDescricao="Luz PON vermelha piscando na ONU da sala."
          onNovoChamadoSuccess={mockSuccess}
        />
      </AuthProvider>
    );

    // Clica em abrir novo chamado
    const btnNovo = getByTestId('btn-abrir-novo-chamado');
    fireEvent.press(btnNovo);

    await waitFor(() => {
      expect(getByText('Abrir Chamado Técnico')).toBeTruthy();
    });

    // Anexa foto do roteador
    const btnFoto = getByTestId('btn-anexar-foto-roteador');
    fireEvent.press(btnFoto);

    // Confirma abertura
    const btnConfirmar = getByTestId('btn-confirmar-abrir-os');
    fireEvent.press(btnConfirmar);

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalled();
    });

    unmount();
  });

  it('deve abrir detalhes da OS e verificar o técnico atribuído e informações de atendimento', async () => {
    const { getByTestId, getByText, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <ClienteTabScreen clienteId={DEMO_CLIENTE_ID} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText(/Minhas OSs em Aberto/)).toBeTruthy();
    });

    // Clica no card da OS-1002
    fireEvent.press(getByTestId('card-os-cliente-OS-1002'));

    await waitFor(() => {
      expect(getByTestId('modal-tecnico-detalhes')).toBeTruthy();
      expect(getByText('João Santos')).toBeTruthy();
      expect(getByText('TÉCNICO ATRIBUÍDO')).toBeTruthy();
      expect(getByText('Técnico de Campo - Fibra Óptica')).toBeTruthy();
    });

    unmount();
  });
});
