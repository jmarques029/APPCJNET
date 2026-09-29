/**
 * useOrdensServico.ts
 * -------------------
 * Hook reativo que integra o ciclo de vida dos componentes com os
 * Casos de Uso de Ordens de Serviço.
 *
 * Contratos dos Use Cases:
 *  - ListarOrdensServicoUseCase(osRepo, clienteRepo).execute({ usuarioId })
 *  - AbrirOrdemServicoUseCase(osRepo, clienteRepo, syncRepo?).execute(input) → OrdemServico
 */

import { useState, useCallback } from 'react';
import type { OrdemServico } from '@/domain/entities/OrdemServico';
import type { IOrdemServicoRepository } from '@/domain/repositories/IOrdemServicoRepository';
import type { IClienteRepository } from '@/domain/repositories/IClienteRepository';
import type { ISyncQueueRepository } from '@/domain/repositories/ISyncQueueRepository';
import {
  ListarOrdensServicoUseCase,
  AbrirOrdemServicoUseCase,
  type AbrirOrdemServicoInput,
} from '@/application/use-cases';

export interface UseOrdensServicoProps {
  ordemServicoRepository: IOrdemServicoRepository;
  clienteRepository: IClienteRepository;
  syncQueueRepository?: ISyncQueueRepository;
}

export function useOrdensServico({
  ordemServicoRepository,
  clienteRepository,
  syncQueueRepository,
}: UseOrdensServicoProps) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Lista ordens de serviço de acordo com o papel do usuário.
   * @param usuarioId ID do usuário (cliente, técnico ou admin)
   */
  const listar = useCallback(
    async (usuarioId: string) => {
      setLoading(true);
      setError(null);
      try {
        const useCase = new ListarOrdensServicoUseCase(
          ordemServicoRepository,
          clienteRepository
        );
        const result = await useCase.execute({ usuarioId });
        setOrdens(result);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao listar ordens de serviço';
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [ordemServicoRepository, clienteRepository]
  );

  /**
   * Abre uma nova Ordem de Serviço (offline-first).
   * Retorna a OrdemServico criada.
   */
  const abrir = useCallback(
    async (input: AbrirOrdemServicoInput) => {
      setLoading(true);
      setError(null);
      try {
        const useCase = new AbrirOrdemServicoUseCase(
          ordemServicoRepository,
          clienteRepository,
          syncQueueRepository
        );
        const ordemServico = await useCase.execute(input);
        setOrdens((prev) => [ordemServico, ...prev]);
        return ordemServico;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao abrir ordem de serviço';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [ordemServicoRepository, clienteRepository, syncQueueRepository]
  );

  return {
    ordens,
    loading,
    error,
    listar,
    abrir,
  };
}
