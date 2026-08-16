import { timingSafeEqual } from 'node:crypto';

export function isDigestRequestAuthorized(headers: Headers, expectedSecret = process.env.DIGEST_SECRET): boolean {
  const providedSecret = headers.get('x-digest-secret');
  if (!expectedSecret || !providedSecret) return false;

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
