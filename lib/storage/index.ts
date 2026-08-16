import { DualReadStorageProvider } from './fallback';
import { createR2StorageProvider } from './r2';
import type { StorageProvider } from './types';
import { VercelBlobStorageProvider } from './vercel';

let storage: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (storage) return storage;

  const vercel = new VercelBlobStorageProvider();
  const provider = process.env.STORAGE_PROVIDER || 'vercel';
  if (provider === 'vercel') {
    storage = vercel;
  } else if (provider === 'r2') {
    storage = new DualReadStorageProvider(createR2StorageProvider(), vercel);
  } else {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }
  return storage;
}

export type { PutOptions, StorageProvider } from './types';
export { StorageObjectNotFoundError } from './types';
export { R2StorageProvider } from './r2';
export { VercelBlobStorageProvider } from './vercel';
export { DualReadStorageProvider } from './fallback';
