// Authentication Configuration Constants

// Google OAuth Issuers
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

// JWKS (JSON Web Key Set) Configuration
export const JWKS_CONFIG = {
  CACHE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  RATE_LIMIT_PER_MINUTE: 10
};
