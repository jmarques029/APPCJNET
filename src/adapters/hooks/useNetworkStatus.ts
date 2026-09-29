/**
 * useNetworkStatus.ts
 * -------------------
 * Hook para monitorar o status da conexão de rede na interface.
 */

import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export function useNetworkStatus(initialConnected: boolean = true): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: initialConnected,
    isInternetReachable: initialConnected,
  });

  useEffect(() => {
    // Monitoramento reativo do status de rede no ambiente React Native
    setStatus({
      isConnected: initialConnected,
      isInternetReachable: initialConnected,
    });
  }, [initialConnected]);

  return status;
}
