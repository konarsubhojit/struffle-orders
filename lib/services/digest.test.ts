import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { isDigestRequestAuthorized } from './digestAuth';
import { getDigestPeriodWindow, isDigestAlreadySent } from './digestService';

describe('digest authentication', () => {
  it('rejects missing and incorrect secrets', () => {
    expect(isDigestRequestAuthorized(new Headers(), 'shared-secret')).toBe(false);
    expect(isDigestRequestAuthorized(
      new Headers({ 'X-Digest-Secret': 'wrong-secret' }),
      'shared-secret',
    )).toBe(false);
  });

  it('accepts the shared header secret', () => {
    expect(isDigestRequestAuthorized(
      new Headers({ 'X-Digest-Secret': 'shared-secret' }),
      'shared-secret',
    )).toBe(true);
  });
});

describe('digest idempotency', () => {
  it('uses a stable key throughout each configured period', () => {
    const monday = DateTime.fromISO('2026-08-17T09:00:00', { zone: 'Asia/Kolkata' });
    const friday = DateTime.fromISO('2026-08-21T18:00:00', { zone: 'Asia/Kolkata' });
    expect(getDigestPeriodWindow('weekly', monday).key)
      .toBe(getDigestPeriodWindow('weekly', friday).key);
    expect(isDigestAlreadySent({ status: 'sent' })).toBe(true);
    expect(isDigestAlreadySent({ status: 'failed' })).toBe(false);
  });
});
