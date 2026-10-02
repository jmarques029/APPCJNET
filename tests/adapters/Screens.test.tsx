import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  AssinaturaScreen,
  AtividadesFormScreen,
  HistoricoRelatoriosScreen,
  LoginScreen,
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

describe('Camada de Interface do Usuário e Rotas (adapters/screens/)', () => {
  beforeEach(() => {
    initializeSharedStore();
    jest.clearAllMocks();
  });

  describe('AssinaturaScreen (Vitrine de Planos & Assinatura CJnet)', () => {
    it('deve carregar e renderizar os planos de fibra óptica disponíveis e botão sair', async () => {
      const { getByText, getAllByText } = await render(
        <AuthProvider autoRestore={false}>
          <AssinaturaScreen />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('Planos & Assinaturas')).toBeTruthy();
      });

      expect(getByText('CJnet Fibra 200 Mega')).toBeTruthy();
      expect(getByText('CJnet Fibra 400 Mega Ultra')).toBeTruthy();
      expect(getByText('PLANO MAIS POPULAR')).toBeTruthy();
      expect(getByText('CJnet Fibra 600 Mega Gamer')).toBeTruthy();
      expect(getByText('CJnet Fibra 1 Giga Dedicado')).toBeTruthy();
      expect(getAllByText('Sair').length).toBeGreaterThan(0);
    });

    it('deve chamar callback onAssinarPlano ao tocar em Assinar Este Plano', async () => {
      const mockAssinar = jest.fn();
      const { getAllByText } = await render(
        <AuthProvider autoRestore={false}>
          <AssinaturaScreen onAssinarPlano={mockAssinar} />
        </AuthProvider>
      );

      await waitFor(() => {
        const botoes = getAllByText('Assinar Este Plano');
        expect(botoes.length).toBeGreaterThan(0);
        fireEvent.press(botoes[0]);
      });

      expect(mockAssinar).toHaveBeenCalled();
    });

    it('deve chamar callback onSair ao tocar no botão Sair', async () => {
      const mockSair = jest.fn();
      const { getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <AssinaturaScreen onSair={mockSair} />
        </AuthProvider>
      );

      const btnSair = getByTestId('btn-sair-header');
      fireEvent.press(btnSair);
      expect(mockSair).toHaveBeenCalled();
    });
  });

  describe('AtividadesFormScreen (Formulário de Abertura de Chamado Técnico / OS)', () => {
    it('deve renderizar campos de tipo de problema, descrição e botão sair', async () => {
      const { getByText, getByPlaceholderText, getAllByText } = await render(
        <AuthProvider autoRestore={false}>
          <AtividadesFormScreen />
        </AuthProvider>
      );

      expect(getByText('Novo Chamado de Suporte')).toBeTruthy();
      expect(getByText('Sem Sinal de Internet')).toBeTruthy();
      expect(getByText('Lentidão na Conexão')).toBeTruthy();
      expect(getByText('Quedas Frequentes')).toBeTruthy();
      expect(getByText('Tirar Foto das Luzes do Roteador')).toBeTruthy();
      expect(getByPlaceholderText(/Exemplo: As luzes do roteador/)).toBeTruthy();
      expect(getByText('Registrar Chamado Técnico')).toBeTruthy();
      expect(getAllByText('Sair').length).toBeGreaterThan(0);
    });

    it('deve permitir alternar foto da ONU e disparar abertura de chamado com sucesso', async () => {
      const mockSuccess = jest.fn();
      const { getByText, getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <AtividadesFormScreen
            initialDescricao="Cabo de fibra rompido na fachada da residência."
            onSuccess={mockSuccess}
          />
        </AuthProvider>
      );

      // Anexa foto
      const btnFoto = getByTestId('btn-foto');
      fireEvent.press(btnFoto);

      await waitFor(() => {
        expect(getByText('Foto da ONU Anexada (840 KB)')).toBeTruthy();
      });

      // Submete
      const btnEnviar = getByTestId('btn-submeter');
      fireEvent.press(btnEnviar);

      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            descricao: 'Cabo de fibra rompido na fachada da residência.',
          })
        );
      });
    });

    it('deve chamar callback onSair ao tocar no botão Sair', async () => {
      const mockSair = jest.fn();
      const { getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <AtividadesFormScreen onSair={mockSair} />
        </AuthProvider>
      );

      const btnSair = getByTestId('btn-sair-header');
      fireEvent.press(btnSair);
      expect(mockSair).toHaveBeenCalled();
    });
  });

  describe('HistoricoRelatoriosScreen (Histórico de Chamados e Relatórios CJnet)', () => {
    it('deve carregar métricas do relatório, lista de chamados e botão sair', async () => {
      const { getByText, getAllByText } = await render(
        <AuthProvider autoRestore={false}>
          <HistoricoRelatoriosScreen />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('Histórico & Relatórios')).toBeTruthy();
        expect(getByText('Métricas de Atendimento')).toBeTruthy();
        expect(getByText('Total OSs')).toBeTruthy();
        expect(getAllByText('Pendentes').length).toBeGreaterThan(0);
        expect(getByText('Em Andamento')).toBeTruthy();
        expect(getAllByText('Concluídas').length).toBeGreaterThan(0);
      });

      // Verifica itens do histórico mockado
      expect(getByText('#OS-1001')).toBeTruthy();
      expect(getByText('#OS-1002')).toBeTruthy();
      expect(getByText('#OS-1003')).toBeTruthy();
      expect(getByText('PARECER TÉCNICO CJNET')).toBeTruthy();
      expect(getAllByText('Sair').length).toBeGreaterThan(0);
    });

    it('deve filtrar os chamados ao tocar nos chips de filtro', async () => {
      const { getByText, getByTestId, queryByText } = await render(
        <AuthProvider autoRestore={false}>
          <HistoricoRelatoriosScreen />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('#OS-1001')).toBeTruthy();
      });

      // Toca em Concluídas via testID
      const chipConcluidas = getByTestId('filtro-concluido');
      fireEvent.press(chipConcluidas);

      await waitFor(() => {
        expect(getByText('#OS-1003')).toBeTruthy();
        expect(queryByText('#OS-1001')).toBeNull();
      });
    });

    it('deve abrir modal com andamento e técnico ao tocar no card da OS', async () => {
      const { getByText, getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <HistoricoRelatoriosScreen />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('#OS-1002')).toBeTruthy();
      });

      const card = getByTestId('os-card-OS-1002');
      fireEvent.press(card);

      await waitFor(() => {
        expect(getByText('Andamento do Atendimento')).toBeTruthy();
        expect(getByText('Técnico Responsável')).toBeTruthy();
        expect(getByText('João Santos')).toBeTruthy();
      });

      const btnFechar = getByTestId('btn-fechar-modal-os');
      fireEvent.press(btnFechar);
    });

    it('deve chamar callback onSair ao tocar no botão Sair', async () => {
      const mockSair = jest.fn();
      const { getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <HistoricoRelatoriosScreen onSair={mockSair} />
        </AuthProvider>
      );

      const btnSair = getByTestId('btn-sair-header');
      fireEvent.press(btnSair);
      expect(mockSair).toHaveBeenCalled();
    });

    it('deve exibir apenas as OSs abertas pelo próprio cliente logado e o técnico atribuído, sem exibir OSs de terceiros', async () => {
      const sessionCliente = {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
        userId: 'cli-cjnet-01',
        role: 'cliente' as const,
        name: 'Carlos Eduardo Silva',
      };

      const { getByText, getAllByText, queryByText } = await render(
        <AuthProvider autoRestore={false} initialSession={sessionCliente}>
          <HistoricoRelatoriosScreen />
        </AuthProvider>
      );

      await waitFor(() => {
        // OSs abertas por Carlos Eduardo
        expect(getByText('#OS-1001')).toBeTruthy();
        expect(getByText('#OS-1002')).toBeTruthy();
        expect(getByText('#OS-1003')).toBeTruthy();
      });

      // Verifica exibição do técnico atribuído e andamento
      expect(getByText('Técnico Atribuído: João Santos')).toBeTruthy();
      expect(getAllByText('Aguardando Atribuição de Técnico').length).toBeGreaterThan(0);

      // OS de outro cliente (Maria Fernandes) NUNCA deve aparecer para o Carlos!
      expect(queryByText('#OS-2001')).toBeNull();
    });
  });

  describe('LoginScreen (Autenticação e Acesso com atalho a Planos)', () => {
    it('deve renderizar campos de login e botão Ver Planos & Assinaturas', async () => {
      const { getByText, getByPlaceholderText } = await render(
        <AuthProvider autoRestore={false}>
          <LoginScreen />
        </AuthProvider>
      );

      expect(getByText('CJNET')).toBeTruthy();
      expect(getByText('Fibra Óptica • Coqueiral/MG')).toBeTruthy();
      expect(getByPlaceholderText(/seu.email@cjnet.com.br ou CPF/)).toBeTruthy();
      expect(getByText('Entrar no App')).toBeTruthy();
      expect(getByText('Ver Planos & Assinaturas')).toBeTruthy();
    });

    it('deve chamar callback onVerPlanos ao tocar no botão de planos', async () => {
      const mockVerPlanos = jest.fn();
      const { getByText } = await render(
        <AuthProvider autoRestore={false}>
          <LoginScreen onVerPlanos={mockVerPlanos} />
        </AuthProvider>
      );

      const btnPlanos = getByText('Ver Planos & Assinaturas');
      fireEvent.press(btnPlanos);

      expect(mockVerPlanos).toHaveBeenCalled();
    });
  });
});
