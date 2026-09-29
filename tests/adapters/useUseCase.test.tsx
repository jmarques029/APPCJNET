import React from 'react';
import { View, Text, Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useUseCase } from '@/adapters/hooks/useUseCase';

interface TestInput {
  descricao: string;
}

interface TestOutput {
  id: string;
  status: string;
}

const TestUseCaseConsumer = ({
  useCase,
}: {
  useCase: { execute: (input: any) => Promise<any> };
}) => {
  const { data, loading, error, execute, reset } = useUseCase<TestInput, TestOutput>(useCase);

  return (
    <View>
      <Text testID="loading">{loading ? 'loading' : 'idle'}</Text>
      <Text testID="data">{data ? JSON.stringify(data) : 'none'}</Text>
      <Text testID="error">{error ?? 'none'}</Text>
      <Button
        testID="btn-execute"
        title="Execute"
        onPress={() => execute({ descricao: 'Instalação' })}
      />
      <Button testID="btn-reset" title="Reset" onPress={() => reset()} />
    </View>
  );
};

describe('Adapters Layer - useUseCase', () => {
  it('deve gerenciar estados de loading, sucesso e dados do caso de uso', async () => {
    const mockUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'os-123', status: 'PENDENTE' }),
    };

    const { getByTestId } = await render(<TestUseCaseConsumer useCase={mockUseCase} />);

    expect(getByTestId('loading').props.children).toBe('idle');
    expect(getByTestId('data').props.children).toBe('none');
    expect(getByTestId('error').props.children).toBe('none');

    fireEvent.press(getByTestId('btn-execute'));

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('idle');
    });

    expect(getByTestId('data').props.children).toBe(
      JSON.stringify({ id: 'os-123', status: 'PENDENTE' })
    );
    expect(getByTestId('error').props.children).toBe('none');
  });

  it('deve capturar erros durante a execução do caso de uso', async () => {
    const mockUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('Falha no repositório')),
    };

    const { getByTestId } = await render(<TestUseCaseConsumer useCase={mockUseCase} />);

    fireEvent.press(getByTestId('btn-execute'));

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Falha no repositório');
    });

    expect(getByTestId('data').props.children).toBe('none');
    expect(getByTestId('loading').props.children).toBe('idle');
  });

  it('deve resetar o estado com reset()', async () => {
    const mockUseCase = {
      execute: jest.fn().mockResolvedValue({ id: '1', status: 'OK' }),
    };

    const { getByTestId } = await render(<TestUseCaseConsumer useCase={mockUseCase} />);

    fireEvent.press(getByTestId('btn-execute'));

    await waitFor(() => {
      expect(getByTestId('data').props.children).toBe(
        JSON.stringify({ id: '1', status: 'OK' })
      );
    });

    fireEvent.press(getByTestId('btn-reset'));

    await waitFor(() => {
      expect(getByTestId('data').props.children).toBe('none');
    });

    expect(getByTestId('loading').props.children).toBe('idle');
    expect(getByTestId('error').props.children).toBe('none');
  });
});
