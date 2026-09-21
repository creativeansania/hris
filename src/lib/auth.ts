import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { Employee, EmployeeRole } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder')
  );
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getCurrentEmployee(): Promise<Employee | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const admin = getAdminClient();
  const client = admin || supabase;
  const { data: employee, error: empError } = await client
    .from('employees')
    .select('*')
    .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
    .maybeSingle();

  if (empError || !employee) return null;
  return employee as Employee;
}

export async function hasRole(requiredRoles: EmployeeRole[]): Promise<boolean> {
  const employee = await getCurrentEmployee();
  if (!employee) return false;
  return requiredRoles.includes(employee.role);
}

/**
 * Resolves the active employee record from Supabase Auth or email.
 * Fallback to first employee is strictly restricted to development mode (process.env.NODE_ENV === 'development').
 */
export async function getAuthenticatedEmployee(
  client: SupabaseClient,
  employeeEmail?: string
): Promise<Employee | null> {
  let emp: Employee | null = null;

  if (employeeEmail) {
    const { data } = await client
      .from('employees')
      .select('id, full_name, email, role, spv_id, division_id, join_date, photo_url, work_schedule_id')
      .ilike('email', employeeEmail.trim())
      .maybeSingle();
    if (data) emp = data as Employee;
  }

  if (!emp) {
    const user = await getCurrentUser();
    if (user?.email) {
      const { data } = await client
        .from('employees')
        .select('id, full_name, email, role, spv_id, division_id, join_date, photo_url, work_schedule_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) {
        emp = data as Employee;
      } else {
        const { data: byEmail } = await client
          .from('employees')
          .select('id, full_name, email, role, spv_id, division_id, join_date, photo_url, work_schedule_id')
          .ilike('email', user.email)
          .maybeSingle();
        if (byEmail) emp = byEmail as Employee;
      }
    }
  }

  // Fallback to active admin/management employee strictly ONLY in local development
  if (!emp && process.env.NODE_ENV === 'development') {
    const { data: adminFallback } = await client
      .from('employees')
      .select('id, full_name, email, role, spv_id, division_id, join_date, photo_url, work_schedule_id')
      .in('role', ['admin', 'management', 'hr'])
      .limit(1)
      .maybeSingle();

    if (adminFallback) {
      emp = adminFallback as Employee;
    } else {
      const { data: fallback } = await client
        .from('employees')
        .select('id, full_name, email, role, spv_id, division_id, join_date, photo_url, work_schedule_id')
        .limit(1)
        .maybeSingle();
      if (fallback) emp = fallback as Employee;
    }
  }

  return emp;
}

/**
 * Verifies that the caller is authenticated and has one of the allowed roles.
 */
export async function requireAuthRole(
  client: SupabaseClient,
  allowedRoles: EmployeeRole[],
  actorEmail?: string
): Promise<{ authorized: true; employee: Employee } | { authorized: false; error: string }> {
  const employee = await getAuthenticatedEmployee(client, actorEmail);

  if (!employee) {
    return {
      authorized: false,
      error: 'Tidak terotentikasi. Silakan login terlebih dahulu.',
    };
  }

  if (!allowedRoles.includes(employee.role)) {
    return {
      authorized: false,
      error: `Akses ditolak. Peran '${employee.role}' tidak memiliki izin untuk tindakan ini.`,
    };
  }

  return { authorized: true, employee };
}

