import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { createLogger } from '@/lib/utils/logger';
import * as schema from '@/lib/db/schema';

const logger = createLogger('PostgreSQL');

// Declare global type for database caching
declare global {
  var neonDb: { db: any } | undefined;
}

if (!global.neonDb) {
  global.neonDb = { db: null };
}

let cached = global.neonDb;

export function getDatabase() {
  const uri = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (cached && cached.db) {
    return cached.db;
  }

  if (!uri) {
    throw new Error('NEON_DATABASE_URL and DATABASE_URL environment variable is not set');
  }

  logger.debug('Creating new database connection', {});
  const startTime = Date.now();

  try {
    const sql = neon(uri);
    cached.db = drizzle({ client: sql, schema });
    const duration = Date.now() - startTime;
    logger.info('Database connection established', { durationMs: duration });
    return cached.db;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Database connection failed', { durationMs: duration, error: error.message });
    throw error;
  }
}

export async function connectToDatabase() {
  return getDatabase();
}
