import React from 'react';
import { View, Text, Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  AuthProvider,
  useAuth,
  AuthContext,
} from '@/adapters/context/AuthContext';
import type {
  ISessionStorage,
  SessionData,
  UserRole,
} from '@/adapters/storage/SessionStorageAdapter';

class FakeSessionStorage implements ISessionStorage {
  private currentSession: SessionData | null = null;

  async save(session: SessionData): Promise<void> {
    this.currentSession = { ...session };
  }

  async get(): Promise<SessionData | null> {
    return this.currentSession;
  }

  async getToken(): Promise<string | null> {
    return this.currentSession?.accessToken ?? null;
  }

  async getRole(): Promise<UserRole | null> {
    return this.currentSession?.role ?? null;
  }

  async updateToken(newToken: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.accessToken = newToken;
    }
  }

  async clear(): Promise<void> {
    this.currentSession = null;
  }
}

const TestAuthConsumer = () => {
  const {
    user,
    role,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signOut,
    clearError,
    refreshSession,
  } = useAuth();

  return (
    <View>
      <Text testID="loading">{isLoading ? 'loading' : 'idle'}</Text>
      <Text testID="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</Text>
      <Text testID="user-name">{user?.name ?? 'none'}</Text>
      <Text testID="user-role">{role ?? 'none'}</Text>
      <Text testID="error-msg">{error ?? 'none'}</Text>
      <Button
        testID="btn-signin-success"
        title="Sign In Success"
        onPress={() => signIn('cliente@cjnet.com.br', 'senha123')}
      />
      <Button
        testID="btn-signin-fail"
        title="Sign In Fail"
        onPress={() => signIn('invalido@cjnet.com.br', 'errada')}
      />
      <Button testID="btn-signout" title="Sign Out" onPress={() => signOut()} />
      <Button testID="btn-clear-error" title="Clear Error" onPress={() => clearError()} />
      <Button testID="btn-refresh" title="Refresh" onPress={() => refreshSession()} />
    </View>
  );
};

describe('Adapters Layer - AuthContext & useAuth', () => {
  let fakeStorage: FakeSessionStorage;

  beforeEach(() => {
    fakeStorage = new FakeSessionStorage();
  });

  it('deve lançar erro se useAuth for utilizado fora do AuthProvider', async () => {
    const originalError = console.error;
    console.error = jest.fn();

    await expect(render(<TestAuthConsumer />)).rejects.toThrow(
      'useAuth deve ser utilizado dentro de um AuthProvider'
    );

    console.error = originalError;
  });

  it('deve iniciar desautenticado quando não houver sessão salva', async () => {
    const { getByTestId } = await render(
      <AuthProvider sessionStorage={fakeStorage} autoRestore={true}>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('idle');
    });

    expect(getByTestId('auth-status').props.children).toBe('unauthenticated');
    expect(getByTestId('user-name').props.children).toBe('none');
    expect(getByTestId('user-role').props.children).toBe('none');
  });

  it('deve restaurar a sessão existente no ciclo de vida inicial', async () => {
    const savedSession: SessionData = {
      accessToken: 'saved-jwt-token',
      refreshToken: 'saved-refresh-token',
      userId: 'user-123',
      role: 'tecnico',
      name: 'João Técnico',
    };
    await fakeStorage.save(savedSession);

    const { getByTestId } = await render(
      <AuthProvider sessionStorage={fakeStorage} autoRestore={true}>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('idle');
    });

    expect(getByTestId('auth-status').props.children).toBe('authenticated');
    expect(getByTestId('user-name').props.children).toBe('João Técnico');
    expect(getByTestId('user-role').props.children).toBe('tecnico');
  });

  it('deve autenticar usuário com sucesso via signIn e atualizar o estado', async () => {
    const mockSignInService = jest.fn().mockResolvedValue({
      success: true,
      role: 'cliente' as UserRole,
    });

    const { getByTestId } = await render(
      <AuthProvider
        sessionStorage={fakeStorage}
        authServiceSignIn={mockSignInService}
        autoRestore={false}
      >
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(getByTestId('auth-status').props.children).toBe('unauthenticated');

    fireEvent.press(getByTestId('btn-signin-success'));

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('authenticated');
    });

    expect(getByTestId('user-role').props.children).toBe('cliente');
    expect(getByTestId('error-msg').props.children).toBe('none');
    expect(mockSignInService).toHaveBeenCalledWith('cliente@cjnet.com.br', 'senha123');

    const stored = await fakeStorage.get();
    expect(stored?.role).toBe('cliente');
  });

  it('deve registrar erro ao falhar autenticação via signIn', async () => {
    const mockSignInService = jest.fn().mockResolvedValue({
      success: false,
      error: 'CPF ou senha inválidos',
    });

    const { getByTestId } = await render(
      <AuthProvider
        sessionStorage={fakeStorage}
        authServiceSignIn={mockSignInService}
        autoRestore={false}
      >
        <TestAuthConsumer />
      </AuthProvider>
    );

    fireEvent.press(getByTestId('btn-signin-fail'));

    await waitFor(() => {
      expect(getByTestId('error-msg').props.children).toBe('CPF ou senha inválidos');
    });

    expect(getByTestId('auth-status').props.children).toBe('unauthenticated');
  });

  it('deve limpar erro com clearError', async () => {
    const mockSignInService = jest.fn().mockResolvedValue({
      success: false,
      error: 'Erro temporário',
    });

    const { getByTestId } = await render(
      <AuthProvider
        sessionStorage={fakeStorage}
        authServiceSignIn={mockSignInService}
        autoRestore={false}
      >
        <TestAuthConsumer />
      </AuthProvider>
    );

    fireEvent.press(getByTestId('btn-signin-fail'));

    await waitFor(() => {
      expect(getByTestId('error-msg').props.children).toBe('Erro temporário');
    });

    fireEvent.press(getByTestId('btn-clear-error'));

    await waitFor(() => {
      expect(getByTestId('error-msg').props.children).toBe('none');
    });
  });

  it('deve realizar logout limpando sessão do storage e redefinindo o estado', async () => {
    const activeSession: SessionData = {
      accessToken: 'token-ativo',
      refreshToken: 'refresh-ativo',
      userId: 'user-admin',
      role: 'admin',
      name: 'Gestor CJnet',
    };
    await fakeStorage.save(activeSession);

    const { getByTestId } = await render(
      <AuthProvider
        sessionStorage={fakeStorage}
        initialSession={activeSession}
        autoRestore={false}
      >
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(getByTestId('auth-status').props.children).toBe('authenticated');
    expect(getByTestId('user-role').props.children).toBe('admin');

    fireEvent.press(getByTestId('btn-signout'));

    await waitFor(() => {
      expect(getByTestId('auth-status').props.children).toBe('unauthenticated');
    });

    expect(getByTestId('user-name').props.children).toBe('none');
    expect(getByTestId('user-role').props.children).toBe('none');

    const stored = await fakeStorage.get();
    expect(stored).toBeNull();
  });
});
