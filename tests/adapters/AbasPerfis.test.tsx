import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import {
  ClienteTabScreen,
  TecnicoTabScreen,
  AdminTabScreen,
  initializeSharedStore,
  sharedOsRepo,
  DEMO_CLIENTE_ID,
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

describe('Testes das Novas Abas por Perfil e Funcionalidades', () => {
  beforeAll(() => {
    initializeSharedStore(true);
  });

  beforeEach(() => {
    initializeSharedStore();
    jest.clearAllMocks();
  });

  describe('1. Aba do Cliente (ClienteTabScreen)', () => {
    it('deve listar chamados abertos do cliente e exibir status e técnico atribuído ou pendente', async () => {
      const { getByText, getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <ClienteTabScreen clienteId={DEMO_CLIENTE_ID} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('Minhas OSs em Aberto (2)')).toBeTruthy();
      });

      // OS-1001 é pendente de técnico
      expect(getByTestId('card-os-cliente-OS-1001')).toBeTruthy();
      expect(getByTestId('tecnico-info-OS-1001')).toBeTruthy();

      // OS-1002 já está atribuída a João Santos
      expect(getByTestId('card-os-cliente-OS-1002')).toBeTruthy();
      expect(getByTestId('tecnico-info-OS-1002')).toBeTruthy();
    });

    it('deve permitir abrir modal e criar um novo chamado com descrição e foto de roteador', async () => {
      const mockSuccess = jest.fn();
      const { getByTestId, getByText } = await render(
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
    });

    it('deve abrir detalhes da OS e permitir enviar mensagem no chat com a central', async () => {
      const { getByTestId, getByText } = await render(
        <AuthProvider autoRestore={false}>
          <ClienteTabScreen
            clienteId={DEMO_CLIENTE_ID}
            initialNovaMensagem="Obrigado, estarei no portão aguardando o técnico."
          />
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
      });

      // Envia a mensagem no chat
      const btnEnviar = getByTestId('btn-enviar-mensagem-cliente');
      fireEvent.press(btnEnviar);

      await waitFor(() => {
        expect(getByText('Obrigado, estarei no portão aguardando o técnico.')).toBeTruthy();
      });
    });
  });

  describe('2. Aba do Técnico (TecnicoTabScreen)', () => {
    it('deve listar as OSs atribuídas ao técnico', async () => {
      const { getByText, getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <TecnicoTabScreen tecnicoId="tec-joao-01" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('PAINEL DO TÉCNICO DE CAMPO')).toBeTruthy();
      });

      // OS-1002 está atribuída a João Santos
      expect(getByTestId('card-os-tecnico-OS-1002')).toBeTruthy();
    });

    it('deve permitir abrir modal de fechamento, tirar foto da resolução, digitar parecer e concluir a OS', async () => {
      const mockSuccess = jest.fn();
      const { getByTestId, getByText } = await render(
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
    });
  });

  describe('3. Aba do Administrador (AdminTabScreen)', () => {
    it('deve carregar métricas gerais e listar todas as OSs abertas do sistema', async () => {
      const { getByText, getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <AdminTabScreen />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByText('CENTRAL DE CONTROLE • CJNET')).toBeTruthy();
        expect(getByText('OSs Abertas')).toBeTruthy();
      });

      expect(getByTestId('card-os-admin-OS-1001')).toBeTruthy();
    });

    it('deve abrir modal e atribuir um técnico a uma OS aberta', async () => {
      const { getByTestId, getByText } = await render(
        <AuthProvider autoRestore={false}>
          <AdminTabScreen initialTecnicoSelecionado="tec-marcos-02" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('btn-atribuir-tecnico-OS-1001')).toBeTruthy();
      });

      // Clica em Atribuir Técnico na OS-1001
      fireEvent.press(getByTestId('btn-atribuir-tecnico-OS-1001'));

      await waitFor(() => {
        expect(getByText('Atribuir Técnico de Campo')).toBeTruthy();
      });

      // Seleciona o técnico Marcos Oliveira
      const opcaoMarcos = getByTestId('opcao-tecnico-tec-marcos-02');
      fireEvent.press(opcaoMarcos);

      // Confirma despacho
      const btnConfirmar = getByTestId('btn-confirmar-atribuicao');
      fireEvent.press(btnConfirmar);

      await waitFor(async () => {
        const osAtualizada = await sharedOsRepo.buscarPorIdLocal('OS-1001');
        expect(osAtualizada?.tecnicoId).toBe('tec-marcos-02');
      });
    });

    it('deve abrir conversa com cliente e permitir ao admin enviar mensagem direta', async () => {
      const { getByTestId, getByText } = await render(
        <AuthProvider autoRestore={false}>
          <AdminTabScreen
            initialTextoMensagem="Olá Carlos, nosso técnico está a caminho!"
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('btn-conversar-cliente-OS-1002')).toBeTruthy();
      });

      // Abre conversa da OS-1002
      fireEvent.press(getByTestId('btn-conversar-cliente-OS-1002'));

      await waitFor(() => {
        expect(getByText('Conversa com Cliente')).toBeTruthy();
      });

      // Dispara envio de mensagem do admin
      const btnSend = getByTestId('btn-enviar-mensagem-admin');
      fireEvent.press(btnSend);

      await waitFor(() => {
        expect(getByText('Olá Carlos, nosso técnico está a caminho!')).toBeTruthy();
      });
    });

    it('deve abrir histórico e timeline completo da OS até a conclusão', async () => {
      const { getByTestId, getByText } = await render(
        <AuthProvider autoRestore={false}>
          <AdminTabScreen initialFiltro="TODAS" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('btn-historico-os-OS-1003')).toBeTruthy();
      });

      // Abre histórico da OS-1003 (já concluída)
      fireEvent.press(getByTestId('btn-historico-os-OS-1003'));

      await waitFor(() => {
        expect(getByText('Histórico Completo da OS')).toBeTruthy();
        expect(getByText('1. Abertura do Chamado')).toBeTruthy();
        expect(getByText('2. Atribuição de Técnico')).toBeTruthy();
        expect(getByText('3. Atendimento de Campo')).toBeTruthy();
        expect(getByText('4. Conclusão & Laudo Final')).toBeTruthy();
      });
    });
  });

  describe('4. Barra de Navegação Inferior (AppNavBar)', () => {
    it('deve navegar entre as abas cliente, tecnico e admin ao tocar nos botões', async () => {
      const { getByTestId } = await render(
        <AuthProvider autoRestore={false}>
          <AppNavBar currentTab="cliente" />
        </AuthProvider>
      );

      const tabTecnico = getByTestId('tab-nav-tecnico');
      fireEvent.press(tabTecnico);
      expect(router.push).toHaveBeenCalledWith('/tecnico');

      const tabAdmin = getByTestId('tab-nav-admin');
      fireEvent.press(tabAdmin);
      expect(router.push).toHaveBeenCalledWith('/admin');

      const tabCliente = getByTestId('tab-nav-cliente');
      fireEvent.press(tabCliente);
      expect(router.push).toHaveBeenCalledWith('/cliente');
    });
  });
});
