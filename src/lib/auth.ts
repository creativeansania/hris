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

// In-memory cache for authenticated employees (30s TTL) to prevent duplicate lookups across parallel server actions
interface CachedAuthEmployee {
  employee: Employee;
  expiresAt: number;
}
const authEmployeeCache = new Map<string, CachedAuthEmployee>();

export function clearAuthEmployeeCache(emailOrId?: string) {
  if (emailOrId) {
    authEmployeeCache.delete(emailOrId.toLowerCase());
  } else {
    authEmployeeCache.clear();
  }
}

/**
 * Resolves the active employee record from Supabase Auth or email.
 * Fallback to first employee is strictly restricted to development mode (process.env.NODE_ENV === 'development').
 */
export async function getAuthenticatedEmployee(
  client: SupabaseClient,
  employeeEmail?: string
): Promise<Employee | null> {
  const normalizedEmail = employeeEmail ? employeeEmail.trim().toLowerCase() : null;

  // 1. Check in-memory cache
  if (normalizedEmail) {
    const cached = authEmployeeCache.get(normalizedEmail);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.employee;
    }
  }

  let emp: Employee | null = null;

  if (normalizedEmail) {
    // Try exact lower-case match first (hits b-tree index)
    const { data } = await client
      .from('employees')
      .select('id, full_name, email, role, spv_id, division_id, join_date, photo_url, work_schedule_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (data) {
      emp = data as Employee;
    } else {
      // Fallback to case-insensitive match
      const { data: ilikeData } = await client
        .from('employees')
        .select('id, full_name, email, role, spv_id, division_id, join_date, photo_url, work_schedule_id')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      if (ilikeData) emp = ilikeData as Employee;
    }
  }

  if (!emp) {
    const user = await getCurrentUser();
    if (user?.email) {
      const userCleanEmail = user.email.trim().toLowerCase();
      const userCached = authEmployeeCache.get(userCleanEmail);
      if (userCached && Date.now() < userCached.expiresAt) {
        return userCached.employee;
      }

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
          .eq('email', userCleanEmail)
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

  // Cache resolved employee for 30 seconds
  if (emp) {
    const cachedEntry: CachedAuthEmployee = { employee: emp, expiresAt: Date.now() + 30_000 };
    if (emp.email) {
      authEmployeeCache.set(emp.email.toLowerCase(), cachedEntry);
    }
    if (normalizedEmail) {
      authEmployeeCache.set(normalizedEmail, cachedEntry);
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


