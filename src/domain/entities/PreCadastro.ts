import { CpfCnpj } from '../value-objects/CpfCnpj';
import { GeoCoordenadas } from '../value-objects/GeoCoordenadas';

export type StatusPreCadastro = 'PENDENTE' | 'CONTATADO' | 'CONVERTIDO' | 'RECUSADO';

export interface PreCadastroProps {
  id: string;
  planoId: string;
  areaCoberturaId?: string;
  nome: string;
  cpfCnpj: CpfCnpj;
  telefone: string;
  enderecoCompleto: string;
  coordenadas?: GeoCoordenadas;
  status?: StatusPreCadastro;
  criadoEm?: Date;
}

export class PreCadastro {
  private readonly _id: string;
  private readonly _planoId: string;
  private _areaCoberturaId?: string;
  private readonly _nome: string;
  private readonly _cpfCnpj: CpfCnpj;
  private readonly _telefone: string;
  private readonly _enderecoCompleto: string;
  private readonly _coordenadas?: GeoCoordenadas;
  private _status: StatusPreCadastro;
  private readonly _criadoEm: Date;

  constructor(props: PreCadastroProps) {
    if (!props.id) throw new Error('ID do pré-cadastro é obrigatório.');
    if (!props.planoId) throw new Error('Plano de interesse é obrigatório.');
    if (!props.nome || props.nome.trim().length < 3) {
      throw new Error('Nome do interessado deve ter no mínimo 3 caracteres.');
    }
    if (!props.telefone || props.telefone.trim().length < 8) {
      throw new Error('Telefone de contato inválido.');
    }
    if (!props.enderecoCompleto || props.enderecoCompleto.trim().length < 5) {
      throw new Error('Endereço completo é obrigatório.');
    }

    this._id = props.id;
    this._planoId = props.planoId;
    this._areaCoberturaId = props.areaCoberturaId;
    this._nome = props.nome.trim();
    this._cpfCnpj = props.cpfCnpj;
    this._telefone = props.telefone.trim();
    this._enderecoCompleto = props.enderecoCompleto.trim();
    this._coordenadas = props.coordenadas;
    this._status = props.status ?? 'PENDENTE';
    this._criadoEm = props.criadoEm ?? new Date();
  }

  public get id(): string { return this._id; }
  public get planoId(): string { return this._planoId; }
  public get areaCoberturaId(): string | undefined { return this._areaCoberturaId; }
  public get nome(): string { return this._nome; }
  public get cpfCnpj(): CpfCnpj { return this._cpfCnpj; }
  public get telefone(): string { return this._telefone; }
  public get enderecoCompleto(): string { return this._enderecoCompleto; }
  public get coordenadas(): GeoCoordenadas | undefined { return this._coordenadas; }
  public get status(): StatusPreCadastro { return this._status; }
  public get criadoEm(): Date { return this._criadoEm; }

  public vincularAreaCobertura(areaId: string): void {
    this._areaCoberturaId = areaId;
  }

  public atualizarStatus(novoStatus: StatusPreCadastro): void {
    this._status = novoStatus;
  }
}
