'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { EmployeeRole } from '@/types/database';

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes_json: Record<string, any> | null;
  metadata_json: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    email: string;
    role: EmployeeRole;
  } | null;
}

export async function getAuditLogs(filters?: {
  entityType?: string;
  action?: string;
  limit?: number;
  userEmail?: string;
}): Promise<{
  data: AuditLogItem[];
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());

    let query = client
      .from('audit_logs')
      .select(`
        *,
        actor:employees!audit_logs_actor_id_fkey(
          id,
          full_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50);

    if (filters?.entityType && filters.entityType !== 'all') {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters?.action && filters.action !== 'all') {
      query = query.eq('action', filters.action);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as AuditLogItem[]) || [], error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat audit logs.',
    };
  }
}
