export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCpfError extends DomainError {
  constructor(cpf: string) {
    super(`O CPF informado "${cpf}" é inválido.`);
  }
}

export class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super(`O e-mail informado "${email}" é inválido.`);
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Transição de status inválida de "${fromStatus}" para "${toStatus}".`);
  }
}

export class FileSizeExceededError extends DomainError {
  constructor(sizeKb: number, maxKb: number = 1024) {
    super(`O tamanho do arquivo (${sizeKb} KB) excede o limite máximo permitido de ${maxKb} KB.`);
  }
}

export class InvalidCoordinateError extends DomainError {
  constructor(lat: number, lng: number) {
    super(`Coordenadas geográficas inválidas: latitude=${lat}, longitude=${lng}.`);
  }
}
