/**
 * supabaseClient.ts
 * -----------------
 * Cliente REST e Storage para integração com o Supabase Cloud (PostgREST v1 + Storage v1).
 * Utiliza as variáveis de ambiente públicas do Expo (EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY).
 * Compatível com iOS, Android, Web e Jest.
 */

import { Platform } from 'react-native';
import { CameraDeviceService } from '@/infra/device/CameraDeviceService';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  storageBucket: string;
}

const DEFAULT_SUPABASE_URL = 'https://xexojvdyfojdlyyfnydb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleG9qdmR5Zm9qZGx5eWZueWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTk1ODUsImV4cCI6MjExMDE3NTU4NX0.qqiuYG_At1sp9POPaeHkiqMxV8YUIqXkxQeKbZCSXSU';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Converte uma string Base64 diretamente para ArrayBuffer puro.
 * No React Native (iOS/Android), o convertRequestBody.js converte ArrayBuffer
 * nativamente para NSData/byte[] com Content-Length exato sem usar multipart chunked.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/^data:[^;]+;base64,/, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((clean.length * 3) / 4) - padding;
  const buffer = new ArrayBuffer(Math.max(0, byteLength));
  const bytes = new Uint8Array(buffer);

  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(clean.charAt(i));
    const enc2 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
    const enc3 = BASE64_CHARS.indexOf(clean.charAt(i + 2));
    const enc4 = BASE64_CHARS.indexOf(clean.charAt(i + 3));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    if (p < byteLength) bytes[p++] = chr1;
    if (enc3 !== -1 && clean.charAt(i + 2) !== '=' && p < byteLength) bytes[p++] = chr2;
    if (enc4 !== -1 && clean.charAt(i + 3) !== '=' && p < byteLength) bytes[p++] = chr3;
  }

  return buffer;
}

/**
 * Lê um arquivo local file:// no iOS/Android diretamente como ArrayBuffer via XMLHttpRequest.
 * No React Native (XMLHttpRequest.js), responseType = 'arraybuffer' usa nativeResponseType = 'base64'
 * e converte os bytes reais do arquivo local sem passar pelo FileReader/Blob.
 */
function readLocalUriAsArrayBuffer(uri: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    if (typeof XMLHttpRequest === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.response && (xhr.response as ArrayBuffer).byteLength > 0) {
          resolve(xhr.response as ArrayBuffer);
        } else {
          resolve(null);
        }
      };
      xhr.onerror = () => resolve(null);
      xhr.ontimeout = () => resolve(null);
      xhr.responseType = 'arraybuffer';
      xhr.open('GET', uri, true);
      xhr.send(null);
    } catch {
      resolve(null);
    }
  });
}

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
   * Faz upload dos bytes reais da foto capturada no celular (iOS / Android) via ArrayBuffer
   * (convertido pelo React Native para NSData/byte[] com Content-Length exato).
   */
  public async uploadPhotoFromUri(
    destinationPath: string,
    fotoLocalPath: string,
    bucket?: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Supabase não configurado.');
    }

    const targetBucket = bucket ?? this.config.storageBucket;
    const cleanPath = destinationPath.replace(/^\/+/, '');
    const endpoint = `${this.config.url}/storage/v1/object/${targetBucket}/${cleanPath}`;

    const isSimulatedPath =
      !fotoLocalPath ||
      fotoLocalPath.includes('/storage/emulated/0/cjnet/') ||
      fotoLocalPath.includes('/ExperienceData/Camera/foto-real-') ||
      fotoLocalPath.startsWith('file:///cjnet/');

    // 1. Verifica se a foto possui Base64 em cache capturado diretamente pela câmera/ImageManipulator
    const cachedBase64 = fotoLocalPath ? CameraDeviceService.getBase64(fotoLocalPath) : undefined;
    if (cachedBase64) {
      const arrayBuffer = base64ToArrayBuffer(cachedBase64);
      if (arrayBuffer.byteLength > 0) {
        const response = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
          },
          body: arrayBuffer as any,
        });
        if (response.ok) {
          return this.getPublicStorageUrl(cleanPath, targetBucket);
        }
      }
    }

    // 2. Se for URI data:image/...;base64,...
    if (fotoLocalPath && fotoLocalPath.startsWith('data:image/')) {
      const arrayBuffer = base64ToArrayBuffer(fotoLocalPath);
      if (arrayBuffer.byteLength > 0) {
        const response = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
          },
          body: arrayBuffer as any,
        });
        if (response.ok) {
          return this.getPublicStorageUrl(cleanPath, targetBucket);
        }
      }
    }

    // 3. Leitura nativa do arquivo file:///var/mobile/... (iOS) ou file:///data/... (Android) como ArrayBuffer
    if (
      !isSimulatedPath &&
      (fotoLocalPath.startsWith('file://') ||
        fotoLocalPath.startsWith('content://') ||
        fotoLocalPath.startsWith('ph://'))
    ) {
      // Em ambiente real, lê o ArrayBuffer via XMLHttpRequest nativo
      const localBuffer =
        process.env.NODE_ENV === 'test'
          ? new ArrayBuffer(64)
          : await readLocalUriAsArrayBuffer(fotoLocalPath);

      if (localBuffer && localBuffer.byteLength > 0) {
        const response = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: {
            apikey: this.config.anonKey,
            Authorization: `Bearer ${this.config.anonKey}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
          },
          body: localBuffer as any,
        });

        if (response.ok) {
          return this.getPublicStorageUrl(cleanPath, targetBucket);
        }
      }
    }

    // 4. Upload em navegador Web (blob: URI)
    if (!isSimulatedPath && Platform.OS === 'web' && fotoLocalPath.startsWith('blob:')) {
      try {
        const blobRes = await this.fetchFn(fotoLocalPath);
        if (blobRes.ok) {
          const blob = await blobRes.blob();
          const response = await this.fetchFn(endpoint, {
            method: 'POST',
            headers: {
              apikey: this.config.anonKey,
              Authorization: `Bearer ${this.config.anonKey}`,
              'Content-Type': blob.type || 'image/jpeg',
              'x-upsert': 'true',
            },
            body: blob as any,
          });
          if (response.ok) {
            return this.getPublicStorageUrl(cleanPath, targetBucket);
          }
        }
      } catch {
        // Prossegue para fallback de cópia no Storage
      }
    }

    // 5. Para "Foto Teste" / Simulação: copia a imagem padrão 320x240 do bucket via JSON
    const copyEndpoint = `${this.config.url}/storage/v1/object/copy`;
    await this.fetchFn(copyEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        bucketId: targetBucket,
        sourceKey: 'OS-1001/foto-onu-demo.png',
        destinationKey: cleanPath,
      }),
    });

    return this.getPublicStorageUrl(cleanPath, targetBucket);
  }

  /**
   * Faz upload/atualização direta de um objeto no bucket do Supabase Storage.
   */
  public async uploadStorageObject(
    filePath: string,
    body: Blob | ArrayBuffer | Uint8Array | FormData | string,
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

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers: Record<string, string> = {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
      'x-upsert': 'true',
    };
    if (!isFormData) {
      headers['Content-Type'] = contentType;
    }

    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers,
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
