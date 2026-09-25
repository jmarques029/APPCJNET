import { InvalidStatusTransitionError } from '../errors/DomainError';

export type StatusOSType = 'PENDENTE' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO';

export class StatusOS {
  public static readonly PENDENTE: StatusOSType = 'PENDENTE';
  public static readonly EM_ATENDIMENTO: StatusOSType = 'EM_ATENDIMENTO';
  public static readonly CONCLUIDO: StatusOSType = 'CONCLUIDO';
  public static readonly CANCELADO: StatusOSType = 'CANCELADO';

  private static readonly VALID_TRANSITIONS: Record<StatusOSType, StatusOSType[]> = {
    PENDENTE: ['EM_ATENDIMENTO', 'CANCELADO'],
    EM_ATENDIMENTO: ['CONCLUIDO', 'CANCELADO', 'PENDENTE'],
    CONCLUIDO: [],
    CANCELADO: [],
  };

  private readonly _value: StatusOSType;

  private constructor(value: StatusOSType) {
    this._value = value;
  }

  public static create(status: string): StatusOS {
    const upper = status?.toUpperCase() as StatusOSType;
    if (upper !== 'PENDENTE' && upper !== 'EM_ATENDIMENTO' && upper !== 'CONCLUIDO' && upper !== 'CANCELADO') {
      throw new Error(`Status de OS inválido: "${status}"`);
    }
    return new StatusOS(upper);
  }

  public get value(): StatusOSType {
    return this._value;
  }

  public canTransitionTo(nextStatus: StatusOSType): boolean {
    const allowed = StatusOS.VALID_TRANSITIONS[this._value] || [];
    return allowed.includes(nextStatus);
  }

  public transitionTo(nextStatus: StatusOSType): StatusOS {
    if (!this.canTransitionTo(nextStatus)) {
      throw new InvalidStatusTransitionError(this._value, nextStatus);
    }
    return new StatusOS(nextStatus);
  }

  public isFinalizado(): boolean {
    return this._value === StatusOS.CONCLUIDO || this._value === StatusOS.CANCELADO;
  }
}
