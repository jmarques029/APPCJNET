import { FileSizeExceededError } from '../errors/DomainError';

export type TipoFotoOS = 'CLIENTE_ROTEADOR' | 'TECNICO_REPARO';

export interface OSFotoProps {
  id: string;
  osId: string;
  fotoLocalPath: string;
  fotoRemotaUrl?: string | null;
  tipo: TipoFotoOS;
  tamanhoKb: number;
  enviada?: boolean;
  createdAt?: Date;
}

export class OSFoto {
  private readonly _id: string;
  private readonly _osId: string;
  private _fotoLocalPath: string;
  private _fotoRemotaUrl: string | null;
  private readonly _tipo: TipoFotoOS;
  private _tamanhoKb: number;
  private _enviada: boolean;
  private readonly _createdAt: Date;

  public static readonly MAX_TAMANHO_KB = 1024; // 1 MB (RNF09)

  constructor(props: OSFotoProps) {
    if (props.tamanhoKb > OSFoto.MAX_TAMANHO_KB) {
      throw new FileSizeExceededError(props.tamanhoKb, OSFoto.MAX_TAMANHO_KB);
    }

    this._id = props.id;
    this._osId = props.osId;
    this._fotoLocalPath = props.fotoLocalPath;
    this._fotoRemotaUrl = props.fotoRemotaUrl ?? null;
    this._tipo = props.tipo;
    this._tamanhoKb = props.tamanhoKb;
    this._enviada = props.enviada ?? false;
    this._createdAt = props.createdAt ?? new Date();
  }

  public get id(): string { return this._id; }
  public get osId(): string { return this._osId; }
  public get fotoLocalPath(): string { return this._fotoLocalPath; }
  public get fotoRemotaUrl(): string | null { return this._fotoRemotaUrl; }
  public get tipo(): TipoFotoOS { return this._tipo; }
  public get tamanhoKb(): number { return this._tamanhoKb; }
  public get enviada(): boolean { return this._enviada; }
  public get createdAt(): Date { return this._createdAt; }

  public marcarComoEnviada(urlRemota: string): void {
    if (!urlRemota) {
      throw new Error('URL remota não pode ser vazia para marcar foto como enviada.');
    }
    this._fotoRemotaUrl = urlRemota;
    this._enviada = true;
  }
}
