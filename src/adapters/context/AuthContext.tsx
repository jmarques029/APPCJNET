/**
 * AuthContext.tsx
 * ----------------
 * Context API para Gerenciamento de Estado Global de Autenticação.
 *
 * Localização Arquitetural: Camada de Adaptadores / UI (adapters/context/).
 *
 * Regras de Arquitetura Limpa:
 * - O Domínio (domain/) e a Camada de Aplicação (application/) NUNCA importam a Context API.
 * - Este contexto atua como adaptador entre o ciclo de vida do React Native e os serviços/armazenamento de sessão.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  defaultSessionStorage,
  type ISessionStorage,
  type SessionData,
  type UserRole,
} from '@/adapters/storage/SessionStorageAdapter';
import { signIn as defaultSignInService } from '@/adapters/gateways/auth/authService';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
}

export interface AuthContextData {
  user: User | null;
  session: SessionData | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  sessionStorage?: ISessionStorage;
  authServiceSignIn?: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  initialSession?: SessionData | null;
  autoRestore?: boolean;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  sessionStorage = defaultSessionStorage,
  authServiceSignIn = defaultSignInService,
  initialSession,
  autoRestore = true,
}) => {
  const [session, setSession] = useState<SessionData | null>(initialSession ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSession && autoRestore);
  const [error, setError] = useState<string | null>(null);

  // Deriva o usuário e papel a partir da sessão
  const user = useMemo<User | null>(() => {
    if (!session) return null;
    return {
      id: session.userId,
      name: session.name || 'Usuário',
      role: session.role,
    };
  }, [session]);

  const role = session?.role ?? null;
  const isAuthenticated = Boolean(session?.accessToken && session?.userId);

  /**
   * Restaura a sessão do armazenamento seguro ao montar o componente (ciclo de vida)
   */
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const savedSession = await sessionStorage.get();
      setSession(savedSession);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao restaurar sessão');
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStorage]);

  useEffect(() => {
    if (autoRestore && !initialSession) {
      refreshSession();
    }
  }, [autoRestore, initialSession, refreshSession]);

  /**
   * Realiza login autenticando e gravando a sessão no armazenamento seguro
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await authServiceSignIn(email, password);

        if (!result.success) {
          setError(result.error ?? 'Credenciais inválidas');
          return false;
        }

        // Recupera sessão persistida pelo authService ou cria estrutura de sessão
        const currentSession = await sessionStorage.get();
        if (currentSession) {
          setSession(currentSession);
        } else if (result.role) {
          const fallbackSession: SessionData = {
            accessToken: 'token-temporario',
            refreshToken: 'refresh-temporario',
            userId: 'user-id',
            role: result.role,
            name: email.split('@')[0],
          };
          await sessionStorage.save(fallbackSession);
          setSession(fallbackSession);
        }

        return true;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro inesperado no login';
        setError(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authServiceSignIn, sessionStorage]
  );

  /**
   * Realiza logout limpando a sessão no armazenamento seguro e no estado
   */
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await sessionStorage.clear();
      setSession(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao encerrar sessão');
    } finally {
      setIsLoading(false);
    }
  }, [sessionStorage]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextData>(
    () => ({
      user,
      session,
      role,
      isAuthenticated,
      isLoading,
      error,
      signIn,
      signOut,
      clearError,
      refreshSession,
    }),
    [user, session, role, isAuthenticated, isLoading, error, signIn, signOut, clearError, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook para consumo do AuthContext
 */
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
