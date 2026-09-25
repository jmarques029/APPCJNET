import { InvalidEmailError } from '../errors/DomainError';

export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(raw: string): Email {
    if (!raw) {
      throw new InvalidEmailError(raw);
    }
    const trimmed = raw.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new InvalidEmailError(raw);
    }
    return new Email(trimmed);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: Email): boolean {
    return this._value === other._value;
  }
}
