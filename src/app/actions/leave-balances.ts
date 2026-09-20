'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { LeaveBalance } from '@/types/database';
import { requireAuthRole } from '@/lib/auth';

function getClient() {
  return getAdminClient();
}

/**
 * Retrieves all employee leave balances for a specific year, auto-generating missing ones.
 */
export async function getAllLeaveBalances(filters?: {
  year?: number;
  divisionId?: string;
}): Promise<{ data: LeaveBalance[]; error: string | null }> {
  try {
    const client = getClient() || (await createClient());
    const targetYear = filters?.year || new Date().getFullYear();

    // 1. Get cuti_tahunan request_type
    const { data: cutiType } = await client
      .from('request_types')
      .select('id, code, name')
      .eq('code', 'cuti_tahunan')
      .maybeSingle();

    if (!cutiType) {
      return { data: [], error: 'Jenis pengajuan cuti tahunan belum terdaftar.' };
    }

    // 2. Query all active employees
    let empQuery = client
      .from('employees')
      .select(`
        id,
        full_name,
        email,
        role,
        join_date,
        photo_url,
        division:divisions(id, name)
      `)
      .order('full_name', { ascending: true });

    if (filters?.divisionId && filters.divisionId !== 'all') {
      empQuery = empQuery.eq('division_id', filters.divisionId);
    }

    const { data: employees, error: empErr } = await empQuery;

    if (empErr) {
      return { data: [], error: empErr.message };
    }

    const empList = employees || [];

    // 3. Query existing leave_balances for targetYear
    const { data: existingBalances } = await client
      .from('leave_balances')
      .select('*')
      .eq('year', targetYear)
      .eq('request_type_id', cutiType.id);

    const balanceMap = new Map<string, any>();
    (existingBalances || []).forEach((b: any) => {
      balanceMap.set(b.employee_id, b);
    });

    const results: LeaveBalance[] = [];

    // 4. Map & auto-initialize for each employee if not found
    for (const emp of empList) {
      let b = balanceMap.get(emp.id);

      if (!b) {
        let initialQuota = 12;
        if (emp.join_date) {
          const join = new Date(emp.join_date);
          if (join.getFullYear() === targetYear) {
            const joinMonth = join.getMonth() + 1;
            initialQuota = Math.max(1, 12 - joinMonth + 1);
          }
        }

        const { data: newB, error: insErr } = await client
          .from('leave_balances')
          .insert({
            employee_id: emp.id,
            year: targetYear,
            request_type_id: cutiType.id,
            quota: initialQuota,
            used: 0,
            adjustment: 0,
            carry_over: 0,
          })
          .select('*')
          .single();

        if (!insErr && newB) {
          b = newB;
        }
      }

      if (b) {
        const quota = Number(b.quota) || 0;
        const used = Number(b.used) || 0;
        const adjustment = Number(b.adjustment) || 0;
        const carryOver = Number(b.carry_over) || 0;
        const remaining = Math.max(0, quota + carryOver + adjustment - used);

        results.push({
          ...b,
          quota,
          used,
          adjustment,
          carry_over: carryOver,
          remaining,
          employee: emp,
          request_type: cutiType,
        });
      }
    }

    return { data: results, error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat rekap saldo cuti.',
    };
  }
}

/**
 * Allows HR/Admin to adjust employee leave balance (+ or - days) with a mandatory audit reason.
 */
export async function adjustEmployeeLeaveBalance(payload: {
  employeeId: string;
  year: number;
  adjustmentDays: number;
  reason: string;
  adjustedByEmail?: string;
}) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr'], payload.adjustedByEmail);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    if (!payload.reason || payload.reason.trim().length < 3) {
      return { success: false, error: 'Alasan penyesuaian kuota wajib diisi (minimal 3 karakter).' };
    }

    if (!payload.adjustmentDays || payload.adjustmentDays === 0) {
      return { success: false, error: 'Jumlah hari penyesuaian tidak boleh 0.' };
    }

    const { data: cutiType } = await client
      .from('request_types')
      .select('id')
      .eq('code', 'cuti_tahunan')
      .maybeSingle();

    if (!cutiType) {
      return { success: false, error: 'Tipe cuti tahunan tidak ditemukan.' };
    }

    // Lookup current balance
    const { data: curBal } = await client
      .from('leave_balances')
      .select('*')
      .eq('employee_id', payload.employeeId)
      .eq('year', payload.year)
      .eq('request_type_id', cutiType.id)
      .maybeSingle();

    if (curBal) {
      const newAdjustment = Number(curBal.adjustment || 0) + Number(payload.adjustmentDays);
      const { error: updErr } = await client
        .from('leave_balances')
        .update({
          adjustment: newAdjustment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', curBal.id);

      if (updErr) return { success: false, error: updErr.message };
    } else {
      await client.from('leave_balances').insert({
        employee_id: payload.employeeId,
        year: payload.year,
        request_type_id: cutiType.id,
        quota: 12,
        used: 0,
        adjustment: Number(payload.adjustmentDays),
        carry_over: 0,
      });
    }

    revalidatePath('/requests');
    revalidatePath('/approvals');

    return {
      success: true,
      message: `Penyesuaian kuota cuti sebesar ${payload.adjustmentDays > 0 ? '+' : ''}${payload.adjustmentDays} hari berhasil disimpan.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menyesuaikan saldo cuti.',
    };
  }
}
