/**
 * supabaseClient.ts
 * -----------------
 * Cliente REST e Storage para integração com o Supabase (PostgREST v1 + Storage v1).
 * Utiliza as variáveis de ambiente públicas do Expo (EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY).
 * Compatível com Android, iOS, Web e Jest sem dependências nativas extras.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  storageBucket: string;
}

const DEFAULT_SUPABASE_URL = 'https://xexojvdyfojdlyyfnydb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleG9qdmR5Zm9qZGx5eWZueWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTk1ODUsImV4cCI6MjExMDE3NTU4NX0.qqiuYG_At1sp9POPaeHkiqMxV8YUIqXkxQeKbZCSXSU';

export function getSupabaseConfig(overrides?: Partial<SupabaseConfig>): SupabaseConfig {
  const rawUrl =
    overrides && 'url' in overrides
      ? overrides.url ?? ''
      : process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const rawKey =
    overrides && 'anonKey' in overrides
      ? overrides.anonKey ?? ''
      : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  const url = rawUrl.trim().replace(/\/+$/, '');
  const anonKey = rawKey.trim();
  const storageBucket = (
    overrides?.storageBucket ??
    process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET ??
    'os-evidencias'
  ).trim();

  return { url, anonKey, storageBucket };
}

export function isSupabaseConfigured(config: SupabaseConfig = getSupabaseConfig()): boolean {
  if (!config.url || !config.anonKey) {
    return false;
  }
  if (
    config.url.includes('SEU_PROJETO.supabase.co') ||
    config.anonKey === 'SUA_CHAVE_ANON_PUBLIC'
  ) {
    return false;
  }
  return config.url.startsWith('http://') || config.url.startsWith('https://');
}

export class SupabaseClient {
  private readonly config: SupabaseConfig;
  private readonly fetchFn: typeof fetch;

  constructor(config?: Partial<SupabaseConfig>, customFetch?: typeof fetch) {
    this.config = getSupabaseConfig(config);
    this.fetchFn = customFetch ?? fetch;
  }

  public isConfigured(): boolean {
    return isSupabaseConfigured(this.config);
  }

  public getConfig(): SupabaseConfig {
    return this.config;
  }

  private getHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
  }

  /**
   * Executa um UPSERT em uma tabela do Supabase via PostgREST (/rest/v1/{table}).
   */
  public async upsert<T = Record<string, any>>(
    table: string,
    payload: Record<string, any> | Record<string, any>[],
    onConflict?: string
  ): Promise<T[]> {
    if (!this.isConfigured()) {
      throw new Error(
        'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.'
      );
    }

    const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
    const endpoint = `${this.config.url}/rest/v1/${table}${query}`;

    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: this.getHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Supabase [${response.status}] em ${table}: ${errorText}`);
    }

    return (await response.json()) as T[];
  }

  /**
   * Consulta registros de uma tabela do Supabase via PostgREST (/rest/v1/{table}).
   */
  public async select<T = Record<string, any>>(
    table: string,
    queryParams: string = 'select=*'
  ): Promise<T[]> {
    if (!this.isConfigured()) {
      throw new Error(
        'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.'
      );
    }

    const endpoint = `${this.config.url}/rest/v1/${table}?${queryParams}`;
    const response = await this.fetchFn(endpoint, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Supabase [${response.status}] ao consultar ${table}: ${errorText}`);
    }

    return (await response.json()) as T[];
  }

  /**
   * Faz upload/atualização de um arquivo no bucket do Supabase Storage (/storage/v1/object/{bucket}/{path}).
   */
  public async uploadStorageObject(
    filePath: string,
    body: Blob | ArrayBuffer | Uint8Array | string,
    contentType: string = 'image/jpeg',
    bucket?: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(
        'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.'
      );
    }

    const targetBucket = bucket ?? this.config.storageBucket;
    const cleanPath = filePath.replace(/^\/+/, '');
    const endpoint = `${this.config.url}/storage/v1/object/${targetBucket}/${cleanPath}`;

    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: {
        apikey: this.config.anonKey,
        Authorization: `Bearer ${this.config.anonKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: body as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Supabase Storage [${response.status}]: ${errorText}`);
    }

    return this.getPublicStorageUrl(cleanPath, targetBucket);
  }

  /**
   * Gera a URL pública de um arquivo armazenado no bucket do Supabase Storage.
   */
  public getPublicStorageUrl(filePath: string, bucket?: string): string {
    const targetBucket = bucket ?? this.config.storageBucket;
    const cleanPath = filePath.replace(/^\/+/, '');
    return `${this.config.url}/storage/v1/object/public/${targetBucket}/${cleanPath}`;
  }
}

export const supabase = new SupabaseClient();

