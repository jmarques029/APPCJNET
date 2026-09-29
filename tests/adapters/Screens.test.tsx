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
    it('deve carregar e renderizar os planos de fibra óptica disponíveis', async () => {
      const { getByText } = await render(<AssinaturaScreen />);

      await waitFor(() => {
        expect(getByText('Planos & Assinaturas')).toBeTruthy();
      });

      expect(getByText('CJnet Fibra 200 Mega')).toBeTruthy();
      expect(getByText('CJnet Fibra 400 Mega Ultra')).toBeTruthy();
      expect(getByText('PLANO MAIS POPULAR')).toBeTruthy();
      expect(getByText('CJnet Fibra 600 Mega Gamer')).toBeTruthy();
      expect(getByText('CJnet Fibra 1 Giga Dedicado')).toBeTruthy();
    });

    it('deve chamar callback onAssinarPlano ao tocar em Assinar Este Plano', async () => {
      const mockAssinar = jest.fn();
      const { getAllByText } = await render(<AssinaturaScreen onAssinarPlano={mockAssinar} />);

      await waitFor(() => {
        const botoes = getAllByText('Assinar Este Plano');
        expect(botoes.length).toBeGreaterThan(0);
        fireEvent.press(botoes[0]);
      });

      expect(mockAssinar).toHaveBeenCalled();
    });
  });

  describe('AtividadesFormScreen (Formulário de Abertura de Chamado Técnico / OS)', () => {
    it('deve renderizar campos de tipo de problema, descrição e foto do roteador', async () => {
      const { getByText, getByPlaceholderText } = await render(<AtividadesFormScreen />);

      expect(getByText('Novo Chamado de Suporte')).toBeTruthy();
      expect(getByText('Sem Sinal de Internet')).toBeTruthy();
      expect(getByText('Lentidão na Conexão')).toBeTruthy();
      expect(getByText('Quedas Frequentes')).toBeTruthy();
      expect(getByText('Tirar Foto das Luzes do Roteador')).toBeTruthy();
      expect(getByPlaceholderText(/Exemplo: As luzes do roteador/)).toBeTruthy();
      expect(getByText('Registrar Chamado Técnico')).toBeTruthy();
    });

    it('deve permitir alternar foto da ONU e disparar abertura de chamado com sucesso', async () => {
      const mockSuccess = jest.fn();
      const { getByText, getByTestId } = await render(
        <AtividadesFormScreen
          initialDescricao="Cabo de fibra rompido na fachada da residência."
          onSuccess={mockSuccess}
        />
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
  });

  describe('HistoricoRelatoriosScreen (Histórico de Chamados e Relatórios CJnet)', () => {
    it('deve carregar métricas do relatório e lista de ordens de serviço', async () => {
      const { getByText, getAllByText } = await render(<HistoricoRelatoriosScreen />);

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
    });

    it('deve filtrar os chamados ao tocar nos chips de filtro', async () => {
      const { getByText, getByTestId, queryByText } = await render(<HistoricoRelatoriosScreen />);

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
