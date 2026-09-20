/**
 * Date & Timezone Utilities for Indonesia Western Time (WIB / UTC+7 / Asia/Jakarta).
 * Ensures correct date calculations across serverless environments (Node.js/Vercel) running in UTC.
 */

const JAKARTA_TZ = 'Asia/Jakarta';

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Jakarta timezone.
 */
export function getTodayWIB(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns the current time formatted as HH:mm:ss in Asia/Jakarta timezone (24-hour format).
 */
export function getCurrentTimeWIB(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Returns the current time formatted as HH:mm in Asia/Jakarta timezone.
 */
export function getCurrentHourMinuteWIB(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Returns individual date components in Asia/Jakarta timezone.
 */
export function getWIBDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const weekdayStr = findPart('weekday');
  // Map weekday to 0 (Sunday) through 6 (Saturday)
  const days: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: parseInt(findPart('year'), 10),
    month: parseInt(findPart('month'), 10),
    day: parseInt(findPart('day'), 10),
    hour: parseInt(findPart('hour'), 10),
    minute: parseInt(findPart('minute'), 10),
    second: parseInt(findPart('second'), 10),
    dayOfWeek: days[weekdayStr] ?? date.getDay(),
  };
}

/**
 * Formats a Date or ISO string for Indonesian locale display.
 */
export function formatDateWIB(
  dateInput: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    ...options,
  }).format(d);
}
