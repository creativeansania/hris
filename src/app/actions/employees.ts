'use server';

import { getActionClient } from '@/lib/supabase/action-client';
import { revalidatePath } from 'next/cache';
import {
  Employee,
  EmployeeRole,
  EmployeeStatus,
  GenderType,
  MaritalStatusType,
} from '@/types/database';
import { sanitizePostgrestSearch } from '@/lib/security';
import { requireAuthRole } from '@/lib/auth';
import { getTodayWIB } from '@/lib/date-utils';
import { createClient } from '@/lib/supabase/server';

export interface GetEmployeesFilter {
  search?: string;
  role?: EmployeeRole | 'all';
  divisionId?: string | 'all';
  status?: EmployeeStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface GetEmployeesResponse {
  data: Employee[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
}

export async function getEmployees(
  filter: GetEmployeesFilter = {}
): Promise<GetEmployeesResponse> {
  try {
    const client = await getActionClient();
    const shouldPaginate = typeof filter.page === 'number' && filter.page > 0;
    const page = shouldPaginate ? filter.page! : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 25;

    let query = client
      .from('employees')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filter.role && filter.role !== 'all') {
      query = query.eq('role', filter.role);
    }

    if (filter.divisionId && filter.divisionId !== 'all') {
      query = query.eq('division_id', filter.divisionId);
    }

    if (filter.status && filter.status !== 'all') {
      query = query.eq('status', filter.status);
    }

    if (filter.search && filter.search.trim()) {
      const s = sanitizePostgrestSearch(filter.search);
      if (s) {
        query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,nik.ilike.%${s}%`);
      }
    }

    if (shouldPaginate) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data: rawEmployees, count, error } = await query;

    if (error) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: error.message,
      };
    }

    const total = count ?? (rawEmployees || []).length;
    const totalPages = shouldPaginate ? Math.ceil(total / pageSize) : 1;

    // Fetch related divisions and spv data in bulk
    const divisionIds = Array.from(new Set((rawEmployees || []).map((e) => e.division_id).filter(Boolean)));
    const spvIds = Array.from(new Set((rawEmployees || []).map((e) => e.spv_id).filter(Boolean)));

    let divisionsMap: Record<string, { id: string; name: string }> = {};
    if (divisionIds.length > 0) {
      const { data: divs } = await client.from('divisions').select('id, name').in('id', divisionIds);
      if (divs) divs.forEach((d) => { divisionsMap[d.id] = d; });
    }

    let spvMap: Record<string, { id: string; full_name: string; email: string }> = {};
    if (spvIds.length > 0) {
      const { data: spvs } = await client.from('employees').select('id, full_name, email').in('id', spvIds);
      if (spvs) spvs.forEach((s) => { spvMap[s.id] = s; });
    }

    const merged = (rawEmployees || []).map((e) => ({
      ...e,
      division: e.division_id ? divisionsMap[e.division_id] || null : null,
      spv: e.spv_id ? spvMap[e.spv_id] || null : null,
    }));

    return {
      data: merged as Employee[],
      total,
      page,
      pageSize: shouldPaginate ? pageSize : total,
      totalPages,
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
      error: err instanceof Error ? err.message : 'Gagal mengambil data karyawan',
    };
  }
}

export async function getEmployeeById(id: string): Promise<{ data: Employee | null; error: string | null }> {
  try {
    const client = await getActionClient();
    const { data, error } = await client
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Employee, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Gagal mengambil detail karyawan' };
  }
}

export interface EmployeeFormData {
  full_name: string;
  email: string;
  phone_number?: string | null;
  nik?: string | null;
  npwp?: string | null;
  gender?: GenderType | null;
  place_of_birth?: string | null;
  birth_date?: string | null;
  religion?: string | null;
  marital_status?: MaritalStatusType | null;
  dependents_count?: number;
  address?: string | null;

  // Emergency contact
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;

  // Bank
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_account_name?: string | null;

  // Organization mapping
  role: EmployeeRole;
  division_id?: string | null;
  spv_id?: string | null;
  work_schedule_id?: string | null;
  fingerprint_ac_no?: string | null;
  join_date?: string | null;
  status?: EmployeeStatus;
}

export async function createEmployee(formData: EmployeeFormData) {
  try {
    const client = await getActionClient();

    // Check duplicate email
    const { data: existing } = await client
      .from('employees')
      .select('id')
      .ilike('email', formData.email.trim())
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Email ini sudah terdaftar untuk karyawan lain.' };
    }

    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const insertPayload = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone_number: formData.phone_number?.trim() || null,
      nik: formData.nik?.trim() || null,
      npwp: formData.npwp?.trim() || null,
      gender: formData.gender || null,
      place_of_birth: formData.place_of_birth?.trim() || null,
      birth_date: formData.birth_date || null,
      religion: formData.religion?.trim() || null,
      marital_status: formData.marital_status || null,
      dependents_count: formData.dependents_count || 0,
      address: formData.address?.trim() || null,

      emergency_contact_name: formData.emergency_contact_name?.trim() || null,
      emergency_contact_phone: formData.emergency_contact_phone?.trim() || null,

      bank_name: formData.bank_name?.trim() || null,
      bank_account_no: formData.bank_account_no?.trim() || null,
      bank_account_name: formData.bank_account_name?.trim() || null,

      role: formData.role || 'staff',
      division_id: formData.division_id || null,
      spv_id: formData.spv_id || null,
      work_schedule_id: formData.work_schedule_id || null,
      fingerprint_ac_no: formData.fingerprint_ac_no?.trim() || null,
      join_date: formData.join_date || getTodayWIB(),
      status: 'pending_claim' as EmployeeStatus,
    };

    const { data: newEmp, error: insertError } = await client
      .from('employees')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError || !newEmp) {
      return { success: false, error: insertError?.message || 'Gagal menyimpan data karyawan' };
    }

    // Auto-create initial annual leave balance for the current year
    try {
      const currentYear = new Date().getFullYear();
      const { data: cutiType } = await client
        .from('request_types')
        .select('id')
        .eq('code', 'cuti_tahunan')
        .maybeSingle();

      if (cutiType) {
        await client.from('leave_balances').insert({
          employee_id: newEmp.id,
          year: currentYear,
          request_type_id: cutiType.id,
          quota: 12,
          used: 0,
          adjustment: 0,
          carry_over: 0,
        });
      }
    } catch (balErr) {
      console.warn('Auto-create leave balance warning:', balErr);
    }

    revalidatePath('/employees');
    return { success: true, error: null, id: newEmp.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem' };
  }
}

export async function updateEmployee(id: string, formData: EmployeeFormData) {
  try {
    const client = await getActionClient();

    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const updatePayload = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone_number: formData.phone_number?.trim() || null,
      nik: formData.nik?.trim() || null,
      npwp: formData.npwp?.trim() || null,
      gender: formData.gender || null,
      place_of_birth: formData.place_of_birth?.trim() || null,
      birth_date: formData.birth_date || null,
      religion: formData.religion?.trim() || null,
      marital_status: formData.marital_status || null,
      dependents_count: formData.dependents_count || 0,
      address: formData.address?.trim() || null,

      emergency_contact_name: formData.emergency_contact_name?.trim() || null,
      emergency_contact_phone: formData.emergency_contact_phone?.trim() || null,

      bank_name: formData.bank_name?.trim() || null,
      bank_account_no: formData.bank_account_no?.trim() || null,
      bank_account_name: formData.bank_account_name?.trim() || null,

      role: formData.role,
      division_id: formData.division_id || null,
      spv_id: formData.spv_id || null,
      work_schedule_id: formData.work_schedule_id || null,
      fingerprint_ac_no: formData.fingerprint_ac_no?.trim() || null,
      join_date: formData.join_date || null,
      status: formData.status || undefined,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await client
      .from('employees')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/employees');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memperbarui data karyawan' };
  }
}

export async function setEmployeeStatus(id: string, status: EmployeeStatus) {
  try {
    const client = await getActionClient();

    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const { error } = await client
      .from('employees')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/employees');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal mengubah status' };
  }
}

/**
 * Resolves the authenticated user and their employee profile using the server action client.
 * Bypasses RLS stack depth issues and directly returns the resolved role, employee id, and name.
 */
export async function getCurrentUserEmployee(): Promise<{
  user: { id: string; email?: string } | null;
  employee: Employee | null;
}> {
  try {
    const serverClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await serverClient.auth.getUser();

    if (userError || !user) {
      return { user: null, employee: null };
    }

    const client = await getActionClient();
    const { data: emp, error: empError } = await client
      .from('employees')
      .select('id, full_name, role, email, status, photo_url, division_id')
      .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
      .maybeSingle();

    if (empError) {
      console.error('[getCurrentUserEmployee] Error querying employee:', empError);
      return { user: { id: user.id, email: user.email }, employee: null };
    }

    return {
      user: { id: user.id, email: user.email },
      employee: (emp as Employee) || null,
    };
  } catch (err) {
    console.error('[getCurrentUserEmployee] Unexpected error:', err);
    return { user: null, employee: null };
  }
}
