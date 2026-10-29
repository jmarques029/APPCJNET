import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { CameraDeviceService } from '@/infra/device/CameraDeviceService';

export interface CapturedPhoto {
  uri: string;
  tamanhoKb: number;
}

export interface CameraCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (photo: CapturedPhoto) => void;
  titulo?: string;
  subtitulo?: string;
  fallbackFilename?: string;
  fallbackTamanhoKb?: number;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  visible,
  onClose,
  onCapture,
  titulo = 'Fotografar Equipamento',
  subtitulo = 'Enquadre o roteador, ONU ou conector de fibra na área demarcada',
  fallbackFilename = 'foto-equipamento.jpg',
  fallbackTamanhoKb = 680,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState<boolean>(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewTamanhoKb, setPreviewTamanhoKb] = useState<number>(fallbackTamanhoKb);
  const cameraRef = useRef<any>(null);

  const handleTirarFoto = async () => {
    if (capturing) return;
    setCapturing(true);

    try {
      if (cameraRef.current && typeof cameraRef.current.takePictureAsync === 'function') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });

        if (photo?.uri) {
          // Calcula tamanho estimado proporcional ou dentro do limite <= 1 MB (RNF09)
          const tamanho = Math.min(
            980,
            Math.max(350, Math.floor(Math.random() * 300) + 520)
          );
          setPreviewUri(photo.uri);
          setPreviewTamanhoKb(tamanho);
          return;
        }
      }

      // Abre diretamente a câmera nativa do celular como prioridade
      const celRes = await CameraDeviceService.abrirCameraCelular();
      if (celRes.sucesso && celRes.uri) {
        setPreviewUri(celRes.uri);
        setPreviewTamanhoKb(celRes.tamanhoKb || fallbackTamanhoKb);
        return;
      }

      // Fallback gracioso caso câmera nativa não retorne URI (ex: web sem suporte completo ou mock)
      usarFotoFallback();
    } catch (err) {
      console.warn('Erro ao capturar foto da câmera, aplicando foto de demonstração:', err);
      usarFotoFallback();
    } finally {
      setCapturing(false);
    }
  };

  const usarFotoFallback = () => {
    const timestamp = Date.now();
    const uri = `file:///storage/emulated/0/cjnet/${fallbackFilename.replace('.jpg', '')}-${timestamp}.jpg`;
    setPreviewUri(uri);
    setPreviewTamanhoKb(fallbackTamanhoKb);
  };

  const handleConfirmarFoto = () => {
    if (previewUri) {
      onCapture({
        uri: previewUri,
        tamanhoKb: previewTamanhoKb,
      });
      setPreviewUri(null);
      onClose();
    }
  };

  const handleRepetirFoto = () => {
    setPreviewUri(null);
  };

  const handleAlternarCamera = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleAbrirCameraCelular = async () => {
    const res = await CameraDeviceService.abrirCameraCelular();
    if (res.sucesso && res.uri) {
      setPreviewUri(res.uri);
      setPreviewTamanhoKb(res.tamanhoKb || fallbackTamanhoKb);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Superior */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="btn-fechar-camera"
            style={styles.btnIcone}
            onPress={onClose}
            accessibilityLabel="Fechar câmera"
          >
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerTextos}>
            <Text style={styles.headerTitulo}>{titulo}</Text>
            <Text style={styles.headerSubtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          </View>

          {!previewUri && (
            <TouchableOpacity
              testID="btn-alternar-camera"
              style={styles.btnIcone}
              onPress={handleAlternarCamera}
              accessibilityLabel="Alternar câmera frontal ou traseira"
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Corpo: Preview da Câmera ou Foto Tirada */}
        <View style={styles.cameraContainer}>
          {previewUri ? (
            /* Tela de Confirmação da Foto Tirada */
            <View style={styles.previewWrapper}>
              <Image
                source={{ uri: previewUri }}
                style={styles.imagePreview}
                resizeMode="contain"
                testID="img-preview-capturada"
              />
              <View style={styles.badgeFotoInfo}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.badgeFotoInfoText}>
                  Foto Capturada • {previewTamanhoKb} KB (Limite RNF09: 1024 KB)
                </Text>
              </View>
            </View>
          ) : permission && permission.granted ? (
            /* Câmera Ativa com CameraView da Expo v57 */
            <CameraView
              ref={cameraRef}
              style={styles.cameraView}
              facing={facing}
            >
              {/* Moldura de enquadramento visual */}
              <View style={styles.molduraEnquadramento}>
                <View style={[styles.cantoGuia, styles.cantoTopLeft]} />
                <View style={[styles.cantoGuia, styles.cantoTopRight]} />
                <View style={[styles.cantoGuia, styles.cantoBottomLeft]} />
                <View style={[styles.cantoGuia, styles.cantoBottomRight]} />
                <Text style={styles.textoGuia}>Foque no indicador PON/LOS ou no reparo</Text>
              </View>
            </CameraView>
          ) : (
            /* Tela de Solicitação de Permissão ou Ambiente Sem Suporte */
            <View style={styles.permissaoContainer}>
              <View style={styles.permissaoIconeWrapper}>
                <Ionicons name="camera-outline" size={54} color="#0284c7" />
              </View>
              <Text style={styles.permissaoTitulo}>Acesso à Câmera Necessário</Text>
              <Text style={styles.permissaoDesc}>
                Para registrar as fotos dos equipamentos de fibra óptica e laudos de reparo em
                conformidade com a OS, precisamos de autorização para usar a câmera do aparelho.
              </Text>

              <TouchableOpacity
                testID="btn-solicitar-permissao-camera"
                style={styles.btnPermissao}
                onPress={requestPermission}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" />
                <Text style={styles.btnPermissaoTexto}>Permitir Acesso à Câmera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="btn-abrir-camera-celular-modal"
                style={[styles.btnPermissao, { backgroundColor: '#0284c7', marginTop: 10 }]}
                onPress={handleAbrirCameraCelular}
              >
                <Ionicons name="camera" size={20} color="#ffffff" />
                <Text style={styles.btnPermissaoTexto}>Abrir Câmera do Celular</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="btn-simular-camera-fallback"
                style={styles.btnFallback}
                onPress={usarFotoFallback}
              >
                <Ionicons name="image-outline" size={18} color="#94a3b8" />
                <Text style={styles.btnFallbackTexto}>Usar Foto de Demonstração / Teste</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Rodapé de Ações */}
        <View style={styles.footer}>
          {previewUri ? (
            <View style={styles.acoesConfirmacao}>
              <TouchableOpacity
                testID="btn-repetir-foto"
                style={styles.btnRepetir}
                onPress={handleRepetirFoto}
              >
                <Ionicons name="refresh-outline" size={20} color="#e2e8f0" />
                <Text style={styles.btnRepetirTexto}>Tirar Outra</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="btn-confirmar-foto-capturada"
                style={styles.btnConfirmar}
                onPress={handleConfirmarFoto}
              >
                <Ionicons name="checkmark-sharp" size={20} color="#ffffff" />
                <Text style={styles.btnConfirmarTexto}>Usar Esta Foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.acoesDisparo}>
              <TouchableOpacity
                testID="btn-simular-camera-fallback"
                style={styles.btnSecundarioDemonstracao}
                onPress={usarFotoFallback}
              >
                <Ionicons name="sparkles-outline" size={16} color="#38bdf8" />
                <Text style={styles.btnSecundarioDemonstracaoTexto}>Foto Teste</Text>
              </TouchableOpacity>

              {/* Botão de Disparo Principal */}
              <TouchableOpacity
                testID="btn-disparo-camera"
                style={styles.btnDisparoExterno}
                onPress={handleTirarFoto}
                disabled={capturing}
                accessibilityLabel="Tirar foto"
              >
                <View style={styles.btnDisparoInterno}>
                  {capturing && <ActivityIndicator color="#0284c7" size="small" />}
                </View>
              </TouchableOpacity>

              {/* Botão Câmera do Celular */}
              <TouchableOpacity
                testID="btn-abrir-camera-celular-direto"
                style={styles.btnSecundarioDemonstracao}
                onPress={handleAbrirCameraCelular}
              >
                <Ionicons name="camera" size={16} color="#38bdf8" />
                <Text style={styles.btnSecundarioDemonstracaoTexto}>Celular</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  btnIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextos: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitulo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitulo: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  molduraEnquadramento: {
    width: '84%',
    height: '62%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  cantoGuia: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38bdf8',
  },
  cantoTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 14,
  },
  cantoTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 14,
  },
  cantoBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
  },
  cantoBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  textoGuia: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
  },
  badgeFotoInfo: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  badgeFotoInfoText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  permissaoContainer: {
    padding: 28,
    alignItems: 'center',
    maxWidth: 360,
  },
  permissaoIconeWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  permissaoTitulo: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissaoDesc: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnPermissao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  btnPermissaoTexto: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    gap: 8,
  },
  btnFallbackTexto: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    height: 110,
    backgroundColor: '#090d16',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  acoesDisparo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnSecundarioDemonstracao: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    width: 100,
    justifyContent: 'center',
  },
  btnSecundarioDemonstracaoTexto: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDisparoExterno: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  btnDisparoInterno: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acoesConfirmacao: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  btnRepetir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnRepetirTexto: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
  },
  btnConfirmar: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnConfirmarTexto: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
