import { createLogger } from '@/lib/utils/logger';
import { StorageObjectNotFoundError, type PutOptions, type StorageProvider } from './types';

const logger = createLogger('StorageFallback');

export class DualReadStorageProvider implements StorageProvider {
  constructor(
    private readonly primary: StorageProvider,
    private readonly fallback: StorageProvider,
  ) {}

  put(key: string, body: Uint8Array, options?: PutOptions): Promise<string> {
    return this.primary.put(key, body, options);
  }

  delete(keyOrUrl: string): Promise<void> {
    if (keyOrUrl.includes('blob.vercel-storage.com')) return this.fallback.delete(keyOrUrl);
    const key = keyOrUrl.startsWith('/api/storage/')
      ? keyOrUrl.slice('/api/storage/'.length)
      : keyOrUrl;
    return this.primary.delete(decodeURIComponent(key));
  }

  async getUrl(key: string): Promise<string> {
    try {
      return await this.primary.getUrl(key);
    } catch (error) {
      if (!(error instanceof StorageObjectNotFoundError)) throw error;
      logger.warn('Object missing from R2; using Vercel Blob fallback', { key });
      return this.fallback.getUrl(key);
    }
  }
}
