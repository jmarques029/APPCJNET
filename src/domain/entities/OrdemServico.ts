import { StatusOS, StatusOSType } from '../value-objects/StatusOS';
import { TipoProblema, TipoProblemaType } from '../value-objects/TipoProblema';
import { OSFoto } from './OSFoto';
import { GeoCoordenadas } from '../value-objects/GeoCoordenadas';

export interface OrdemServicoProps {
  idLocal: string;
  idRemoto?: string | null;
  clienteId: string;
  tecnicoId?: string | null;
  tipoProblema: TipoProblema | TipoProblemaType;
  descricao: string;
  status?: StatusOS | StatusOSType;
  parecerTecnico?: string | null;
  coordenadas?: GeoCoordenadas | null;
  fotos?: OSFoto[];
  createdAt?: Date;
  dataFechamento?: Date | null;
  syncedAt?: Date | null;
}

export class OrdemServico {
  private readonly _idLocal: string;
  private _idRemoto: string | null;
  private readonly _clienteId: string;
  private _tecnicoId: string | null;
  private _tipoProblema: TipoProblema;
  private _descricao: string;
  private _status: StatusOS;
  private _parecerTecnico: string | null;
  private _coordenadas: GeoCoordenadas | null;
  private _fotos: OSFoto[];
  private readonly _createdAt: Date;
  private _dataFechamento: Date | null;
  private _syncedAt: Date | null;

  constructor(props: OrdemServicoProps) {
    if (!props.idLocal) {
      throw new Error('idLocal é obrigatório para instanciar uma Ordem de Serviço.');
    }
    if (!props.clienteId) {
      throw new Error('clienteId é obrigatório para vincular a OS a um cliente.');
    }
    if (!props.descricao || props.descricao.trim().length === 0) {
      throw new Error('A descrição do problema não pode ser vazia.');
    }

    this._idLocal = props.idLocal;
    this._idRemoto = props.idRemoto ?? null;
    this._clienteId = props.clienteId;
    this._tecnicoId = props.tecnicoId ?? null;

    this._tipoProblema =
      props.tipoProblema instanceof TipoProblema
        ? props.tipoProblema
        : TipoProblema.create(props.tipoProblema);

    this._descricao = props.descricao.trim();

    this._status =
      props.status instanceof StatusOS
        ? props.status
        : StatusOS.create(props.status ?? 'PENDENTE');

    this._parecerTecnico = props.parecerTecnico ?? null;
    this._coordenadas = props.coordenadas ?? null;
    this._fotos = props.fotos ? [...props.fotos] : [];
    this._createdAt = props.createdAt ?? new Date();
    this._dataFechamento = props.dataFechamento ?? null;
    this._syncedAt = props.syncedAt ?? null;
  }

  public get idLocal(): string { return this._idLocal; }
  public get idRemoto(): string | null { return this._idRemoto; }
  public get clienteId(): string { return this._clienteId; }
  public get tecnicoId(): string | null { return this._tecnicoId; }
  public get tipoProblema(): TipoProblema { return this._tipoProblema; }
  public get descricao(): string { return this._descricao; }
  public get status(): StatusOS { return this._status; }
  public get parecerTecnico(): string | null { return this._parecerTecnico; }
  public get coordenadas(): GeoCoordenadas | null { return this._coordenadas; }
  public get fotos(): ReadonlyArray<OSFoto> { return this._fotos; }
  public get createdAt(): Date { return this._createdAt; }
  public get dataFechamento(): Date | null { return this._dataFechamento; }
  public get syncedAt(): Date | null { return this._syncedAt; }

  public adicionarFoto(foto: OSFoto): void {
    if (this._fotos.length >= 5) {
      throw new Error('Limite máximo de 5 fotos por Ordem de Serviço atingido.');
    }
    this._fotos.push(foto);
  }

  public iniciarAtendimento(tecnicoId: string): void {
    if (!tecnicoId) {
      throw new Error('É necessário informar o técnico responsável para iniciar o atendimento.');
    }
    this._status = this._status.transitionTo('EM_ATENDIMENTO');
    this._tecnicoId = tecnicoId;
  }

  public encerrarAtendimento(parecerTecnico: string, fotoReparo?: OSFoto): void {
    if (!parecerTecnico || parecerTecnico.trim().length < 5) {
      throw new Error('Parecer técnico deve conter no mínimo 5 caracteres ao encerrar o chamado.');
    }
    if (fotoReparo) {
      this.adicionarFoto(fotoReparo);
    }
    this._status = this._status.transitionTo('CONCLUIDO');
    this._parecerTecnico = parecerTecnico.trim();
    this._dataFechamento = new Date();
  }

  public cancelar(motivo?: string): void {
    this._status = this._status.transitionTo('CANCELADO');
    if (motivo) {
      this._parecerTecnico = `Cancelado: ${motivo.trim()}`;
    }
    this._dataFechamento = new Date();
  }

  public marcarComoSincronizada(idRemoto: string, syncedAt: Date = new Date()): void {
    this._idRemoto = idRemoto;
    this._syncedAt = syncedAt;
  }
}
