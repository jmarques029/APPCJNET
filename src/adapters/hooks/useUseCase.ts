/**
 * useUseCase.ts
 * -------------
 * Hook genérico que integra o ciclo de vida do React Native com qualquer
 * Caso de Uso da camada de aplicação.
 *
 * Garante:
 * - Controle reativo de loading, erro e resultado.
 * - Tratamento seguro de desmontagem de componente (unmounted safety).
 * - Total desacoplamento entre UI e lógica de domínio/aplicação.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseCaseState<TOutput> {
  data: TOutput | null;
  loading: boolean;
  error: string | null;
}

export interface UseCaseExecutor<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

export function useUseCase<TInput, TOutput>(
  useCase: UseCaseExecutor<TInput, TOutput>
) {
  const [state, setState] = useState<UseCaseState<TOutput>>({
    data: null,
    loading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await useCase.execute(input);
        if (isMountedRef.current) {
          setState({ data: result, loading: false, error: null });
        }
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao executar caso de uso';
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, loading: false, error: message }));
        }
        return null;
      }
    },
    [useCase]
  );

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState({ data: null, loading: false, error: null });
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
