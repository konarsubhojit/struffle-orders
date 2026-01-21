// @ts-nocheck
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DBRetry');

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Execute a database operation with retry logic for transient failures
 * @param {Function} operation - Async function that performs the database operation
 * @param {Object} options - Retry configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelayMs - Initial delay in milliseconds (default: 100)
 * @param {number} options.maxDelayMs - Maximum delay in milliseconds (default: 1000)
 * @param {number} options.backoffMultiplier - Exponential backoff multiplier (default: 2)
 * @param {string} options.operationName - Name of the operation for logging
 * @returns {Promise<*>} Result of the database operation
 * @throws {Error} If all retry attempts fail
 */
export async function executeWithRetry(operation, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier, operationName = 'DB Operation' } = config;
  
  let lastError;
  let delay = initialDelayMs;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // Log retry success if this wasn't the first attempt
      if (attempt > 0) {
        logger.info(`${operationName} succeeded after retry`, { attempt, totalAttempts: attempt + 1 });
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        logger.error(`${operationName} failed after ${maxRetries + 1} attempts`, {
          error: error.message,
          stack: error.stack
        });
        break;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        logger.warn(`${operationName} failed with non-retryable error`, {
          error: error.message,
          attempt: attempt + 1
        });
        throw error;
      }
      
      // Log retry attempt
      logger.warn(`${operationName} failed, retrying...`, {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        delayMs: delay,
        error: error.message
      });
      
      // Wait before retrying with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }
  
  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Determine if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors and timeouts are retryable
  const retryableMessages = [
    'econnrefused',
    'econnreset',
    'etimedout',
    'enotfound',
    'eai_again',
    'enetunreach',
    'timeout',
    'network',
    'connection',
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  // Check if error message or code contains retryable keywords
  return retryableMessages.some(keyword => 
    errorMessage.includes(keyword) || 
    errorCode.includes(keyword)
  );
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate database query result to ensure it's not empty due to an error
 * This helps catch cases where a query returns empty results unexpectedly
 * 
 * NOTE: This function is exported for use in models but not currently used.
 * It's provided as a defensive programming utility for future enhancements.
 * Models can optionally use this to validate critical query results.
 * 
 * @param {*} result - Query result to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowEmpty - Whether empty results are valid (default: true)
 * @param {string} options.operationName - Name of the operation for logging
 * @returns {*} The validated result
 * @throws {Error} If result is invalid
 */
export function validateQueryResult(result, options = {}) {
  const { allowEmpty = true, operationName = 'Query' } = options;
  
  // Null or undefined is never valid
  if (result === null || result === undefined) {
    logger.error(`${operationName} returned null/undefined`, { result });
    throw new Error(`${operationName} returned invalid result: ${result}`);
  }
  
  // For array results, check if empty is allowed
  if (Array.isArray(result) && result.length === 0 && !allowEmpty) {
    logger.warn(`${operationName} returned empty array`, { allowEmpty });
    throw new Error(`${operationName} returned unexpected empty result`);
  }
  
  return result;
}
