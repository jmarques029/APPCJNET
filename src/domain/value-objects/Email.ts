import { InvalidEmailError } from '../errors/DomainError';

export class Email {
  private readonly _value: string;

  constructor(raw: string) {
    if (!raw) {
      throw new InvalidEmailError(raw);
    }
    const trimmed = raw.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new InvalidEmailError(raw);
    }
    this._value = trimmed;
  }

  public static create(raw: string): Email {
    return new Email(raw);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: Email): boolean {
    return this._value === other._value;
  }
}
