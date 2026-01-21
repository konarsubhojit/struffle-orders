import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('RedisClient');

let redisClient: RedisClientType | null = null;
let isConnecting = false;

/**
 * Get or create the Redis client instance
 * @returns {Promise<RedisClientType|null>} Redis client or null if Redis is not configured
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  // Return existing client if already connected
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // Return null if Redis URL is not configured
  if (!process.env.REDIS_URL) {
    logger.info('Redis URL not configured, caching disabled');
    return null;
  }

  // Prevent multiple concurrent connection attempts
  if (isConnecting) {
    logger.debug('Redis connection already in progress');
    return null;
  }

  try {
    isConnecting = true;
    logger.info('Connecting to Redis...');
    
    redisClient = createClient({ 
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          // Exponential backoff: 50ms, 100ms, 200ms, etc.
          return Math.min(retries * 50, 3000);
        }
      }
    });

    // Event handlers
    redisClient.on('error', (err: Error) => {
      logger.error('Redis client error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting');
    });

    await redisClient.connect();
    logger.info('Redis connection successful');
    
    return redisClient;
  } catch (error: unknown) {
    logger.error('Failed to connect to Redis', error);
    redisClient = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Gracefully close the Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
      redisClient = null;
    } catch (error: unknown) {
      logger.error('Error closing Redis connection', error);
      // Force disconnect on error
      if (redisClient) {
        try {
          await redisClient.disconnect();
        } catch (disconnectError) {
          logger.error('Error disconnecting Redis', disconnectError);
        }
      }
      redisClient = null;
    }
  }
}

/**
 * Check if Redis is connected and available
 * @returns {boolean} True if Redis is connected
 */
export function isRedisConnected(): boolean {
  return !!(redisClient && redisClient.isOpen);
}

/**
 * Get Redis client if it's already connected and ready (synchronous check)
 * This is useful for serverless environments to avoid connection overhead per request
 * @returns {RedisClientType|null} Redis client if ready, null otherwise
 */
export function getRedisIfReady(): RedisClientType | null {
  // Return the redis client only if it exists and is open
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  return null;
}
