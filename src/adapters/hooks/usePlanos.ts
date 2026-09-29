/**
 * usePlanos.ts
 * ------------
 * Hook reativo que integra a Vitrine de Planos com o Caso de Uso
 * ConsultarPlanosPublicosUseCase.
 */

import { useState, useCallback, useEffect } from 'react';
import type { PlanoInternet } from '@/domain/entities/PlanoInternet';
import type { IPlanoRepository } from '@/domain/repositories/IPlanoRepository';
import { ConsultarPlanosPublicosUseCase } from '@/application/use-cases';

export interface UsePlanosProps {
  planoRepository: IPlanoRepository;
  autoFetch?: boolean;
}

export function usePlanos({ planoRepository, autoFetch = true }: UsePlanosProps) {
  const [planos, setPlanos] = useState<PlanoInternet[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const carregarPlanos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const useCase = new ConsultarPlanosPublicosUseCase(planoRepository);
      const result = await useCase.execute();
      setPlanos(result);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar planos';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [planoRepository]);

  useEffect(() => {
    if (autoFetch) {
      carregarPlanos();
    }
  }, [autoFetch, carregarPlanos]);

  return {
    planos,
    loading,
    error,
    carregarPlanos,
  };
}
