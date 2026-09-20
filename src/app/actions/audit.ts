'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { EmployeeRole } from '@/types/database';
import { requireAuthRole } from '@/lib/auth';

function getClient() {
  return getAdminClient();
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
  page?: number;
  pageSize?: number;
  userEmail?: string;
}): Promise<{
  data: AuditLogItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr', 'management'], filters?.userEmail);
    if (!authCheck.authorized) {
      return { data: [], error: authCheck.error };
    }

    const pageSize = filters?.pageSize || filters?.limit || 50;
    const page = filters?.page && filters.page > 0 ? filters.page : 1;

    let query = client
      .from('audit_logs')
      .select(
        `
        *,
        actor:employees!audit_logs_actor_id_fkey(
          id,
          full_name,
          email,
          role
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (filters?.entityType && filters.entityType !== 'all') {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters?.action && filters.action !== 'all') {
      query = query.eq('action', filters.action);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    const total = count ?? (data || []).length;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: (data as AuditLogItem[]) || [],
      total,
      page,
      pageSize,
      totalPages,
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat audit logs.',
    };
  }
}
