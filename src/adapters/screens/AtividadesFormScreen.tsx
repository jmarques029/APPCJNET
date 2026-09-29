/**
 * AtividadesFormScreen.tsx
 * ------------------------
 * Camada de Adaptadores de Interface (UI): Formulário de Abertura de Chamado /
 * Atividades de Ordem de Serviço (OS).
 *
 * Atende aos requisitos:
 *  - UC05: Abrir Ordem de Serviço
 *  - UC09: Tirar Foto do Roteador/ONU (Autodiagnóstico visual - RNF09 <= 1MB)
 *  - RF04, RF05, RF06: Registro local offline-first com UUID temporário
 *  - Layout construído com <View>, <Text>, <TextInput>, <TouchableOpacity>, <ScrollView>
 *  - Estilização exclusiva via StyleSheet e Flexbox (com flexDirection: 'column' como padrão)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TipoProblema, type TipoProblemaType } from '@/domain/value-objects/TipoProblema';
import { OrdemServico } from '@/domain/entities/OrdemServico';
import {
  sharedOsRepo,
  sharedClienteRepo,
  DEMO_CLIENTE_ID,
} from './mockStore';
import { AbrirOrdemServicoUseCase } from '@/application/use-cases';

export interface AtividadesFormScreenProps {
  clienteId?: string;
  initialDescricao?: string;
  onSuccess?: (os: OrdemServico) => void;
  onVoltar?: () => void;
}

interface TipoProblemaOption {
  valor: TipoProblemaType;
  titulo: string;
  subtitulo: string;
  icon: keyof typeof Ionicons.glyphMap;
  cor: string;
}

const OPCOES_PROBLEMA: TipoProblemaOption[] = [
  {
    valor: 'SEM_SINAL',
    titulo: 'Sem Sinal de Internet',
    subtitulo: 'Luz PON apagada ou piscando em vermelho na ONU/Roteador',
    icon: 'wifi-outline',
    cor: '#ef4444',
  },
  {
    valor: 'LENTIDAO',
    titulo: 'Lentidão na Conexão',
    subtitulo: 'Velocidade de download/upload muito abaixo do plano contratado',
    icon: 'speedometer-outline',
    cor: '#f59e0b',
  },
  {
    valor: 'QUEDA',
    titulo: 'Quedas Frequentes',
    subtitulo: 'Conexão caindo repetidamente ao longo do dia',
    icon: 'pulse-outline',
    cor: '#f97316',
  },
  {
    valor: 'OUTROS',
    titulo: 'Outro Motivo',
    subtitulo: 'Troca de cômodo, mudança de endereço ou dúvidas de cabeamento',
    icon: 'help-circle-outline',
    cor: '#3b82f6',
  },
];

export function AtividadesFormScreen({
  clienteId = DEMO_CLIENTE_ID,
  initialDescricao,
  onSuccess,
  onVoltar,
}: AtividadesFormScreenProps) {
  const [tipoProblema, setTipoProblema] = useState<TipoProblemaType>('SEM_SINAL');
  const [descricao, setDescricao] = useState<string>(initialDescricao ?? '');
  const [endereco, setEndereco] = useState<string>('Rua Direita, 120, Centro - Coqueiral/MG');
  const [fotoAnexada, setFotoAnexada] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [chamadoCriado, setChamadoCriado] = useState<OrdemServico | null>(null);

  const handleSimularFoto = () => {
    setFotoAnexada((prev) => !prev);
    if (!fotoAnexada) {
      Alert.alert(
        'Foto das Luzes do Roteador Anexada! 📸',
        'Imagem comprimida para 840 KB (em conformidade com o limite de 1 MB - RNF09). O técnico poderá visualizar o status das luzes PON/LOS antes da visita.',
        [{ text: 'Entendido' }]
      );
    }
  };

  const handleSubmeter = async () => {
    if (!descricao.trim()) {
      Alert.alert('Atenção', 'Por favor, descreva brevemente o problema enfrentado.');
      return;
    }

    setLoading(true);
    try {
      const useCase = new AbrirOrdemServicoUseCase(sharedOsRepo, sharedClienteRepo);

      const novaOS = await useCase.execute({
        clienteId,
        tipoProblema,
        descricao: descricao.trim(),
        foto: fotoAnexada
          ? {
              id: `foto-${Date.now()}`,
              fotoLocalPath: 'file:///storage/emulated/0/cjnet/onu-pon.jpg',
              tamanhoKb: 840,
            }
          : undefined,
      });

      setChamadoCriado(novaOS);

      if (onSuccess) {
        onSuccess(novaOS);
      } else {
        Alert.alert(
          'Chamado Aberto com Sucesso! 🎫',
          `Protocolo: #${novaOS.idLocal}\n\nSua solicitação foi salva localmente e enviada para a fila de atendimento da CJnet em Coqueiral/MG.`,
          [
            {
              text: 'Ver no Histórico',
              onPress: () => router.push('/historico' as any),
            },
            {
              text: 'Novo Chamado',
              onPress: () => {
                setDescricao('');
                setFotoAnexada(false);
                setChamadoCriado(null);
              },
            },
          ]
        );
      }
    } catch (err: unknown) {
      console.error('AtividadesFormScreen erro:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao registrar chamado';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    if (onVoltar) {
      onVoltar();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleVoltar}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerTexts}>
            <Text style={styles.badgeTop}>SUPORTE AO CLIENTE</Text>
            <Text style={styles.headerTitle}>Novo Chamado de Suporte</Text>
            <Text style={styles.headerSubtitle}>
              Preencha os detalhes para atendimento da equipe técnica CJnet
            </Text>
          </View>
        </View>

        {/* 1. Seleção do Tipo de Problema */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>1. Qual o tipo de problema?</Text>
          <View style={styles.opcoesContainer}>
            {OPCOES_PROBLEMA.map((opcao) => {
              const isSelected = tipoProblema === opcao.valor;

              return (
                <TouchableOpacity
                  key={opcao.valor}
                  activeOpacity={0.8}
                  style={[
                    styles.opcaoCard,
                    isSelected && { borderColor: opcao.cor, backgroundColor: '#f8fafc' },
                  ]}
                  onPress={() => setTipoProblema(opcao.valor)}
                >
                  <View style={styles.opcaoHeader}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: isSelected ? opcao.cor : '#f1f5f9' },
                      ]}
                    >
                      <Ionicons
                        name={opcao.icon}
                        size={20}
                        color={isSelected ? '#ffffff' : '#64748b'}
                      />
                    </View>
                    <View style={styles.opcaoTextos}>
                      <Text
                        style={[
                          styles.opcaoTitulo,
                          isSelected && { color: opcao.cor, fontWeight: '700' },
                        ]}
                      >
                        {opcao.titulo}
                      </Text>
                      <Text style={styles.opcaoSubtitulo}>{opcao.subtitulo}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? opcao.cor : '#cbd5e1'}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Descrição do Problema */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>2. Descrição detalhada</Text>
          <Text style={styles.inputHelp}>
            Conte-nos o que você está observando (desde quando começou, dispositivos afetados, etc.):
          </Text>
          <TextInput
            testID="input-descricao"
            style={styles.textArea}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Exemplo: As luzes do roteador ficaram vermelhas hoje pela manhã após a chuva e nenhum celular conecta no Wi-Fi."
            placeholderTextColor="#94a3b8"
            value={descricao}
            onChangeText={setDescricao}
          />
        </View>

        {/* 3. Autodiagnóstico Visual / Foto da ONU (RNF09) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>3. Autodiagnóstico Visual (Foto da ONU/Roteador)</Text>
          <Text style={styles.inputHelp}>
            Anexar foto das luzes do equipamento agiliza o diagnóstico do técnico em até 60%:
          </Text>

          <TouchableOpacity
            testID="btn-foto"
            style={[
              styles.fotoButton,
              fotoAnexada ? styles.fotoButtonAnexado : styles.fotoButtonVazio,
            ]}
            onPress={handleSimularFoto}
          >
            <Ionicons
              name={fotoAnexada ? 'checkmark-circle' : 'camera-outline'}
              size={28}
              color={fotoAnexada ? '#10b981' : '#0284c7'}
            />
            <View style={styles.fotoTextos}>
              <Text
                style={[
                  styles.fotoTitulo,
                  fotoAnexada ? { color: '#065f46' } : { color: '#0f172a' },
                ]}
              >
                {fotoAnexada ? 'Foto da ONU Anexada (840 KB)' : 'Tirar Foto das Luzes do Roteador'}
              </Text>
              <Text style={styles.fotoSubtitulo}>
                {fotoAnexada
                  ? 'Toque para remover ou substituir foto'
                  : 'Compressão automática <= 1 MB (RNF09)'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Endereço da Instalação */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>4. Ponto de Atendimento</Text>
          <View style={styles.enderecoContainer}>
            <Ionicons name="location-outline" size={20} color="#0284c7" />
            <TextInput
              style={styles.enderecoInput}
              value={endereco}
              onChangeText={setEndereco}
              placeholder="Endereço em Coqueiral/MG"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Botão de Envio */}
        <TouchableOpacity
          testID="btn-submeter"
          style={styles.submitButton}
          onPress={handleSubmeter}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Registrar Chamado Técnico</Text>
              <Ionicons name="send" size={18} color="#ffffff" style={styles.submitIcon} />
            </>
          )}
        </TouchableOpacity>

        {/* Mensagem de Confiabilidade Offline-First */}
        <View style={styles.offlineNotice}>
          <Ionicons name="cloud-offline-outline" size={18} color="#64748b" />
          <Text style={styles.offlineNoticeText}>
            Modo Offline-First ativo: o chamado é gravado localmente no dispositivo e sincronizado automaticamente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollContent: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTexts: {
    flexDirection: 'column',
  },
  badgeTop: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  sectionContainer: {
    flexDirection: 'column',
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  inputHelp: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 18,
  },
  opcoesContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  opcaoCard: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  opcaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  opcaoTextos: {
    flex: 1,
    flexDirection: 'column',
  },
  opcaoTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  opcaoSubtitulo: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: '#0f172a',
    minHeight: 100,
  },
  fotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  fotoButtonVazio: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
  },
  fotoButtonAnexado: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  fotoTextos: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 12,
  },
  fotoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  fotoSubtitulo: {
    fontSize: 12,
    color: '#64748b',
  },
  enderecoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  enderecoInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 10,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  submitIcon: {
    marginLeft: 8,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
  },
  offlineNoticeText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
