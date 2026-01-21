// @ts-nocheck
import { DateTime } from 'luxon';

/**
 * Timezone for date calculations (Asia/Kolkata / IST)
 */
export const DIGEST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get today's date in the digest timezone (Kolkata)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getTodayInKolkata() {
  return DateTime.now().setZone(DIGEST_TIMEZONE).toFormat('yyyy-MM-dd');
}

/**
 * Get the start of a day in Kolkata timezone as a JavaScript Date (UTC)
 * @param {number} daysFromToday - Number of days from today (0 = today, 1 = tomorrow, etc.)
 * @returns {Date} JavaScript Date object representing start of that day in UTC
 */
export function getKolkataStartOfDay(daysFromToday: number): any {
  const kolkataDate = DateTime.now()
    .setZone(DIGEST_TIMEZONE)
    .startOf('day')
    .plus({ days: daysFromToday });
  
  return kolkataDate.toJSDate();
}

/**
 * Compute the time buckets for digest reminders
 * Returns UTC timestamps for filtering database records
 * 
 * Let S0 be "start of today" in Kolkata at runtime.
 * Uses non-overlapping ranges so each order appears in only one section:
 * - 1-day bucket (due today or tomorrow): [S0, startOfDay(today+2))
 * - 3-day bucket (due in 2-3 days): [startOfDay(today+2), startOfDay(today+4))
 * - 7-day bucket (due in 4-7 days): [startOfDay(today+4), startOfDay(today+8))
 * 
 * @returns {Object} Object containing bucket ranges with start (inclusive) and end (exclusive)
 */
export function computeDigestBuckets() {
  return {
    '1d': {
      start: getKolkataStartOfDay(0),
      end: getKolkataStartOfDay(2)
    },
    '3d': {
      start: getKolkataStartOfDay(2),
      end: getKolkataStartOfDay(4)
    },
    '7d': {
      start: getKolkataStartOfDay(4),
      end: getKolkataStartOfDay(8)
    }
  };
}

/**
 * Format a date for display in the digest email
 * @param {Date|string} date - Date to format
 * @returns {string} Human-readable date in Kolkata timezone
 */
export function formatDateForDigest(date: any): string {
  const dt = DateTime.fromJSDate(date instanceof Date ? date : new Date(date))
    .setZone(DIGEST_TIMEZONE);
  
  return dt.toFormat('dd MMM yyyy, hh:mm a') + ' IST';
}
