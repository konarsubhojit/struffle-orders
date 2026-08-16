export interface PutOptions {
  contentType?: string;
}

export interface StorageProvider {
  put(key: string, body: Uint8Array, options?: PutOptions): Promise<string>;
  delete(keyOrUrl: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}

export class StorageObjectNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`Storage object not found: ${key}`);
    this.name = 'StorageObjectNotFoundError';
  }
}
