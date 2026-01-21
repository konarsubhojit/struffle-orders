// Time constants for the application

// Milliseconds conversions
export const MILLISECONDS = {
  PER_SECOND: 1000,
  PER_MINUTE: 60 * 1000,
  PER_HOUR: 60 * 60 * 1000,
  PER_DAY: 24 * 60 * 60 * 1000
} as const;

// Polling intervals
export const POLLING_INTERVALS = {
  PRIORITY_ORDERS: 5 * 60 * 1000 // 5 minutes
} as const;

// Date range presets (in days)
export const DATE_RANGES = {
  TODAY: 0,
  WEEK: 7,
  MONTH: 30,
  QUARTER: 90
} as const;

export const MILLISECONDS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

export const MILLISECONDS_PER_DAY = 
  MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;

export const NOTIFICATION_AUTO_HIDE_DURATION = 6000;
export const ERROR_NOTIFICATION_DURATION = 8000;
