import { CpfCnpj } from '../value-objects/CpfCnpj';
import { Email } from '../value-objects/Email';
import { PapelUsuario, PapelUsuarioType } from '../value-objects/PapelUsuario';

export type StatusContratoType = 'ATIVO' | 'SUSPENSO' | 'CANCELADO';

export interface ClienteProps {
  id: string;
  authUserId: string;
  planoId?: string | null;
  nome: string;
  cpfCnpj: CpfCnpj | string;
  email: Email | string;
  telefone: string;
  papel?: PapelUsuario | PapelUsuarioType;
  statusContrato?: StatusContratoType;
  pushToken?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Cliente {
  private readonly _id: string;
  private readonly _authUserId: string;
  private _planoId: string | null;
  private _nome: string;
  private _cpfCnpj: CpfCnpj;
  private _email: Email;
  private _telefone: string;
  private _papel: PapelUsuario;
  private _statusContrato: StatusContratoType;
  private _pushToken: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ClienteProps) {
    if (!props.id) throw new Error('ID do cliente é obrigatório.');
    if (!props.authUserId) throw new Error('authUserId é obrigatório.');
    if (!props.nome || props.nome.trim().length < 2) throw new Error('Nome inválido.');

    this._id = props.id;
    this._authUserId = props.authUserId;
    this._planoId = props.planoId ?? null;
    this._nome = props.nome.trim();

    this._cpfCnpj =
      props.cpfCnpj instanceof CpfCnpj
        ? props.cpfCnpj
        : CpfCnpj.create(props.cpfCnpj);

    this._email =
      props.email instanceof Email
        ? props.email
        : Email.create(props.email);

    this._telefone = props.telefone.trim();

    this._papel =
      props.papel instanceof PapelUsuario
        ? props.papel
        : PapelUsuario.create(props.papel ?? 'CLIENTE');

    this._statusContrato = props.statusContrato ?? 'ATIVO';
    this._pushToken = props.pushToken ?? null;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  public get id(): string { return this._id; }
  public get authUserId(): string { return this._authUserId; }
  public get planoId(): string | null { return this._planoId; }
  public get nome(): string { return this._nome; }
  public get cpfCnpj(): CpfCnpj { return this._cpfCnpj; }
  public get email(): Email { return this._email; }
  public get telefone(): string { return this._telefone; }
  public get papel(): PapelUsuario { return this._papel; }
  public get statusContrato(): StatusContratoType { return this._statusContrato; }
  public get pushToken(): string | null { return this._pushToken; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }

  public atualizarPushToken(token: string | null): void {
    this._pushToken = token;
    this._updatedAt = new Date();
  }

  public vincularPlano(planoId: string): void {
    this._planoId = planoId;
    this._updatedAt = new Date();
  }

  public atualizarTelefone(telefone: string): void {
    if (!telefone || telefone.trim().length < 8) {
      throw new Error('Telefone inválido.');
    }
    this._telefone = telefone.trim();
    this._updatedAt = new Date();
  }
}
