const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function readIdempotencyKey(headers: Headers): string | null {
  const key = headers.get('idempotency-key')?.trim();
  if (!key) return null;
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new Error('Idempotency-Key must be 8-128 URL-safe characters');
  }
  return key;
}

export function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}
