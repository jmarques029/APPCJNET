/**
 * SecureTokenStore.ts
 * --------------------
 * Camada de abstração sobre o expo-secure-store para persistência segura
 * de tokens JWT e metadados de sessão do usuário (papel/role).
 *
 * Utiliza a Keychain (iOS) / Android Keystore (Android) para criptografar
 * os dados em repouso — nenhum token é gravado em AsyncStorage ou SQLite.
 *
 * Baseado em: https://docs.expo.dev/versions/v57.0.0/sdk/securestore/
 */

import * as SecureStore from 'expo-secure-store';

// ─── Chaves de armazenamento seguro ───────────────────────────────────────────

const KEYS = {
  ACCESS_TOKEN: 'cjnet:access_token',
  REFRESH_TOKEN: 'cjnet:refresh_token',
  USER_ID: 'cjnet:user_id',
  USER_ROLE: 'cjnet:user_role',   // 'cliente' | 'tecnico' | 'admin'
  USER_NAME: 'cjnet:user_name',
} as const;

// ─── Opções padrão do SecureStore ─────────────────────────────────────────────

const DEFAULT_OPTIONS: SecureStore.SecureStoreOptions = {
  // Disponível após desbloqueio do dispositivo (mesmo em segundo plano)
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = 'cliente' | 'tecnico' | 'admin';

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  name: string;
}

// ─── Funções de acesso ────────────────────────────────────────────────────────

/**
 * Salva todos os dados da sessão de forma segura após o login bem-sucedido.
 */
export async function saveSession(session: SessionData): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, session.accessToken, DEFAULT_OPTIONS),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, session.refreshToken, DEFAULT_OPTIONS),
    SecureStore.setItemAsync(KEYS.USER_ID, session.userId, DEFAULT_OPTIONS),
    SecureStore.setItemAsync(KEYS.USER_ROLE, session.role, DEFAULT_OPTIONS),
    SecureStore.setItemAsync(KEYS.USER_NAME, session.name, DEFAULT_OPTIONS),
  ]);
}

/**
 * Recupera todos os dados da sessão armazenados com segurança.
 * Retorna null se nenhuma sessão foi encontrada (usuário não logado).
 */
export async function getSession(): Promise<SessionData | null> {
  const [accessToken, refreshToken, userId, role, name] = await Promise.all([
    SecureStore.getItemAsync(KEYS.ACCESS_TOKEN, DEFAULT_OPTIONS),
    SecureStore.getItemAsync(KEYS.REFRESH_TOKEN, DEFAULT_OPTIONS),
    SecureStore.getItemAsync(KEYS.USER_ID, DEFAULT_OPTIONS),
    SecureStore.getItemAsync(KEYS.USER_ROLE, DEFAULT_OPTIONS),
    SecureStore.getItemAsync(KEYS.USER_NAME, DEFAULT_OPTIONS),
  ]);

  if (!accessToken || !userId || !role) return null;

  return {
    accessToken,
    refreshToken: refreshToken ?? '',
    userId,
    role: role as UserRole,
    name: name ?? '',
  };
}

/**
 * Retorna apenas o token de acesso (para uso nos headers das requisições).
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN, DEFAULT_OPTIONS);
}

/**
 * Retorna apenas o papel do usuário (para roteamento por perfil).
 */
export async function getUserRole(): Promise<UserRole | null> {
  const role = await SecureStore.getItemAsync(KEYS.USER_ROLE, DEFAULT_OPTIONS);
  return role ? (role as UserRole) : null;
}

/**
 * Atualiza o access token (utilizado pelo refresh de sessão).
 */
export async function updateAccessToken(newToken: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, newToken, DEFAULT_OPTIONS);
}

/**
 * Remove todos os dados da sessão do armazenamento seguro (logout).
 */
export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN, DEFAULT_OPTIONS),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN, DEFAULT_OPTIONS),
    SecureStore.deleteItemAsync(KEYS.USER_ID, DEFAULT_OPTIONS),
    SecureStore.deleteItemAsync(KEYS.USER_ROLE, DEFAULT_OPTIONS),
    SecureStore.deleteItemAsync(KEYS.USER_NAME, DEFAULT_OPTIONS),
  ]);
}
