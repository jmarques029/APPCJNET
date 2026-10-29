import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CameraCaptureModal } from '@/adapters/components/CameraCaptureModal';
import { MapaDisponibilidadeModal } from '@/adapters/components/MapaDisponibilidadeModal';
import { LocationService, COQUEIRAL_COORDENADAS_PADRAO } from '@/infra/device/LocationService';
import * as Location from 'expo-location';
import { AbrirOrdemServicoUseCase } from '@/application/use-cases/ordens-servico/AbrirOrdemServicoUseCase';
import { ConcluirAtendimentoUseCase } from '@/application/use-cases/ordens-servico/ConcluirAtendimentoUseCase';
import { FakeOrdemServicoRepository } from '@/infra/fakes/FakeOrdemServicoRepository';
import { FakeClienteRepository } from '@/infra/fakes/FakeClienteRepository';
import { Cliente } from '@/domain/entities/Cliente';
import { PapelUsuario } from '@/domain/value-objects/PapelUsuario';
import { CpfCnpj } from '@/domain/value-objects/CpfCnpj';

describe('Funcionalidades de Câmera e Geolocalização (expo-camera & expo-location)', () => {
  describe('LocationService (Geolocalização GPS)', () => {
    it('deve obter a localização real quando permissão for concedida', async () => {
      const loc = await LocationService.obterLocalizacaoAtual();

      expect(loc.latitude).toBe(-21.1850);
      expect(loc.longitude).toBe(-45.4350);
      expect(loc.isFallback).toBe(false);
    });

    it('deve aplicar fallback seguro para Coqueiral/MG quando a permissão for negada', async () => {
      const originalMock = Location.requestForegroundPermissionsAsync;
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      } as any);

      const loc = await LocationService.obterLocalizacaoAtual();

      expect(loc.latitude).toBe(COQUEIRAL_COORDENADAS_PADRAO.latitude);
      expect(loc.longitude).toBe(COQUEIRAL_COORDENADAS_PADRAO.longitude);
      expect(loc.isFallback).toBe(true);
      expect(loc.mensagem).toContain('Permissão');

      (Location as any).requestForegroundPermissionsAsync = originalMock;
    });

    it('deve verificar status de permissão corretamente', async () => {
      const temPermissao = await LocationService.temPermissao();
      expect(temPermissao).toBe(true);
    });
  });

  describe('CameraCaptureModal (Componente de Câmera Expo v57)', () => {
    it('deve renderizar modal de câmera e permitir tirar e confirmar foto', async () => {
      const mockCapture = jest.fn();
      const mockClose = jest.fn();

      const { getByTestId, getByText } = await render(
        <CameraCaptureModal
          visible={true}
          onClose={mockClose}
          onCapture={mockCapture}
          titulo="Foto do Roteador / ONU"
          subtitulo="Enquadre as luzes PON/LOS"
          fallbackFilename="onu-pon.jpg"
          fallbackTamanhoKb={840}
        />
      );

      expect(getByText('Foto do Roteador / ONU')).toBeTruthy();
      expect(getByTestId('btn-disparo-camera')).toBeTruthy();

      // Dispara o botão de captura da câmera
      fireEvent.press(getByTestId('btn-disparo-camera'));

      // Aguarda tela de preview com foto capturada
      await waitFor(() => {
        expect(getByTestId('btn-confirmar-foto-capturada')).toBeTruthy();
        expect(getByTestId('btn-repetir-foto')).toBeTruthy();
      });

      // Confirma o uso da foto
      fireEvent.press(getByTestId('btn-confirmar-foto-capturada'));

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: expect.stringContaining('.jpg'),
          tamanhoKb: expect.any(Number),
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });

    it('deve permitir capturar foto via botão de teste/demonstração', async () => {
      const mockCapture = jest.fn();
      const mockClose = jest.fn();

      const { getAllByTestId, getByTestId } = await render(
        <CameraCaptureModal
          visible={true}
          onClose={mockClose}
          onCapture={mockCapture}
          fallbackFilename="teste-camera.jpg"
          fallbackTamanhoKb={500}
        />
      );

      const botoesTeste = getAllByTestId('btn-simular-camera-fallback');
      fireEvent.press(botoesTeste[0]);

      await waitFor(() => {
        expect(getByTestId('btn-confirmar-foto-capturada')).toBeTruthy();
      });

      fireEvent.press(getByTestId('btn-confirmar-foto-capturada'));
      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: expect.stringContaining('teste-camera'),
          tamanhoKb: 500,
        })
      );
    });

    it('deve fechar o modal ao tocar no botão fechar', async () => {
      const mockClose = jest.fn();
      const { getByTestId } = await render(
        <CameraCaptureModal
          visible={true}
          onClose={mockClose}
          onCapture={jest.fn()}
        />
      );

      fireEvent.press(getByTestId('btn-fechar-camera'));
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Fluxo Completo de Persistência com Câmera e Geolocalização', () => {
    it('deve salvar e carregar Ordem de Serviço com foto capturada e coordenadas GPS', async () => {
      const osRepo = new FakeOrdemServicoRepository();
      const clienteRepo = new FakeClienteRepository();

      // Cadastra cliente e técnico
      const cliente = new Cliente({
        id: 'cli-001',
        authUserId: 'auth-cli-001',
        nome: 'Cliente Coqueiral',
        cpfCnpj: new CpfCnpj('52998224725'),
        email: 'cliente@cjnet.com.br',
        papel: PapelUsuario.CLIENTE,
        telefone: '35999998888',
        statusContrato: 'ATIVO',
      });
      await clienteRepo.salvar(cliente);

      const tecnico = new Cliente({
        id: 'tec-001',
        authUserId: 'auth-tec-001',
        nome: 'Técnico Silva',
        cpfCnpj: new CpfCnpj('12345678909'),
        email: 'tecnico@cjnet.com.br',
        papel: PapelUsuario.TECNICO,
        telefone: '35988887777',
        statusContrato: 'ATIVO',
      });
      await clienteRepo.salvar(tecnico);

      // 1. Cliente abre OS com foto da câmera e coordenadas GPS
      const abrirUseCase = new AbrirOrdemServicoUseCase(osRepo, clienteRepo);
      const osCriada = await abrirUseCase.execute({
        clienteId: 'cli-001',
        tipoProblema: 'SEM_SINAL',
        descricao: 'Luz LOS vermelha piscando na ONU.',
        latitude: -21.1850,
        longitude: -45.4350,
        foto: {
          id: 'foto-cli-01',
          fotoLocalPath: 'file:///storage/emulated/0/cjnet/onu-camera.jpg',
          tamanhoKb: 720,
        },
      });

      expect(osCriada.idLocal).toBeDefined();
      expect(osCriada.coordenadas?.latitude).toBe(-21.1850);
      expect(osCriada.coordenadas?.longitude).toBe(-45.4350);
      expect(osCriada.fotos.length).toBe(1);
      expect(osCriada.fotos[0].tipo).toBe('CLIENTE_ROTEADOR');
      expect(osCriada.fotos[0].fotoLocalPath).toBe('file:///storage/emulated/0/cjnet/onu-camera.jpg');
      expect(osCriada.fotos[0].tamanhoKb).toBe(720);

      // Verifica recuperação do repositório
      const osSalva = await osRepo.buscarPorIdLocal(osCriada.idLocal);
      expect(osSalva).not.toBeNull();
      expect(osSalva?.coordenadas?.latitude).toBe(-21.1850);
      expect(osSalva?.fotos.length).toBe(1);

      // Técnico inicia o atendimento da OS
      osCriada.iniciarAtendimento(tecnico.id);
      await osRepo.salvar(osCriada);

      // 2. Técnico conclui a OS com foto da solução tirada pela câmera
      const concluirUseCase = new ConcluirAtendimentoUseCase(osRepo, clienteRepo);
      const osConcluida = await concluirUseCase.execute({
        idLocal: osCriada.idLocal,
        tecnicoId: 'tec-001',
        parecerTecnico: 'Conector óptico na caixa CTO refeito e potência em -19.2 dBm.',
        foto: {
          id: 'foto-tec-01',
          fotoLocalPath: 'file:///storage/emulated/0/cjnet/reparo-camera.jpg',
          tamanhoKb: 540,
        },
      });

      expect(osConcluida.status.value).toBe('CONCLUIDO');
      expect(osConcluida.fotos.length).toBe(2);
      expect(osConcluida.fotos[1].tipo).toBe('TECNICO_REPARO');
      expect(osConcluida.fotos[1].fotoLocalPath).toBe('file:///storage/emulated/0/cjnet/reparo-camera.jpg');

      // Verifica persistência final com 2 fotos e geolocalização mantida
      const osFinal = await osRepo.buscarPorIdLocal(osCriada.idLocal);
      expect(osFinal?.fotos.length).toBe(2);
      expect(osFinal?.coordenadas?.latitude).toBe(-21.1850);
      expect(osFinal?.parecerTecnico).toContain('Conector óptico');
    });
  });

  describe('MapaDisponibilidadeModal (Mapa de Cobertura e Disponibilidade Técnica)', () => {
    it('deve exibir mapa com localização inicial e confirmar disponibilidade técnica no Centro de Coqueiral', async () => {
      const mockClose = jest.fn();
      const mockConfirmar = jest.fn();

      const { getByTestId, getByText } = await render(
        <MapaDisponibilidadeModal
          visible={true}
          onClose={mockClose}
          onConfirmar={mockConfirmar}
          initialLatitude={-21.1850}
          initialLongitude={-45.4350}
          titulo="Mapa de Cobertura CJnet"
        />
      );

      // Aguarda avaliação da cobertura
      await waitFor(() => {
        expect(getByText(/Disponibilidade Confirmada!/i)).toBeTruthy();
      });

      // Confirma o ponto no mapa
      fireEvent.press(getByTestId('btn-confirmar-localizacao-mapa'));

      expect(mockConfirmar).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -21.1850,
          longitude: -45.4350,
          coberto: true,
          zonaAtendida: expect.any(String),
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });

    it('deve atualizar status dinamicamente para fora de cobertura ao simular Zona Rural', async () => {
      const mockClose = jest.fn();
      const mockConfirmar = jest.fn();

      const { getByTestId, getByText, getAllByText } = await render(
        <MapaDisponibilidadeModal
          visible={true}
          onClose={mockClose}
          onConfirmar={mockConfirmar}
          initialLatitude={-21.1850}
          initialLongitude={-45.4350}
        />
      );

      // Simula ponto na Zona Rural
      fireEvent.press(getByTestId('btn-mapa-testar-fora'));

      await waitFor(() => {
        expect(getAllByText(/Fora da Área de Cobertura/i).length).toBeGreaterThan(0);
      });

      // Confirma ponto fora de cobertura
      fireEvent.press(getByTestId('btn-confirmar-localizacao-mapa'));

      expect(mockConfirmar).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -21.2500,
          longitude: -45.5000,
          coberto: false,
        })
      );
    });
  });
});

