import React from 'react';
import { View, Text, Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SyncProvider, useSync } from '@/adapters/context/SyncContext';
import { FakeSyncQueueRepository } from '@/infra/fakes/FakeSyncQueueRepository';

const TestSyncConsumer = () => {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncAt,
    error,
    setIsOnline,
    syncNow,
    refreshPendingCount,
  } = useSync();

  return (
    <View>
      <Text testID="online-status">{isOnline ? 'online' : 'offline'}</Text>
      <Text testID="pending-count">{pendingCount}</Text>
      <Text testID="syncing-status">{isSyncing ? 'syncing' : 'idle'}</Text>
      <Text testID="last-sync">{lastSyncAt ? 'synced' : 'never'}</Text>
      <Text testID="error-msg">{error ?? 'none'}</Text>
      <Button testID="btn-refresh-count" title="Refresh Count" onPress={() => refreshPendingCount()} />
      <Button testID="btn-sync-now" title="Sync Now" onPress={() => syncNow()} />
      <Button testID="btn-set-offline" title="Set Offline" onPress={() => setIsOnline(false)} />
    </View>
  );
};

describe('Adapters Layer - SyncContext & useSync', () => {
  let fakeSyncQueue: FakeSyncQueueRepository;

  beforeEach(() => {
    fakeSyncQueue = new FakeSyncQueueRepository();
  });

  it('deve lançar erro ao usar useSync fora do SyncProvider', async () => {
    const originalError = console.error;
    console.error = jest.fn();

    await expect(render(<TestSyncConsumer />)).rejects.toThrow(
      'useSync deve ser utilizado dentro de um SyncProvider'
    );

    console.error = originalError;
  });

  it('deve gerenciar estado de conectividade e contagem de pendências da fila', async () => {
    await fakeSyncQueue.enfileirar({
      id: 'item-1',
      entidade: 'ordens_servico',
      operacao: 'INSERT',
      payloadJson: JSON.stringify({ descricao: 'Sem sinal' }),
      tentativas: 0,
      status: 'PENDENTE',
      criadoEm: new Date(),
    });
    await fakeSyncQueue.enfileirar({
      id: 'item-2',
      entidade: 'fotos',
      operacao: 'INSERT',
      payloadJson: JSON.stringify({ uri: 'file://foto.jpg' }),
      tentativas: 0,
      status: 'PENDENTE',
      criadoEm: new Date(),
    });

    const { getByTestId } = await render(
      <SyncProvider syncQueueRepository={fakeSyncQueue}>
        <TestSyncConsumer />
      </SyncProvider>
    );

    expect(getByTestId('online-status').props.children).toBe('online');
    expect(getByTestId('pending-count').props.children).toBe(0);

    fireEvent.press(getByTestId('btn-refresh-count'));

    await waitFor(() => {
      expect(getByTestId('pending-count').props.children).toBe(2);
    });

    fireEvent.press(getByTestId('btn-set-offline'));

    await waitFor(() => {
      expect(getByTestId('online-status').props.children).toBe('offline');
    });
  });

  it('deve executar sincronização manual via syncNow', async () => {
    const mockSyncCallback = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = await render(
      <SyncProvider
        syncQueueRepository={fakeSyncQueue}
        onSync={mockSyncCallback}
        initialOnline={true}
      >
        <TestSyncConsumer />
      </SyncProvider>
    );

    expect(getByTestId('last-sync').props.children).toBe('never');

    fireEvent.press(getByTestId('btn-sync-now'));

    await waitFor(() => {
      expect(getByTestId('last-sync').props.children).toBe('synced');
    });

    expect(mockSyncCallback).toHaveBeenCalled();
    expect(getByTestId('syncing-status').props.children).toBe('idle');
  });
});
