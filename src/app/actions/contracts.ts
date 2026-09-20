'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  EmployeeContract,
  EmployeePosition,
  Employee,
  ContractType,
} from '@/types/database';
import { getEmployeeLeaveBalance } from '@/app/actions/requests';
import { getAuthenticatedEmployee, requireAuthRole } from '@/lib/auth';

function getClient() {
  return getAdminClient();
}

/**
 * Calculates days remaining and urgency status for a contract.
 */
function enrichContractWithUrgency(contract: any): EmployeeContract {
  let daysRemaining: number | null = null;
  let statusUrgency: 'critical' | 'warning' | 'safe' | 'permanent' | 'expired' = 'safe';

  if (contract.contract_type === 'pkwtt' || !contract.end_date) {
    statusUrgency = 'permanent';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(contract.end_date);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      statusUrgency = 'expired';
    } else if (daysRemaining <= 7) {
      statusUrgency = 'critical'; // H-7
    } else if (daysRemaining <= 30) {
      statusUrgency = 'warning'; // H-30
    } else {
      statusUrgency = 'safe';
    }
  }

  return {
    ...contract,
    base_salary: Number(contract.base_salary) || 0,
    days_remaining: daysRemaining,
    status_urgency: statusUrgency,
  };
}

/**
 * Retrieves the complete contract history for an employee.
 */
export async function getEmployeeContracts(
  employeeId: string
): Promise<{ data: EmployeeContract[]; error: string | null }> {
  try {
    const client = getClient() || (await createClient());

    const { data, error } = await client
      .from('employee_contracts')
      .select(`
        *,
        created_by_user:employees!employee_contracts_created_by_fkey(
          id,
          full_name
        )
      `)
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });

    if (error) return { data: [], error: error.message };

    const enriched = (data || []).map(enrichContractWithUrgency);
    return { data: enriched, error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat riwayat kontrak.',
    };
  }
}

/**
 * Adds a new employment contract without overwriting past history.
 */
export async function addEmployeeContract(payload: {
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string | null;
  baseSalary: number;
  notes?: string;
  creatorEmail?: string;
}) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr'], payload.creatorEmail);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const creator = authCheck.employee;

    if (!payload.employeeId) {
      return { success: false, error: 'ID Karyawan wajib diisi.' };
    }

    if (!payload.startDate) {
      return { success: false, error: 'Tanggal mulai kontrak wajib diisi.' };
    }

    if (payload.contractType === 'pkwt') {
      if (!payload.endDate) {
        return { success: false, error: 'Kontrak PKWT wajib memiliki tanggal berakhir.' };
      }
      if (payload.endDate <= payload.startDate) {
        return {
          success: false,
          error: 'Tanggal berakhir kontrak harus setelah tanggal mulai.',
        };
      }
    }

    if (!payload.baseSalary || payload.baseSalary <= 0) {
      return { success: false, error: 'Gaji pokok (base salary) harus lebih besar dari 0.' };
    }

    // Insert new contract record
    const { data: newContract, error: insertError } = await client
      .from('employee_contracts')
      .insert({
        employee_id: payload.employeeId,
        contract_type: payload.contractType,
        start_date: payload.startDate,
        end_date: payload.contractType === 'pkwtt' ? null : payload.endDate || null,
        base_salary: payload.baseSalary,
        notes: payload.notes?.trim() || null,
        created_by: creator?.id || null,
      })
      .select('*')
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Update employee join_date if currently null
    const { data: emp } = await client
      .from('employees')
      .select('join_date')
      .eq('id', payload.employeeId)
      .single();

    if (!emp?.join_date) {
      await client
        .from('employees')
        .update({ join_date: payload.startDate })
        .eq('id', payload.employeeId);
    }

    revalidatePath('/employees');
    revalidatePath(`/employees/${payload.employeeId}`);

    return {
      success: true,
      contractId: newContract.id,
      message: 'Kontrak kerja baru berhasil dicatat dalam histori.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menambahkan kontrak kerja.',
    };
  }
}

