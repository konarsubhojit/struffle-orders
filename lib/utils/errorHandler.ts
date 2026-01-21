// @ts-nocheck
import { createLogger } from '@/lib/utils/logger';
import { HTTP_STATUS } from '@/lib/constants/httpConstants';

const logger = createLogger('ErrorHandler');

/**
 * Custom API Error class for controlled error responses
 * Use this for expected errors that should be returned to the client
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message to send to client
   * @param {boolean} isOperational - Whether this is an operational error (true) or programming error (false)
   */
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a 404 Not Found error
 * @param {string} resource - Resource name (e.g., 'Item', 'Order')
 * @returns {ApiError}
 */
export function notFoundError(resource = 'Resource') {
  return new ApiError(HTTP_STATUS.NOT_FOUND, `${resource} not found`);
}

/**
 * Create a 400 Bad Request error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
export function badRequestError(message) {
  return new ApiError(HTTP_STATUS.BAD_REQUEST, message);
}

/**
 * Create a 401 Unauthorized error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
export function unauthorizedError(message = 'Unauthorized') {
  return new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
}

/**
 * Create a 403 Forbidden error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
export function forbiddenError(message = 'Forbidden') {
  return new ApiError(HTTP_STATUS.FORBIDDEN, message);
}

/**
 * Global error handler middleware
 * Should be added at the end of the middleware chain in server.js
 * 
 * @example
 * // In server.js
 * import { errorHandler } from '@/lib/utils/errorHandler';
 * app.use(errorHandler);
 */
export function errorHandler(error, req, res, next) {
  // If headers are already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Handle known ApiError instances
  if (error instanceof ApiError) {
    logger.warn('API Error', {
      statusCode: error.statusCode,
      message: error.message,
      path: req.path,
      method: req.method
    });
    
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  // Handle unexpected errors
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  // Don't expose internal error details to client in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message
  });
}

/**
 * Async handler wrapper to catch promise rejections
 * Eliminates the need for try-catch blocks in every route handler
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Instead of:
 * router.get('/', async (req, res) => {
 *   try {
 *     const items = await Item.find();
 *     res.json(items);
 *   } catch (error: any) {
 *     next(error);
 *   }
 * });
 * 
 * // Use:
 * router.get('/', asyncHandler(async (req, res) => {
 *   const items = await Item.find();
 *   res.json(items);
 * }));
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
