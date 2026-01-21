import { RedisClientType } from 'redis';
import { Request, Response, NextFunction } from 'express';
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CacheMiddleware');

// Default cache TTL (Time To Live) in seconds
// Using 3 days (259200s) for small project with infrequent updates
const DEFAULT_TTL = 259200; // 3 days

// Cache version keys - separate versioning for different resource types
export const CACHE_VERSION_KEYS = {
  ITEMS: 'cache:v:items',
  ORDERS: 'cache:v:orders',
  FEEDBACKS: 'cache:v:feedbacks',
  GLOBAL: 'cache:v:global', // Fallback for non-resource-specific caches
} as const;

// Map URL patterns to cache version keys
const CACHE_VERSION_MAP: Record<string, string> = {
  '/api/items': CACHE_VERSION_KEYS.ITEMS,
  '/api/orders': CACHE_VERSION_KEYS.ORDERS,
  '/api/feedbacks': CACHE_VERSION_KEYS.FEEDBACKS,
};

// Legacy export for backward compatibility
export const CACHE_VERSION_KEY = CACHE_VERSION_KEYS.GLOBAL;

// Types for version memoization
interface VersionMemo {
  version: number;
  fetchedAt: number;
}

// In-memory memoization for version lookup to reduce Redis calls in burst traffic
const localVersions = new Map<string, VersionMemo>();

// Memoization TTL for cache version (in ms). Reduce this to minimize stale data risk.
// Trade-off: Lower values increase Redis load but improve consistency.
// 50ms provides good balance: fast enough for Redis lookups, ensures cache invalidation
// is effective within human reaction time (user creating order then refreshing)
export const VERSION_MEMO_TTL_MS = 50; // 50ms memoization

// In-memory locks for preventing cache stampede
// Maps cache key to a list of pending resolvers
type PendingResolver = (data: unknown) => void;
const pendingRequests = new Map<string, PendingResolver[]>();

// Lock timeout to prevent deadlocks (in milliseconds)
const LOCK_TIMEOUT = 30000; // 30 seconds

/**
 * Check if response is an error response
 */
function isErrorResponse(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  
  // If response has 'error' key, it's likely an error response
  if ('error' in body) {
    return true;
  }
  
  // If response only has 'message' key (common for simple errors)
  // Note: Valid responses with 'message' + other properties will still be cached
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === 'message';
}

/**
 * Validate paginated response structure
 */
function validatePaginatedResponse(body: Record<string, unknown>): boolean {
  // Ensure items/orders/feedbacks array exists and pagination metadata is present
  const dataKey = body.items !== undefined ? 'items' : 
                  body.orders !== undefined ? 'orders' : 
                  body.feedbacks !== undefined ? 'feedbacks' : null;
  
  if (!dataKey || !Array.isArray(body[dataKey]) || !body.pagination) {
    logger.debug('Paginated response validation failed', { 
      hasDataKey: !!dataKey,
      dataKey,
      isArray: dataKey ? Array.isArray(body[dataKey]) : false,
      hasPagination: !!body.pagination 
    });
    return false;
  }
  
  logger.debug('Paginated response validated successfully', { dataKey, itemCount: (body[dataKey] as unknown[]).length });
  return true;
}

/**
 * Validate response data before caching to prevent caching invalid/empty data
 */
function validateResponseForCaching(body: unknown): boolean {
  // Don't cache null or undefined responses
  if (body === null || body === undefined) {
    return false;
  }
  
  // Don't cache error responses
  if (isErrorResponse(body)) {
    return false;
  }
  
  // For paginated responses, validate structure
  if (body && typeof body === 'object' && 'pagination' in body) {
    return validatePaginatedResponse(body as Record<string, unknown>);
  }
  
  // For array responses, ensure it's a valid array
  if (Array.isArray(body)) {
    return true; // Cache empty arrays too, as they're valid responses
  }
  
  // Cache all other valid object responses
  return typeof body === 'object';
}

/**
 * Get the cache version from Redis with in-memory memoization
 * This reduces Redis lookups in burst traffic on warm lambdas
 */
