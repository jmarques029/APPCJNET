/**
 * SyncContext.tsx
 * ---------------
 * Context API para Gerenciamento do Estado Global de Sincronização Offline-First.
 *
 * Localização Arquitetural: Camada de Adaptadores / UI (adapters/context/).
 *
 * Responsabilidades:
 * - Acompanhar quantidade de itens pendentes na sync_queue via ISyncQueueRepository.
 * - Fornecer indicador de sincronização em andamento.
 * - Expor método manual para disparar sincronização.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { ISyncQueueRepository } from '@/domain/repositories/ISyncQueueRepository';

export interface SyncContextData {
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncAt: Date | null;
  error: string | null;
  setPendingCount: (count: number) => void;
  setIsOnline: (online: boolean) => void;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

export interface SyncProviderProps {
  children: ReactNode;
  syncQueueRepository?: ISyncQueueRepository;
  onSync?: () => Promise<void>;
  initialOnline?: boolean;
}

export const SyncContext = createContext<SyncContextData | undefined>(undefined);

export const SyncProvider: React.FC<SyncProviderProps> = ({
  children,
  syncQueueRepository,
  onSync,
  initialOnline = true,
}) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(initialOnline);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    if (!syncQueueRepository) return;
    try {
      const items = await syncQueueRepository.obterPendentes();
      setPendingCount(items.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar fila de sincronização');
    }
  }, [syncQueueRepository]);

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    try {
      setIsSyncing(true);
      setError(null);
      if (onSync) {
        await onSync();
      }
      setLastSyncAt(new Date());
      await refreshPendingCount();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao sincronizar dados');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, onSync, refreshPendingCount]);

  const value = useMemo<SyncContextData>(
    () => ({
      pendingCount,
      isSyncing,
      isOnline,
      lastSyncAt,
      error,
      setPendingCount,
      setIsOnline,
      syncNow,
      refreshPendingCount,
    }),
    [pendingCount, isSyncing, isOnline, lastSyncAt, error, syncNow, refreshPendingCount]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export function useSync(): SyncContextData {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync deve ser utilizado dentro de um SyncProvider');
  }
  return context;
}