/**
 * Retrieves PKWT contracts expiring within the specified threshold (default 30 days) for HR reminders.
 */
export async function getExpiringContracts(thresholdDays: number = 30): Promise<{
  data: Array<{
    contract: EmployeeContract;
    employee: Employee;
  }>;
  criticalCount: number; // H-7
  warningCount: number;  // H-30
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr', 'management']);
    if (!authCheck.authorized) {
      return { data: [], criticalCount: 0, warningCount: 0, error: authCheck.error };
    }

    const { data, error } = await client
      .from('employee_contracts')
      .select(`
        *,
        employee:employees!employee_contracts_employee_id_fkey(
          id,
          full_name,
          email,
          role,
          photo_url,
          status,
          division:divisions!employees_division_id_fkey(name)
        )
      `)
      .eq('contract_type', 'pkwt')
      .not('end_date', 'is', null)
      .order('end_date', { ascending: true });

    if (error) {
      return { data: [], criticalCount: 0, warningCount: 0, error: error.message };
    }

    // Group by employee to find the latest active contract for each active employee
    const latestContractsMap = new Map<string, any>();
    for (const item of data || []) {
      if (item.employee && item.employee.status === 'active') {
        const existing = latestContractsMap.get(item.employee.id);
        if (!existing || new Date(item.start_date) > new Date(existing.start_date)) {
          latestContractsMap.set(item.employee.id, item);
        }
      }
    }

    const results: Array<{ contract: EmployeeContract; employee: Employee }> = [];
    let criticalCount = 0;
    let warningCount = 0;

    for (const item of latestContractsMap.values()) {
      const enriched = enrichContractWithUrgency(item);

      if (
        typeof enriched.days_remaining === 'number' &&
        enriched.days_remaining <= thresholdDays &&
        enriched.days_remaining >= -30 // within last 30 days expired or upcoming
      ) {
        if (enriched.status_urgency === 'critical') criticalCount++;
        else if (enriched.status_urgency === 'warning') warningCount++;

        results.push({
          contract: enriched,
          employee: item.employee as Employee,
        });
      }
    }

    // Sort most urgent first
    results.sort((a, b) => (a.contract.days_remaining ?? 999) - (b.contract.days_remaining ?? 999));

    return { data: results, criticalCount, warningCount, error: null };
  } catch (err: unknown) {
    return {
      data: [],
      criticalCount: 0,
      warningCount: 0,
      error: err instanceof Error ? err.message : 'Gagal memuat data reminder kontrak.',
    };
  }
}

/**
 * Retrieves the position and division mutation history for an employee.
 */
export async function getEmployeePositionHistory(
  employeeId: string
): Promise<{ data: EmployeePosition[]; error: string | null }> {
  try {
    const client = getClient() || (await createClient());

    const { data, error } = await client
      .from('employee_positions')
      .select(`
        *,
        division:divisions(id, name),
        created_by_user:employees!employee_positions_created_by_fkey(
          id,
          full_name
        )
      `)
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });

    if (error) return { data: [], error: error.message };

    return { data: (data as EmployeePosition[]) || [], error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat riwayat mutasi jabatan.',
    };
  }
}

/**
 * Records a new position / division mutation, closing previous tenure and syncing employee division.
 */
