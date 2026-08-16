import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { list } from '@vercel/blob';

const dryRun = process.argv.includes('--dry-run');
const required = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'BLOB_READ_WRITE_TOKEN',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function getR2Size(key) {
  try {
    const result = await client.send(new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    }));
    return result.ContentLength;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return undefined;
    throw error;
  }
}

let cursor;
let checked = 0;
let copied = 0;

do {
  const page = await list({ cursor, limit: 1000 });
  for (const blob of page.blobs) {
    checked += 1;
    const existingSize = await getR2Size(blob.pathname);
    if (existingSize === blob.size) {
      console.log(`verified ${blob.pathname}`);
      continue;
    }

    if (dryRun) {
      console.log(`would copy ${blob.pathname} (${blob.size} bytes)`);
      continue;
    }

    const response = await fetch(blob.downloadUrl);
    if (!response.ok) throw new Error(`Unable to download ${blob.pathname}: HTTP ${response.status}`);
    const body = new Uint8Array(await response.arrayBuffer());
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: blob.pathname,
      Body: body,
      ContentType: response.headers.get('content-type') || undefined,
    }));

    const verifiedSize = await getR2Size(blob.pathname);
    if (verifiedSize !== blob.size) {
      throw new Error(`Verification failed for ${blob.pathname}: expected ${blob.size}, got ${verifiedSize}`);
    }
    copied += 1;
    console.log(`copied and verified ${blob.pathname}`);
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

console.log(`${dryRun ? 'Dry run complete' : 'Migration complete'}: ${checked} checked, ${copied} copied`);
