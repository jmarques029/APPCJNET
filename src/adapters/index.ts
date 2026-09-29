/**
 * src/adapters/index.ts
 * ---------------------
 * Ponto de entrada da Camada de Adaptadores (adapters/)
 *
 * Contém:
 *  - Context API & Estado Global (AuthContext, SyncContext)
 *  - Adaptador de Sessão Segura (SessionStorageAdapter)
 *  - Hooks de Ciclo de Vida e Casos de Uso (useAuth, useSync, useUseCase, useOrdensServico, usePlanos, useNetworkStatus)
 */

export * from './context/AuthContext';
export * from './context/SyncContext';
export * from './storage/SessionStorageAdapter';
export * from './hooks/useUseCase';
export * from './hooks/useAuth';
export * from './hooks/useSync';
export * from './hooks/useNetworkStatus';
export * from './hooks/useOrdensServico';
export * from './hooks/usePlanos';
export * from './screens';