export async function addEmployeePositionMutation(payload: {
  employeeId: string;
  divisionId: string;
  positionTitle: string;
  startDate: string;
  notes?: string;
  creatorEmail?: string;
}) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(
      client,
      ['admin', 'hr', 'management'],
      payload.creatorEmail
    );
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const creator = authCheck.employee;

    if (!payload.employeeId || !payload.divisionId || !payload.positionTitle || !payload.startDate) {
      return { success: false, error: 'Semua field mutasi jabatan wajib diisi.' };
    }

    // 1. Close previous active position (set end_date to startDate)
    await client
      .from('employee_positions')
      .update({ end_date: payload.startDate })
      .eq('employee_id', payload.employeeId)
      .is('end_date', null);

    // 2. Insert new position
    const { data: newPos, error: posErr } = await client
      .from('employee_positions')
      .insert({
        employee_id: payload.employeeId,
        division_id: payload.divisionId,
        position_title: payload.positionTitle.trim(),
        start_date: payload.startDate,
        end_date: null,
        created_by: creator?.id || null,
      })
      .select('*')
      .single();

    if (posErr) return { success: false, error: posErr.message };

    // 3. Update employee current division_id
    await client
      .from('employees')
      .update({
        division_id: payload.divisionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.employeeId);

    revalidatePath('/employees');
    revalidatePath(`/employees/${payload.employeeId}`);

    return {
      success: true,
      positionId: newPos.id,
      message: 'Mutasi jabatan dan divisi berhasil dicatat dalam riwayat karier.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal mencatat mutasi jabatan.',
    };
  }
}

/**
 * Retrieves the comprehensive employee profile including personal identity, contracts,
 * position history, leave balance, and attendance summary.
 */
export async function getEmployeeFullProfile(employeeId: string): Promise<{
  employee: Employee | null;
  contracts: EmployeeContract[];
  positions: EmployeePosition[];
  leaveBalance: any | null;
  attendanceSummary: {
    presentDays: number;
    lateMinutes: number;
    excusedLateCount: number;
  };
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());

    // 1. Fetch Employee with Division & Work Schedule
    const { data: emp, error: empErr } = await client
      .from('employees')
      .select(`
        *,
        division:divisions!employees_division_id_fkey(id, name),
        work_schedule:work_schedule_groups!fk_employees_work_schedule(id, name)
      `)
      .eq('id', employeeId)
      .maybeSingle();

    if (empErr || !emp) {
      return {
        employee: null,
        contracts: [],
        positions: [],
        leaveBalance: null,
        attendanceSummary: { presentDays: 0, lateMinutes: 0, excusedLateCount: 0 },
        error: empErr?.message || 'Karyawan tidak ditemukan.',
      };
    }

    // SPV is a loose reference or self-reference without explicit FK name in PostgREST
    if (emp.spv_id) {
      const { data: spvData } = await client
        .from('employees')
        .select('id, full_name, email, role')
        .eq('id', emp.spv_id)
        .maybeSingle();
      emp.spv = spvData || null;
    } else {
      emp.spv = null;
    }

    // 2. Parallel fetch contracts, positions, leave balance, attendance
    const [contractsRes, positionsRes, leaveBalRes, attRes] = await Promise.all([
      getEmployeeContracts(employeeId),
      getEmployeePositionHistory(employeeId),
      getEmployeeLeaveBalance(employeeId),
      client
        .from('attendance')
        .select('attendance_date, clock_in, late_minutes, is_absent, linked_izin_telat_request_id')
        .eq('employee_id', employeeId)
        .gte(
          'attendance_date',
          new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split('T')[0]
        ),
    ]);

    const attList = attRes.data || [];
    const presentDays = attList.filter(
      (a: any) => !a.is_absent && a.clock_in != null
    ).length;
    const lateMinutes = attList.reduce(
      (acc: number, curr: any) => acc + (Number(curr.late_minutes) || 0),
      0
    );
    const excusedLateCount = attList.filter(
      (a: any) => a.linked_izin_telat_request_id !== null
    ).length;

    return {
      employee: emp as Employee,
      contracts: contractsRes.data || [],
      positions: positionsRes.data || [],
      leaveBalance: leaveBalRes.data || null,
      attendanceSummary: { presentDays, lateMinutes, excusedLateCount },
      error: null,
    };
  } catch (err: unknown) {
    return {
      employee: null,
      contracts: [],
      positions: [],
      leaveBalance: null,
      attendanceSummary: { presentDays: 0, lateMinutes: 0, excusedLateCount: 0 },
      error: err instanceof Error ? err.message : 'Gagal memuat profil lengkap karyawan.',
    };
  }
}
