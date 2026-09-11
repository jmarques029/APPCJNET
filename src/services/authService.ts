/**
 * authService.ts
 * ---------------
 * Serviço de autenticação do App CJnet.
 *
 * Responsabilidades:
 *  - Fazer login via Supabase Auth (email/senha ou CPF+senha)
 *  - Persistir tokens JWT de forma segura usando SecureTokenStore (expo-secure-store)
 *  - Restaurar sessão ao abrir o app
 *  - Fazer logout limpando todo o armazenamento seguro
 *  - Expor o papel (role) do usuário para roteamento dinâmico
 *
 * NUNCA armazena tokens em AsyncStorage, SQLite ou variáveis globais expostas.
 *
 * Baseado em: https://docs.expo.dev/versions/v57.0.0/sdk/securestore/
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
} from './SecureTokenStore';

// ─── Tipo de retorno do login ─────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  role?: UserRole;
  error?: string;
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Realiza o login do usuário com email e senha.
 * Após autenticação bem-sucedida, salva a sessão no SecureStore.
 *
 * Em produção, substituir o stub por chamada real ao Supabase:
 *   import { supabase } from '../api/supabaseClient';
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    // TODO: substituir pelo supabaseClient real
    // Exemplo:
    // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // if (error) return { success: false, error: error.message };
    //
    // const role = data.user?.user_metadata?.role ?? 'cliente';
    // await saveSession({
    //   accessToken: data.session.access_token,
    //   refreshToken: data.session.refresh_token,
    //   userId: data.user.id,
    //   role,
    //   name: data.user?.user_metadata?.name ?? '',
    // });
    // return { success: true, role };

    throw new Error('Supabase client não configurado — configure src/api/supabaseClient.ts');
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido no login',
    };
  }
}

// ─── Restaurar sessão (ao abrir o app) ───────────────────────────────────────

/**
 * Verifica se existe uma sessão válida armazenada no SecureStore.
 * Deve ser chamado no _layout.tsx raiz para roteamento automático.
 */
export async function restoreSession(): Promise<SessionData | null> {
  return getSession();
}

// ─── Obter token para requisições ────────────────────────────────────────────

/**
 * Retorna o access token atual para uso nos headers Authorization.
 * Exemplo: headers: { Authorization: `Bearer ${token}` }
 */
export async function getToken(): Promise<string | null> {
  return getAccessToken();
}

// ─── Obter papel do usuário ───────────────────────────────────────────────────

/**
 * Retorna o papel do usuário logado para roteamento por perfil:
 * 'cliente' → tabs-cliente
 * 'tecnico' → tabs-tecnico
 * 'admin'   → tabs-admin
 */
export async function getRole(): Promise<UserRole | null> {
  return getUserRole();
}

// ─── Renovar token (refresh) ──────────────────────────────────────────────────

/**
 * Atualiza o access token após renovação via Supabase.
 * Chame quando o token expirar (erro 401) para manter a sessão ativa.
 */
export async function refreshToken(newAccessToken: string): Promise<void> {
  await updateAccessToken(newAccessToken);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Encerra a sessão, removendo todos os dados seguros do dispositivo.
 * Redirecionar para tela de login após chamar esta função.
 */
export async function signOut(): Promise<void> {
  // TODO: chamar supabase.auth.signOut() quando o cliente estiver configurado
  await clearSession();
}

// Re-exportar tipos para uso nos contextos
export type { SessionData, UserRole };
