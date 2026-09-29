/**
 * SessionStorageAdapter.ts
 * -------------------------
 * Adaptador de armazenamento local seguro de sessão.
 *
 * Responsabilidade:
 * - Isolar o mecanismo de persistência seguro (SecureTokenStore via expo-secure-store)
 *   através de um contrato de interface testável (ISessionStorage).
 * - Garantir que tokens e dados de sessão nunca sejam persistidos de forma insegura.
 */

import {
  saveSession,
  getSession,
  getAccessToken,
  getUserRole,
  updateAccessToken,
  clearSession,
  type SessionData,
  type UserRole,
} from '@/infra/auth/SecureTokenStore';

export type { SessionData, UserRole };

export interface ISessionStorage {
  save(session: SessionData): Promise<void>;
  get(): Promise<SessionData | null>;
  getToken(): Promise<string | null>;
  getRole(): Promise<UserRole | null>;
  updateToken(newToken: string): Promise<void>;
  clear(): Promise<void>;
}

export class SecureTokenStoreAdapter implements ISessionStorage {
  async save(session: SessionData): Promise<void> {
    await saveSession(session);
  }

  async get(): Promise<SessionData | null> {
    return getSession();
  }

  async getToken(): Promise<string | null> {
    return getAccessToken();
  }

  async getRole(): Promise<UserRole | null> {
    return getUserRole();
  }

  async updateToken(newToken: string): Promise<void> {
    await updateAccessToken(newToken);
  }

  async clear(): Promise<void> {
    await clearSession();
  }
}

/**
 * Instância padrão do adaptador de sessão segura
 */
export const defaultSessionStorage = new SecureTokenStoreAdapter();
