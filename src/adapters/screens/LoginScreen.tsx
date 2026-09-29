/**
 * LoginScreen.tsx
 * ---------------
 * Camada de Adaptadores de Interface (UI): Tela de Login e Acesso ao App CJnet.
 *
 * Atende aos requisitos:
 *  - UC03: Fazer Login e Rotear por Perfil
 *  - UC14 / RF11: Atalho público para "Ver Planos & Assinatura" sem necessidade de login
 *  - Layout construído com componentes nativos <View>, <Text>, <TextInput>, <TouchableOpacity>
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
import { useAuth } from '@/adapters/context/AuthContext';

export interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onVerPlanos?: () => void;
}

export function LoginScreen({ onLoginSuccess, onVerPlanos }: LoginScreenProps) {
  const { signIn, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState<string>('cliente@cjnet.com.br');
  const [senha, setSenha] = useState<string>('123456');
  const [senhaVisivel, setSenhaVisivel] = useState<boolean>(false);

  const handleEntrar = async () => {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Campos Obrigatórios', 'Informe seu e-mail/CPF e sua senha de acesso.');
      return;
    }

    const sucesso = await signIn(email.trim(), senha);
    if (sucesso) {
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        router.replace('/historico' as any);
      }
    }
  };

  const handleVerPlanos = () => {
    if (onVerPlanos) {
      onVerPlanos();
    } else {
      router.push('/assinatura' as any);
    }
  };

  const preencherPerfil = (tipo: 'cliente' | 'tecnico' | 'admin') => {
    clearError();
    if (tipo === 'cliente') {
      setEmail('cliente@cjnet.com.br');
      setSenha('123456');
    } else if (tipo === 'tecnico') {
      setEmail('tecnico@cjnet.com.br');
      setSenha('123456');
    } else {
      setEmail('admin@cjnet.com.br');
      setSenha('123456');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloco do Logo & Marca CJnet */}
        <View style={styles.logoBlock}>
          <View style={styles.logoCircle}>
            <Ionicons name="wifi" size={38} color="#ffffff" />
          </View>
          <Text style={styles.appTitle}>CJNET</Text>
          <Text style={styles.appSubtitle}>Fibra Óptica • Coqueiral/MG</Text>
        </View>

        {/* Card do Formulário de Acesso */}
        <View style={styles.cardForm}>
          <Text style={styles.formTitle}>Acessar Conta</Text>
          <Text style={styles.formSubtitle}>
            Entre com suas credenciais ou consulte nossos planos
          </Text>

          {/* Mensagem de Erro */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Input de Identificação (Email/CPF) */}
          <Text style={styles.inputLabel}>CPF ou E-mail</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="seu.email@cjnet.com.br ou CPF"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => {
                clearError();
                setEmail(t);
              }}
            />
          </View>

          {/* Input de Senha */}
          <Text style={styles.inputLabel}>Senha</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Digite sua senha"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!senhaVisivel}
              value={senha}
              onChangeText={(t) => {
                clearError();
                setSenha(t);
              }}
            />
            <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)}>
              <Ionicons
                name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={styles.btnEntrar}
            onPress={handleEntrar}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.btnEntrarText}>Entrar no App</Text>
            )}
          </TouchableOpacity>

          {/* Divisor */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botão Vitrine de Planos (UC14 / RF11) */}
          <TouchableOpacity
            style={styles.btnPlanos}
            onPress={handleVerPlanos}
          >
            <Ionicons name="sparkles" size={20} color="#0284c7" style={{ marginRight: 8 }} />
            <Text style={styles.btnPlanosText}>Ver Planos & Assinaturas</Text>
          </TouchableOpacity>
        </View>

        {/* Perfis de Demonstração Rápida */}
        <View style={styles.demoProfilesContainer}>
          <Text style={styles.demoTitle}>Simulação Rápida de Perfis:</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => preencherPerfil('cliente')}
            >
              <Text style={styles.demoChipText}>Cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => preencherPerfil('tecnico')}
            >
              <Text style={styles.demoChipText}>Técnico</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => preencherPerfil('admin')}
            >
              <Text style={styles.demoChipText}>Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rodapé Informativo */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            CJnet Provedor de Internet • Coqueiral/MG{'\n'}Suporte Local & Conexão de Alta Estabilidade
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  logoBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  cardForm: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginLeft: 8,
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  btnEntrar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 12,
    height: 52,
    marginTop: 6,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnEntrarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
    marginHorizontal: 12,
  },
  btnPlanos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  btnPlanosText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '700',
  },
  demoProfilesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 24,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  footerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
