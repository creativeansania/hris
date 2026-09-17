import { createClient } from '@/lib/supabase/server';
import { Employee, EmployeeRole } from '@/types/database';

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

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (empError || !employee) return null;
  return employee as Employee;
}

export async function hasRole(requiredRoles: EmployeeRole[]): Promise<boolean> {
  const employee = await getCurrentEmployee();
  if (!employee) return false;
  return requiredRoles.includes(employee.role);
}
