import { describe, expect, it, vi } from 'vitest';
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DualReadStorageProvider } from './fallback';
import { R2StorageProvider } from './r2';
import { StorageObjectNotFoundError, type StorageProvider } from './types';

function fakeProvider(overrides: Partial<StorageProvider> = {}): StorageProvider {
  return {
    put: vi.fn(),
    delete: vi.fn(),
    getUrl: vi.fn(),
    ...overrides,
  };
}

describe('R2StorageProvider', () => {
  it('puts, resolves, and deletes objects using the S3-compatible client', async () => {
    const send = vi.fn().mockResolvedValue({});
    const provider = new R2StorageProvider({
      bucket: 'images',
      publicUrl: 'https://images.example.com',
      client: { send },
    });

    expect(await provider.put('items/a.png', new Uint8Array([1]), { contentType: 'image/png' }))
      .toBe('https://images.example.com/items/a.png');
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);

    expect(await provider.getUrl('items/a.png')).toBe('https://images.example.com/items/a.png');
    expect(send.mock.calls[1][0]).toBeInstanceOf(HeadObjectCommand);

    await provider.delete('https://images.example.com/items/a.png');
    expect(send.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(send.mock.calls[2][0].input.Key).toBe('items/a.png');
  });

  it('maps an R2 404 to a provider-independent missing-object error', async () => {
    const provider = new R2StorageProvider({
      bucket: 'images',
      publicUrl: 'https://images.example.com',
      client: { send: vi.fn().mockRejectedValue({ $metadata: { httpStatusCode: 404 } }) },
    });
    await expect(provider.getUrl('missing.png')).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });
});

describe('DualReadStorageProvider', () => {
  it('falls back to Vercel when an object is missing from R2', async () => {
    const primary = fakeProvider({
      getUrl: vi.fn().mockRejectedValue(new StorageObjectNotFoundError('legacy.png')),
    });
    const fallback = fakeProvider({
      getUrl: vi.fn().mockResolvedValue('https://legacy.public.blob.vercel-storage.com/legacy.png'),
    });
    const provider = new DualReadStorageProvider(primary, fallback);

    await expect(provider.getUrl('legacy.png'))
      .resolves.toBe('https://legacy.public.blob.vercel-storage.com/legacy.png');
    expect(fallback.getUrl).toHaveBeenCalledWith('legacy.png');
  });
});
