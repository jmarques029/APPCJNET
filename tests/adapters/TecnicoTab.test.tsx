import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  TecnicoTabScreen,
  initializeSharedStore,
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

describe('Aba do Técnico (TecnicoTabScreen)', () => {
  beforeEach(() => {
    initializeSharedStore(true);
    jest.clearAllMocks();
  });

  it('deve listar as OSs atribuídas ao técnico', async () => {
    const { getByText, getByTestId, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <TecnicoTabScreen tecnicoId="tec-joao-01" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('PAINEL DO TÉCNICO DE CAMPO')).toBeTruthy();
    });

    // OS-1002 está atribuída a João Santos
    expect(getByTestId('card-os-tecnico-OS-1002')).toBeTruthy();

    unmount();
  });

  it('deve permitir abrir modal de fechamento, tirar foto da resolução, digitar parecer e concluir a OS', async () => {
    const mockSuccess = jest.fn();
    const { getByTestId, getByText, unmount } = await render(
      <AuthProvider autoRestore={false}>
        <TecnicoTabScreen
          tecnicoId="tec-joao-01"
          initialFotoResolucao={true}
          initialParecer="Conector óptico SC-APC substituído na caixa de atendimento e potência normalizada."
          onConcluirOSSuccess={mockSuccess}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('btn-fechar-os-OS-1002')).toBeTruthy();
    });

    // Clica em Fechar OS & Tirar Foto
    fireEvent.press(getByTestId('btn-fechar-os-OS-1002'));

    await waitFor(() => {
      expect(getByText('Concluir OS #OS-1002')).toBeTruthy();
    });

    // Tira foto da resolução
    const btnFoto = getByTestId('btn-tirar-foto-resolucao');
    fireEvent.press(btnFoto);

    await waitFor(() => {
      expect(getByText('Foto da Resolução Anexada! 📸')).toBeTruthy();
    });

    // Digita o parecer técnico da solução
    const inputParecer = getByTestId('input-parecer-tecnico');
    fireEvent.changeText(
      inputParecer,
      'Conector óptico SC-APC substituído na caixa de atendimento e potência normalizada.'
    );

    // Confirma fechamento
    const btnConcluir = getByTestId('btn-confirmar-fechamento-os');
    fireEvent.press(btnConcluir);

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalled();
    });

    unmount();
  });
});
