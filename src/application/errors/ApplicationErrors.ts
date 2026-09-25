export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Acesso não autorizado.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Você não possui permissão para executar esta operação.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Recurso não encontrado.') {
    super(message);
    this.name = 'NotFoundError';
  }
}
