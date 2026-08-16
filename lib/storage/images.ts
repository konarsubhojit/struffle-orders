import { IMAGE_CONFIG } from '@/lib/constants/imageConstants';
import { getStorageProvider } from './index';

export async function uploadDataImage(image: string, prefix: string): Promise<string> {
  const matches = image.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!matches) throw new Error('Invalid image format');

  const extension = matches[1].replace('jpeg', 'jpg');
  const buffer = Buffer.from(matches[2], 'base64');
  if (buffer.length > IMAGE_CONFIG.MAX_SIZE) {
    throw new Error(`Image size should be less than ${IMAGE_CONFIG.MAX_SIZE_MB}MB`);
  }

  const key = `${prefix}/${crypto.randomUUID()}.${extension}`;
  const url = await getStorageProvider().put(key, buffer, { contentType: `image/${matches[1]}` });
  if (process.env.STORAGE_PROVIDER !== 'r2') return url;
  return `/api/storage/${key.split('/').map(encodeURIComponent).join('/')}`;
}
