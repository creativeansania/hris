/**
 * Sliding Window In-Memory Rate Limiter
 * Provides DDoS, spam, and brute-force mitigation for sensitive API endpoints and server actions.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Global cache store with automatic pruning
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Checks if an action by a key exceeds the specified rate limit.
 *
 * @param key Unique key representing the actor (e.g. 'clock_in:emp_123' or 'login:192.168.1.1')
 * @param limit Maximum allowed requests within the time window
 * @param windowMs Duration of the sliding window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60000
): {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  message?: string;
} {
  maybePruneRateLimitStore();
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out timestamps outside the current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const waitSeconds = Math.ceil((resetTime - now) / 1000);

    return {
      success: false,
      limit,
      remaining: 0,
      resetTime,
      message: `Terlalu banyak permintaan. Harap tunggu ${waitSeconds} detik sebelum mencoba kembali.`,
    };
  }

  // Add current timestamp
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    success: true,
    limit,
    remaining,
    resetTime: now + windowMs,
  };
}

/**
 * Specialized Rate Limit Helpers for Sensitive HRIS Operations
 */

export function checkClockInRateLimit(actorKey: string) {
  return checkRateLimit(`clock_in:${actorKey}`, 10, 60000); // 10 requests / minute
}

export function checkFileUploadRateLimit(actorKey: string) {
  return checkRateLimit(`upload:${actorKey}`, 15, 60000); // 15 uploads / minute
}

export function checkOdooSyncRateLimit(actorKey: string) {
  return checkRateLimit(`odoo_sync:${actorKey}`, 5, 300000); // 5 sync runs / 5 minutes
}

export function checkAuthRateLimit(ipOrKey: string) {
  return checkRateLimit(`auth:${ipOrKey}`, 5, 60000); // 5 auth attempts / minute
}

/**
 * Opportunistically purge stale entries to prevent memory leak in serverless runtimes.
 */
function pruneStaleEntries(now: number) {
  const maxRetention = 600000; // 10 minutes
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > now - maxRetention);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

// Trigger opportunistic pruning when store exceeds threshold
let operationCount = 0;
export function maybePruneRateLimitStore() {
  operationCount++;
  if (operationCount > 50 || rateLimitStore.size > 500) {
    operationCount = 0;
    pruneStaleEntries(Date.now());
  }
}

// Optional interval with unref() for persistent Node processes without blocking shutdown
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    pruneStaleEntries(Date.now());
  }, 120000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

