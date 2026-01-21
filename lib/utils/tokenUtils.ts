// @ts-nocheck
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param {number} length - Length of the token in bytes (default 32)
 * @returns {string} - Hex-encoded token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure feedback token that expires in specified days
 * @param {number} expiryDays - Number of days until token expires (default 30)
 * @returns {object} - Object with token and expiresAt date
 */
export function generateFeedbackToken(expiryDays: number = 30) {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  
  return {
    token,
    expiresAt
  };
}
