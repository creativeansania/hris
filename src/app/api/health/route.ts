import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const checks: {
    database: { status: 'ok' | 'error'; latencyMs: number; message?: string };
    odoo: { status: 'ok' | 'degraded' | 'disabled'; latencyMs: number; serverVersion?: string; message?: string };
    outbox: { status: 'ok' | 'warning'; pendingCount: number; failedCount: number };
    system: { uptimeSeconds: number; memoryRssMb: number; nodeVersion: string };
  } = {
    database: { status: 'ok', latencyMs: 0 },
    odoo: { status: 'disabled', latencyMs: 0 },
    outbox: { status: 'ok', pendingCount: 0, failedCount: 0 },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      nodeVersion: process.version,
    },
  };

  let isHealthy = true;

  // 1. Check Supabase Database
  try {
    const dbStart = Date.now();
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('employees')
      .select('id', { count: 'exact', head: true });

    checks.database.latencyMs = Date.now() - dbStart;
    if (error) {
      checks.database.status = 'error';
      checks.database.message = error.message;
      isHealthy = false;
    }
  } catch (err: any) {
    checks.database.status = 'error';
    checks.database.latencyMs = Date.now() - startTime;
    checks.database.message = err?.message || 'Database connection failure';
    isHealthy = false;
  }

  // 2. Check Live Odoo ERP Connectivity
  const odooUrl = process.env.ODOO_URL;
  if (odooUrl) {
    try {
      const odooStart = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${odooUrl.replace(/\/$/, '')}/web/webclient/version_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      checks.odoo.latencyMs = Date.now() - odooStart;

      if (res.ok) {
        const json = await res.json();
        checks.odoo.status = 'ok';
        checks.odoo.serverVersion = json?.result?.server_version || 'Odoo 19.0';
      } else {
        checks.odoo.status = 'degraded';
        checks.odoo.message = `HTTP status ${res.status}`;
      }
    } catch (err: any) {
      checks.odoo.status = 'degraded';
      checks.odoo.message = err?.message || 'Odoo connection timed out';
    }
  }

  // 3. Check Outbox Queue
  try {
    const admin = createAdminClient();
    const { count: pendingCount } = await admin
      .from('odoo_sync_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: failedCount } = await admin
      .from('odoo_sync_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    checks.outbox.pendingCount = pendingCount || 0;
    checks.outbox.failedCount = failedCount || 0;
    if ((failedCount || 0) > 10) {
      checks.outbox.status = 'warning';
    }
  } catch {
    // If table doesn't exist or error, keep ok
  }

  const totalDuration = Date.now() - startTime;
  const overallStatus = isHealthy ? (checks.odoo.status === 'degraded' ? 'degraded' : 'healthy') : 'unhealthy';

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTimeMs: totalDuration,
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}

// POST endpoint for client error beacon ingestion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body?.error) {
      await logAuditEvent({
        action: 'client_error',
        entityType: 'error_log',
        metadata: body.error,
      });
      return NextResponse.json({ success: true, message: 'Error logged' });
    }
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
