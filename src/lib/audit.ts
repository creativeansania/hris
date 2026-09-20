import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditEventPayload {
  actorId?: string | null;
  action: string; // e.g. 'clock_in', 'create_request', 'approve_request', 'generate_payroll', 'finalize_payroll'
  entityType: string; // e.g. 'attendance', 'requests', 'payroll_periods', 'employees', 'odoo_sync'
  entityId?: string | null;
  changes?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
}

/**
 * Records an immutable audit event to the audit_logs table.
 * Always executed with admin credentials to ensure audit trail integrity.
 */
export async function logAuditEvent(payload: AuditEventPayload): Promise<{
  success: boolean;
  logId?: string;
  error?: string;
}> {
  try {
    const client = createAdminClient();

    const { data, error } = await client
      .from('audit_logs')
      .insert({
        actor_id: payload.actorId || null,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId || null,
        changes_json: payload.changes || null,
        metadata_json: payload.metadata || null,
        ip_address: payload.ipAddress || null,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to insert audit log entry:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, logId: data.id };
  } catch (err: unknown) {
    console.warn('Exception during audit log write:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown audit log error',
    };
  }
}
