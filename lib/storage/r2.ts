import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { StorageObjectNotFoundError, type PutOptions, type StorageProvider } from './types';

interface S3Sender {
  send(command: PutObjectCommand | DeleteObjectCommand | HeadObjectCommand): Promise<unknown>;
}

interface R2StorageOptions {
  bucket: string;
  publicUrl: string;
  client: S3Sender;
}

function normalizeKey(keyOrUrl: string, publicUrl: string): string {
  if (!keyOrUrl.startsWith('http')) return keyOrUrl.replace(/^\/+/, '');

  const url = new URL(keyOrUrl);
  const publicBase = new URL(publicUrl);
  if (url.origin !== publicBase.origin) return url.pathname.replace(/^\/+/, '');
  return url.pathname.slice(publicBase.pathname.replace(/\/$/, '').length).replace(/^\/+/, '');
}

export class R2StorageProvider implements StorageProvider {
  constructor(private readonly options: R2StorageOptions) {}

  async put(key: string, body: Uint8Array, options: PutOptions = {}): Promise<string> {
    await this.options.client.send(new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType,
    }));
    return this.publicUrl(key);
  }

  async delete(keyOrUrl: string): Promise<void> {
    await this.options.client.send(new DeleteObjectCommand({
      Bucket: this.options.bucket,
      Key: normalizeKey(keyOrUrl, this.options.publicUrl),
    }));
  }

  async getUrl(key: string): Promise<string> {
    try {
      await this.options.client.send(new HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      }));
      return this.publicUrl(key);
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      const name = (error as { name?: string }).name;
      if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') {
        throw new StorageObjectNotFoundError(key);
      }
      throw error;
    }
  }

  private publicUrl(key: string): string {
    return `${this.options.publicUrl.replace(/\/$/, '')}/${key.replace(/^\/+/, '')}`;
  }
}

export function createR2StorageProvider(): R2StorageProvider {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error('R2 storage is selected but its environment variables are incomplete');
  }

  const config: S3ClientConfig = {
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  };
  return new R2StorageProvider({ bucket, publicUrl, client: new S3Client(config) });
}