export async function getCacheVersion(redis: RedisClientType, versionKey: string = CACHE_VERSION_KEYS.GLOBAL): Promise<number> {
  const now = Date.now();
  
  // Return memoized version if still valid
  const cached = localVersions.get(versionKey);
  if (cached && (now - cached.fetchedAt) < VERSION_MEMO_TTL_MS) {
    logger.debug('Using memoized cache version', { versionKey, version: cached.version });
    return cached.version;
  }
  
  try {
    let version = await redis.get(versionKey);
    
    if (version === null) {
      // Initialize version to 1 if it doesn't exist (use SETNX for atomicity)
      const wasSet = await redis.setNX(versionKey, '1');
      if (wasSet) {
        version = '1';
        logger.debug('Initialized cache version', { versionKey, version: 1 });
      } else {
        // Another process set it first, fetch the actual value
        version = await redis.get(versionKey) || '1';
        logger.debug('Fetched existing cache version after race', { versionKey, version });
      }
    }
    
    const parsedVersion = Number.parseInt(version, 10);
    
    // Update memoization
    localVersions.set(versionKey, { version: parsedVersion, fetchedAt: now });
    
    logger.debug('Fetched cache version from Redis', { versionKey, version: parsedVersion });
    return parsedVersion;
  } catch (error: unknown) {
    logger.error('Failed to get cache version', { versionKey, error: error instanceof Error ? error.message : 'Unknown error' });
    // Return memoized version or default to 1 on error
    return cached ? cached.version : 1;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCacheVersion(redis, versionKey) instead
 */
export async function getGlobalCacheVersion(redis: RedisClientType): Promise<number> {
  return getCacheVersion(redis, CACHE_VERSION_KEYS.GLOBAL);
}

/**
 * Bump (increment) a cache version to invalidate cached entries for that resource type
 * This is more efficient than SCAN-based invalidation for serverless environments
 */
export async function bumpCacheVersion(versionKey: string = CACHE_VERSION_KEYS.GLOBAL): Promise<number | null> {
  try {
    const redis = getRedisIfReady();
    
    if (!redis) {
      logger.debug('Redis not ready, skipping cache version bump', { versionKey });
      return null;
    }
    
    const newVersion = await redis.incr(versionKey);
    
    // Clear local memoization to force all subsequent requests to fetch the new version from Redis
    // This ensures cache invalidation works correctly even when requests come within the memo TTL window
    localVersions.delete(versionKey);
    
    logger.info('Cache version bumped', { versionKey, newVersion });
    return newVersion;
  } catch (error: unknown) {
    logger.error('Failed to bump cache version', { versionKey, error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use bumpCacheVersion(versionKey) instead
 */
export async function bumpGlobalCacheVersion(): Promise<number | null> {
  return bumpCacheVersion(CACHE_VERSION_KEYS.GLOBAL);
}

/**
 * Reset the in-memory version cache and pending requests (useful for testing)
 */
export function resetVersionMemo(): void {
  localVersions.clear();
  pendingRequests.clear();
}

/**
 * Determine which cache version key to use based on the request URL
 */
function getCacheVersionKeyForUrl(url: string): string {
  // Check if URL starts with any of the mapped patterns
  for (const [pattern, versionKey] of Object.entries(CACHE_VERSION_MAP)) {
    if (url.startsWith(pattern)) {
      return versionKey;
    }
  }
  
  // Default to global version key for unmapped URLs
  return CACHE_VERSION_KEYS.GLOBAL;
}

/**
 * Generate a versioned cache key from request path, method, and query parameters
 * Format: v{VERSION}:{METHOD}:{FULL_PATH}?{SORTED_QUERY}
 */
export function generateCacheKey(req: Request, version: number | null = null): string {
  // Use baseUrl + path to get the full path including mounted router base
  // baseUrl contains the mount point (e.g., '/api/items')
  // path contains the route path relative to the router (e.g., '/', '/:id')
  const fullPath = req.baseUrl + req.path;
  const method = req.method || 'GET';
  const queryString = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key] as string}`)
    .join('&');
  
  const pathWithQuery = queryString ? `${fullPath}?${queryString}` : fullPath;
  
  // If version is provided, include it in the key
  if (version !== null) {
    return `v${version}:${method}:${pathWithQuery}`;
  }
  
  // For backward compatibility, return path-only key if no version provided
  return pathWithQuery;
}

/**
 * Wait for a pending cache request to complete
 * Returns the cached data if available, null if timeout or error
 */
async function waitForPendingRequest(cacheKey: string, redis: RedisClientType): Promise<unknown> {
  void redis;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.debug('Lock wait timeout', { key: cacheKey });
      resolve(null);
    }, LOCK_TIMEOUT);
    
    if (!pendingRequests.has(cacheKey)) {
      clearTimeout(timeout);
      resolve(null);
      return;
    }
    
    const waiters = pendingRequests.get(cacheKey);
    if (waiters) {
      waiters.push((data: unknown) => {
        clearTimeout(timeout);
        resolve(data);
      });
    }
  });
}

/**
 * Notify all waiting requests that cache has been populated
 */
function notifyPendingRequests(cacheKey: string, data: unknown): void {
  const waiters = pendingRequests.get(cacheKey);
  if (waiters) {
    pendingRequests.delete(cacheKey);
    waiters.forEach(resolve => resolve(data));
  }
}

/**
 * Cache middleware for GET requests with stampede protection
 * Uses request coalescing to prevent multiple identical requests from hitting the database
 * Now uses global versioned cache keys for efficient invalidation
 */
export function cacheMiddleware(ttl: number = DEFAULT_TTL) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Declare cacheKey outside try block for cleanup in catch
    let cacheKey: string | null = null;

    try {
      // Prefer ready client for serverless optimization
      let redis = getRedisIfReady();
      
      // If not ready, try to get client (this may involve connection)
      if (!redis) {
        redis = await getRedisClient();
      }
      
      // Skip caching if Redis is not available
      if (!redis) {
        logger.debug('Redis not available, skipping cache');
        return next();
      }

      // Determine which cache version key to use based on the request URL
      const fullPath = req.baseUrl + req.path;
      const versionKey = getCacheVersionKeyForUrl(fullPath);
      
      // Get the current cache version for this resource type
      const version = await getCacheVersion(redis, versionKey);
      
      // Generate versioned cache key: v{VERSION}:{METHOD}:{PATH}
      cacheKey = generateCacheKey(req, version);
      
      // Try to get cached data
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        logger.debug('Cache hit', { key: cacheKey, version });
        // Parse and return cached data
        return res.json(JSON.parse(cachedData));
      }

      logger.debug('Cache miss', { key: cacheKey, version });
      
      // Check if there's already a pending request for this key (stampede protection)
      if (pendingRequests.has(cacheKey)) {
        logger.debug('Request coalescing - waiting for pending request', { key: cacheKey });
        const coalescedData = await waitForPendingRequest(cacheKey, redis);
        if (coalescedData) {
          logger.debug('Returning coalesced data', { key: cacheKey });
          return res.json(coalescedData);
        }
        // If wait failed, try cache again or fall through to fetch
        const retryData = await redis.get(cacheKey);
        if (retryData) {
          return res.json(JSON.parse(retryData));
        }
      }
      
      // Register this request as the one that will populate the cache
      pendingRequests.set(cacheKey, []);
      
      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);
      
      // Track if response was sent to cleanup pending requests
      let responseSent = false;
      let cleanedUp = false;
      
      // Cleanup function to ensure pending requests are notified (only once)
      const cleanupPendingRequest = () => {
        if (!cleanedUp && !responseSent && cacheKey && pendingRequests.has(cacheKey)) {
          cleanedUp = true;
          notifyPendingRequests(cacheKey, null);
        }
      };
      
      // Listen for response finish to cleanup if response was sent without res.json
      res.on('finish', cleanupPendingRequest);
      res.on('close', cleanupPendingRequest);
      
      // Override res.json to cache the response
      res.json = function(body: unknown) {
        responseSent = true;
        
        // Validate response before caching to prevent caching invalid/empty data
        const shouldCache = validateResponseForCaching(body);
        
        if (shouldCache && cacheKey) {
          // Cache the response asynchronously (don't wait)
          redis.setEx(cacheKey, ttl, JSON.stringify(body))
            .then(() => {
              logger.debug('Response cached', { key: cacheKey, ttl });
            })
            .catch((err: Error) => {
              logger.error('Failed to cache response', { key: cacheKey, error: err.message });
            });
          
          // Notify waiting requests with the cached data
          notifyPendingRequests(cacheKey, body);
        } else {
          logger.debug('Response not cached due to validation failure', { key: cacheKey });
          // Still notify pending requests to unblock them (they'll re-fetch)
          if (cacheKey) {
            notifyPendingRequests(cacheKey, null);
          }
        }
        
        // Call original res.json
        return originalJson(body);
      };
      
      next();
    } catch (error: unknown) {
      logger.error('Cache middleware error', error);
      // Cleanup pending requests on error
      if (cacheKey && pendingRequests.has(cacheKey)) {
        notifyPendingRequests(cacheKey, null);
      }
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Invalidate cache for a specific pattern using SCAN for better performance
 * @deprecated Prefer using bumpGlobalCacheVersion() for invalidation in serverless environments
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    
    if (!redis) {
      logger.debug('Redis not available, skipping cache invalidation');
      return;
    }

    // Use SCAN instead of KEYS for better performance in production
    const keys: string[] = [];
    let scanCursor = '0';
    
    do {
      const result = await redis.scan(scanCursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      scanCursor = result.cursor.toString();
      keys.push(...result.keys);
    } while (scanCursor !== '0');
    
    if (keys.length === 0) {
      logger.debug('No cache keys found for pattern', { pattern });
      return;
    }

    // Delete all matching keys
    await redis.del(keys);
    logger.info('Cache invalidated (SCAN)', { pattern, keysDeleted: keys.length });
  } catch (error: unknown) {
    logger.error('Failed to invalidate cache', { pattern, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * Invalidate all item-related caches by bumping item version
 * This only invalidates item caches, not orders or feedbacks
 */
export async function invalidateItemCache(): Promise<void> {
  logger.debug('Invalidating item cache via version bump');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ITEMS);
}

/**
 * Invalidate all order-related caches by bumping order version
 * This only invalidates order caches, not items or feedbacks
 */
export async function invalidateOrderCache(): Promise<void> {
  logger.debug('Invalidating order cache via version bump');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ORDERS);
}

/**
 * Invalidate all feedback-related caches by bumping feedback version
 * This only invalidates feedback caches, not items or orders
 */
export async function invalidateFeedbackCache(): Promise<void> {
  logger.debug('Invalidating feedback cache via version bump');
  await bumpCacheVersion(CACHE_VERSION_KEYS.FEEDBACKS);
}

/**
 * Invalidate paginated order history caches by bumping order version
 * This only invalidates order caches, not all caches
 */
export async function invalidatePaginatedOrderCache(): Promise<void> {
  logger.debug('Invalidating order cache via version bump (called from invalidatePaginatedOrderCache)');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ORDERS);
}

/**
 * Invalidate priority orders cache by bumping order version
 * This only invalidates order caches, not all caches
 */
export async function invalidatePriorityOrderCache(): Promise<void> {
  logger.debug('Invalidating order cache via version bump (called from invalidatePriorityOrderCache)');
  await bumpCacheVersion(CACHE_VERSION_KEYS.ORDERS);
}

/**
 * Clear all caches (debug utility)
 * This flushes all Redis data - use with caution in production
 * For normal cache invalidation, prefer bumpCacheVersion(versionKey)
 */
export async function clearAllCache(): Promise<void> {
  try {
    const redis = await getRedisClient();
    
    if (!redis) {
      logger.debug('Redis not available, skipping cache clear');
      return;
    }

    await redis.flushDb();
    
    // Reset all version keys after flushing
    const versionKeys = Object.values(CACHE_VERSION_KEYS);
    for (const versionKey of versionKeys) {
      await redis.set(versionKey, '1');
      localVersions.set(versionKey, { version: 1, fetchedAt: Date.now() });
    }
    
    logger.info('All caches cleared and versions reset');
  } catch (error: unknown) {
    logger.error('Failed to clear all caches', error);
  }
}
