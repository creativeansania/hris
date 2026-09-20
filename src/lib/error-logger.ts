import { logAuditEvent } from '@/lib/audit';

export interface ErrorLogDetails {
  message: string;
  stack?: string;
  source: 'client' | 'server' | 'api' | 'background';
  component?: string;
  endpoint?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Production-ready centralized error tracking utility for HRIS PWA.
 * Records unexpected exceptions, failed API calls, and client crashes.
 */
export async function trackError(details: ErrorLogDetails): Promise<void> {
  const isServer = typeof window === 'undefined';
  const timestamp = new Date().toISOString();

  const correlationId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logPayload = {
    correlationId,
    timestamp,
    level: 'ERROR',
    environment: process.env.NODE_ENV || 'development',
    source: details.source,
    component: details.component,
    endpoint: details.endpoint,
    message: details.message,
    userId: details.userId,
    stack: details.stack?.substring(0, 1000),
    metadata: details.metadata,
  };

  // Structured JSON log for production observability (Datadog, CloudWatch, Sentry)
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify(logPayload));
  } else {
    console.error(
      `[${timestamp}] [ERROR_TRACKER] [${details.source.toUpperCase()}] ${details.message}`,
      details.metadata ? details.metadata : ''
    );
  }

  // If running on server, record directly to audit_logs
  if (isServer) {
    try {
      await logAuditEvent({
        actorId: details.userId || null,
        action: 'system_error',
        entityType: 'error_log',
        metadata: {
          message: details.message,
          stack: details.stack?.substring(0, 1000),
          source: details.source,
          component: details.component,
          endpoint: details.endpoint,
          ...details.metadata,
        },
      });
    } catch {
      // Avoid recursive crash if logging fails
    }
  } else {
    // If client-side, send beacon/fetch to API logger if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        fetch('/api/health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: details.message,
              stack: details.stack?.substring(0, 1000),
              source: details.source,
              component: details.component,
              metadata: details.metadata,
            },
          }),
        }).catch(() => {});
      } catch {
        // Silently fail on network disconnect
      }
    }
  }
}
