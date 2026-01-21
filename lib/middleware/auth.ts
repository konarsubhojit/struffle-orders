// @ts-nocheck
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { createLogger } from '@/lib/utils/logger';
import { HTTP_STATUS } from '@/lib/constants/httpConstants';
import { GOOGLE_ISSUERS, JWKS_CONFIG } from '@/lib/constants/authConstants';

const logger = createLogger('AuthMiddleware');

/**
 * Check if issuer matches Google issuers
 * @param {string} issuer - Token issuer
 * @returns {boolean} Whether issuer is a valid Google issuer
 */
function isGoogleIssuer(issuer) {
  return GOOGLE_ISSUERS.includes(issuer);
}

// JWKS client for Google
const googleJwksClient = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
  cacheMaxAge: JWKS_CONFIG.CACHE_MAX_AGE,
  rateLimit: true,
  jwksRequestsPerMinute: JWKS_CONFIG.RATE_LIMIT_PER_MINUTE,
});

/**
 * Get the signing key from Google's JWKS endpoint
 * @param {string} header - JWT header
 * @returns {Promise<string>} Signing key
 */
async function getSigningKey(header: any) {
  return new Promise((resolve, reject) => {
    googleJwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Validate Google OAuth token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Decoded token payload
 */
async function validateGoogleToken(token: string) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const signingKey = await getSigningKey(decoded.header);
  
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      signingKey,
      {
        algorithms: ['RS256'],
        audience: process.env.GOOGLE_CLIENT_ID,
        issuer: GOOGLE_ISSUERS,
      },
      (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload);
        }
      }
    );
  });
}

/**
 * Validate token and extract user info
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User info extracted from token
 */
async function validateToken(token: string) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const issuer = decoded.payload.iss || '';

  if (isGoogleIssuer(issuer)) {
    const payload = await validateGoogleToken(token);
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider: 'google',
    };
  } else {
    throw new Error('Unsupported token issuer');
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
async function authMiddleware(req: any, res: any, next: any) {
  // Skip auth if explicitly disabled (for development only)
  // WARNING: This should never be enabled in production
  if (process.env.AUTH_DISABLED === 'true') {
    if (process.env.NODE_ENV === 'production') {
      logger.error('AUTH_DISABLED is set to true in production - this is a security risk!');
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Server configuration error' });
    }
    logger.warn('Authentication is disabled - dev mode active');
    req.user = { id: 'dev-user', email: 'dev@localhost', name: 'Dev User', provider: 'dev' };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Missing Authorization header');
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Authorization header is required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    logger.warn('Invalid Authorization header format');
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Authorization header must be Bearer token' });
  }

  const token = parts[1];

  try {
    const user = await validateToken(token);
    req.user = user;
    logger.debug('User authenticated', { userId: user.id, provider: user.provider });
    next();
  } catch (error: any) {
    logger.error('Token validation failed', error);
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 * Validates token if present, but allows unauthenticated requests
 */
async function optionalAuthMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return next();
  }

  const token = parts[1];

  try {
    const user = await validateToken(token);
    req.user = user;
  } catch (error: any) {
    // Silently ignore invalid tokens for optional auth
    logger.debug('Optional auth token validation failed', { error: error.message });
  }

  next();
}

export {
  authMiddleware,
  optionalAuthMiddleware,
  validateToken,
};
