/**
 * Date formatting utilities
 */

export type DateFormatType = 'date' | 'datetime' | 'time' | 'relative' | 'short';

/**
 * Format a date according to the specified format type
 */
export function formatDate(date: Date | string | number, format: DateFormatType = 'date'): string {
  const d = date instanceof Date ? date : new Date(date);
  
  if (Number.isNaN(d.getTime())) {
    return 'Invalid date';
  }

  switch (format) {
    case 'date':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    
    case 'datetime':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    
    case 'time':
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    
    case 'relative':
      return formatRelativeTime(d);
    
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const isFuture = diffMs < 0;
  const absDiffMinutes = Math.abs(diffMinutes);
  const absDiffHours = Math.abs(diffHours);
  const absDiffDays = Math.abs(diffDays);
  const absDiffWeeks = Math.abs(diffWeeks);
  const absDiffMonths = Math.abs(diffMonths);
  const absDiffYears = Math.abs(diffYears);

  const formatUnit = (value: number, unit: string): string => {
    const plural = value !== 1 ? 's' : '';
    if (isFuture) {
      return `in ${value} ${unit}${plural}`;
    }
    return `${value} ${unit}${plural} ago`;
  };

  if (Math.abs(diffSeconds) < 60) {
    return 'just now';
  }

  if (absDiffMinutes < 60) {
    return formatUnit(absDiffMinutes, 'minute');
  }

  if (absDiffHours < 24) {
    return formatUnit(absDiffHours, 'hour');
  }

  if (absDiffDays < 7) {
    return formatUnit(absDiffDays, 'day');
  }

  if (absDiffWeeks < 4) {
    return formatUnit(absDiffWeeks, 'week');
  }

  if (absDiffMonths < 12) {
    return formatUnit(absDiffMonths, 'month');
  }

  return formatUnit(absDiffYears, 'year');
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  const d = date instanceof Date ? date : new Date(date);
  return d.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  const d = date instanceof Date ? date : new Date(date);
  return d.getTime() > Date.now();
}

/**
 * Get start of day for a date
 */
export function startOfDay(date: Date | string | number): Date {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day for a date
 */
export function endOfDay(date: Date | string | number): Date {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for input[type="date"] value
 */
export function toDateInputValue(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format date for input[type="datetime-local"] value
 */
export function toDateTimeInputValue(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 16);
}
