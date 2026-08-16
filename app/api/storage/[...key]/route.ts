import { NextResponse } from 'next/server';
import { getStorageProvider, StorageObjectNotFoundError } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join('/');
  try {
    const url = await getStorageProvider().getUrl(objectKey);
    return NextResponse.redirect(url, 307);
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }
    throw error;
  }
}
