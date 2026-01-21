// @ts-nocheck
import { PAGINATION } from '@/lib/constants/paginationConstants';

const ALLOWED_LIMITS = new Set(PAGINATION.ALLOWED_LIMITS);

/**
 * Parse and validate pagination parameters from query string
 * Ensures page and limit are valid numbers within allowed ranges
 * 
 * @param {Object} query - Express request query object
 * @param {Object} options - Optional configuration
 * @param {Set<number>} options.allowedLimits - Set of allowed limit values (defaults to PAGINATION.ALLOWED_LIMITS)
 * @param {number} options.defaultLimit - Default limit if not provided or invalid (defaults to PAGINATION.DEFAULT_LIMIT)
 * @param {number} options.defaultPage - Default page if not provided or invalid (defaults to PAGINATION.DEFAULT_PAGE)
 * @returns {Object} Validated pagination parameters { page, limit, search }
 * 
 * @example
 * // In a route handler
 * const { page, limit, search } = parsePaginationParams(req.query);
 * const result = await Model.findPaginated({ page, limit });
 */
export function parsePaginationParams(query, options = {}) {
  const {
    allowedLimits = ALLOWED_LIMITS,
    defaultLimit = PAGINATION.DEFAULT_LIMIT,
    defaultPage = PAGINATION.DEFAULT_PAGE
  } = options;

  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  
  return {
    page: Number.isNaN(parsedPage) || parsedPage < 1 ? defaultPage : parsedPage,
    limit: allowedLimits.has(parsedLimit) ? parsedLimit : defaultLimit,
    search: query.search || ''
  };
}

/**
 * Calculate offset for database queries based on page and limit
 * 
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Number of items per page
 * @returns {number} Offset value for database query
 * 
 * @example
 * const offset = calculateOffset(2, 10); // Returns 10
 */
export function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

/**
 * Build a standard pagination response object
 * 
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata { page, limit, total, totalPages }
 * 
 * @example
 * const pagination = buildPaginationResponse(1, 10, 100);
 * // Returns { page: 1, limit: 10, total: 100, totalPages: 10 }
 */
export function buildPaginationResponse(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}
