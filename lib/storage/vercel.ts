import { del, list, put } from '@vercel/blob';
import { StorageObjectNotFoundError, type PutOptions, type StorageProvider } from './types';

export class VercelBlobStorageProvider implements StorageProvider {
  async put(key: string, body: Uint8Array, options: PutOptions = {}): Promise<string> {
    const blob = await put(key, Buffer.from(body), {
      access: 'public',
      addRandomSuffix: false,
      contentType: options.contentType,
    });
    return blob.url;
  }

  async delete(keyOrUrl: string): Promise<void> {
    await del(keyOrUrl);
  }

  async getUrl(key: string): Promise<string> {
    if (key.startsWith('https://') && key.includes('blob.vercel-storage.com')) return key;

    const result = await list({ prefix: key, limit: 1 });
    const blob = result.blobs.find((candidate) => candidate.pathname === key);
    if (!blob) throw new StorageObjectNotFoundError(key);
    return blob.url;
  }
}
