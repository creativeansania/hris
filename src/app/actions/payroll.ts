'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  PayrollPeriod,
  PayrollRun,
  PayrollRule,
  PayrollPeriodStatus,
  EmployeeRole,
} from '@/types/database';

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function getAuthenticatedEmployee(client: any, userEmail?: string) {
  let emp = null;

  if (userEmail) {
    const { data } = await client
      .from('employees')
      .select('id, full_name, email, role, division_id')
      .ilike('email', userEmail.trim())
      .maybeSingle();
    emp = data;
  }

  if (!emp) {
    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (user?.email) {
      const { data } = await client
        .from('employees')
        .select('id, full_name, email, role, division_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) {
        emp = data;
      } else {
        const { data: byEmail } = await client
          .from('employees')
          .select('id, full_name, email, role, division_id')
          .ilike('email', user.email)
          .maybeSingle();
        emp = byEmail;
      }
    }
  }

  if (!emp) {
    const { data: fallback } = await client
      .from('employees')
      .select('id, full_name, email, role, division_id')
      .in('role', ['admin', 'management', 'hr'])
      .limit(1)
      .maybeSingle();
    emp = fallback;
  }

  return emp;
}

/**
 * Seeds standard Indonesian payroll rules if not present.
 */
export async function seedDefaultPayrollRules() {
  const client = getClient() || (await createClient());
  const { data: existing } = await client.from('payroll_rules').select('id').limit(1);

  if (existing && existing.length > 0) return;

  const defaultRules = [
    {
      rule_key: 'bpjs_kesehatan_rate',
      rule_value: '1',
      value_type: 'percentage',
      description: 'Iuran BPJS Kesehatan potongan karyawan (standar 1% dari gaji pokok)',
      is_active: true,
    },
    {
      rule_key: 'bpjs_kesehatan_max_cap',
      rule_value: '12000000',
      value_type: 'number',
      description: 'Plafon upah maksimal batas perhitungan BPJS Kesehatan (Rp 12.000.000)',
      is_active: true,
    },
    {
      rule_key: 'bpjs_tk_jht_rate',
      rule_value: '2',
      value_type: 'percentage',
      description: 'BPJS Ketenagakerjaan JHT potongan karyawan (standar 2% dari gaji pokok)',
      is_active: true,
    },
    {
      rule_key: 'bpjs_tk_jp_rate',
      rule_value: '1',
      value_type: 'percentage',
      description: 'BPJS Ketenagakerjaan Jaminan Pensiun (JP) karyawan (standar 1%)',
      is_active: true,
    },
    {
      rule_key: 'bpjs_tk_jp_max_cap',
      rule_value: '10042300',
      value_type: 'number',
      description: 'Plafon batas maksimal upah dasar Jaminan Pensiun (Rp 10.042.300)',
      is_active: true,
    },
    {
      rule_key: 'overtime_hourly_multiplier',
      rule_value: '1.5',
      value_type: 'number',
      description: 'Faktor pengali upah lembur per jam sesuai Depnaker (1/173 × Gaji Pokok × 1.5)',
      is_active: true,
    },
    {
      rule_key: 'late_deduction_rate_per_minute',
      rule_value: '1000',
      value_type: 'number',
      description: 'Tarif pemotongan keterlambatan tanpa izin sah per menit (Rp 1.000 / menit)',
      is_active: true,
    },
    {
      rule_key: 'absence_deduction_divisor',
      rule_value: '22',
      value_type: 'number',
      description: 'Pembagi hari kerja untuk potongan alpa tanpa keterangan (1/22 Gaji Pokok)',
      is_active: true,
    },
    {
      rule_key: 'fixed_transport_allowance',
      rule_value: '500000',
      value_type: 'number',
      description: 'Tunjangan tetap operasional & transport bulanan standar (Rp 500.000)',
      is_active: true,
    },
  ];

  await client.from('payroll_rules').insert(defaultRules);
}

/**
 * Retrieves all payroll rules.
 */
export async function getPayrollRules(): Promise<{
  data: PayrollRule[];
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    await seedDefaultPayrollRules();

    const { data, error } = await client
      .from('payroll_rules')
      .select('*')
      .order('rule_key', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data as PayrollRule[]) || [], error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat aturan payroll.',
    };
  }
}

/**
 * Updates a specific payroll rule value.
 */
export async function updatePayrollRule(
  ruleKey: string,
  ruleValue: string,
  userEmail?: string
) {
  try {
    const client = getClient() || (await createClient());
    const currentUser = await getAuthenticatedEmployee(client, userEmail);

    const { error } = await client
      .from('payroll_rules')
      .update({
        rule_value: ruleValue.trim(),
        updated_by: currentUser?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('rule_key', ruleKey);

    if (error) return { success: false, error: error.message };

    revalidatePath('/payroll');
    return { success: true, message: `Aturan ${ruleKey} berhasil diperbarui.` };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memperbarui aturan.',
    };
  }
}

/**
 * Retrieves all payroll periods with status and aggregate metrics.
 */
export async function getPayrollPeriods(): Promise<{
  data: PayrollPeriod[];
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());

    const { data: periods, error: pErr } = await client
      .from('payroll_periods')
      .select(`
        *,
        generated_by_user:employees!payroll_periods_generated_by_fkey(id, full_name),
        approved_by_user:employees!payroll_periods_approved_by_fkey(id, full_name)
      `)
      .order('period_start', { ascending: false });

    if (pErr) return { data: [], error: pErr.message };

    // Get runs summary per period
    const { data: allRuns } = await client
      .from('payroll_runs')
      .select('payroll_period_id, net_pay');

    const runsMap = new Map<string, { count: number; totalNetPay: number }>();
    for (const r of allRuns || []) {
      const existing = runsMap.get(r.payroll_period_id) || { count: 0, totalNetPay: 0 };
      existing.count += 1;
      existing.totalNetPay += Number(r.net_pay) || 0;
      runsMap.set(r.payroll_period_id, existing);
    }

    const enriched = (periods || []).map((p: any) => {
      const stats = runsMap.get(p.id) || { count: 0, totalNetPay: 0 };
      return {
        ...p,
        runs_count: stats.count,
        total_net_pay: stats.totalNetPay,
      };
    });

    return { data: enriched, error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat periode penggajian.',
    };
  }
}

/**
 * Creates a new draft payroll period.
 */
export async function createPayrollPeriod(payload: {
  periodStart: string;
  periodEnd: string;
  notes?: string;
  creatorEmail?: string;
}) {
  try {
    const client = getClient() || (await createClient());

    if (new Date(payload.periodEnd) <= new Date(payload.periodStart)) {
      return {
        success: false,
        error: 'Tanggal selesai periode harus lebih besar dari tanggal mulai.',
      };
    }

    const { data, error } = await client
      .from('payroll_periods')
      .insert({
        period_start: payload.periodStart,
        period_end: payload.periodEnd,
        status: 'draft',
        notes: payload.notes?.trim() || null,
      })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/payroll');
    return {
      success: true,
      periodId: data.id,
      message: 'Periode payroll baru berhasil dibuka dalam status Draft.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal membuat periode penggajian.',
    };
  }
}

/**
 * Core Payroll Engine: calculates salaries for all active employees for the selected period.
 */
export async function generatePayrollRun(
  periodId: string,
  executorEmail?: string
): Promise<{
  success: boolean;
  generatedCount: number;
  totalPayroll: number;
  message: string;
  error?: string;
}> {
  try {
    const client = getClient() || (await createClient());
    const executor = await getAuthenticatedEmployee(client, executorEmail);

    // 1. Fetch period and check status
    const { data: period, error: pErr } = await client
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .single();

    if (pErr || !period) {
      return { success: false, generatedCount: 0, totalPayroll: 0, message: 'Periode tidak ditemukan.' };
    }

    if (period.status === 'finalized') {
      return {
        success: false,
        generatedCount: 0,
        totalPayroll: 0,
        message: 'Periode ini telah difinalisasi dan dikunci permanen. Tidak dapat dihitung ulang.',
      };
    }

    // 2. Fetch Rules
    const { data: rulesList } = await getPayrollRules();
    const rulesMap = new Map<string, number>();
    for (const r of rulesList) {
      rulesMap.set(r.rule_key, parseFloat(r.rule_value) || 0);
    }

    const bpjsKesRate = (rulesMap.get('bpjs_kesehatan_rate') || 1) / 100;
    const bpjsKesCap = rulesMap.get('bpjs_kesehatan_max_cap') || 12000000;
    const bpjsTkJhtRate = (rulesMap.get('bpjs_tk_jht_rate') || 2) / 100;
    const bpjsTkJpRate = (rulesMap.get('bpjs_tk_jp_rate') || 1) / 100;
    const bpjsTkJpCap = rulesMap.get('bpjs_tk_jp_max_cap') || 10042300;
    const overtimeMultiplier = rulesMap.get('overtime_hourly_multiplier') || 1.5;
    const lateDeductionPerMinute = rulesMap.get('late_deduction_rate_per_minute') || 1000;
    const absenceDivisor = rulesMap.get('absence_deduction_divisor') || 22;
    const fixedAllowance = rulesMap.get('fixed_transport_allowance') || 500000;

    // 3. Fetch all active employees
    const { data: employees, error: empErr } = await client
      .from('employees')
      .select('id, nik, full_name, role, status')
      .neq('status', 'inactive');

    if (empErr || !employees || employees.length === 0) {
      return { success: false, generatedCount: 0, totalPayroll: 0, message: 'Tidak ada karyawan aktif yang ditemukan.' };
    }

    const empIds = employees.map((e) => e.id);

    // 4. Parallel queries for contracts, attendance, approved overtime
    const [contractsRes, attRes, otRes] = await Promise.all([
      // Contracts
      client
        .from('employee_contracts')
        .select('employee_id, base_salary, start_date')
        .in('employee_id', empIds)
        .order('start_date', { ascending: false }),

      // Attendance records in period
      client
        .from('attendance')
        .select('employee_id, late_minutes, is_absent, linked_izin_telat_request_id')
        .in('employee_id', empIds)
        .gte('attendance_date', period.period_start)
        .lte('attendance_date', period.period_end),

      // Approved Overtime requests in period
      client
        .from('requests')
        .select(`
          employee_id,
          total_days,
          request_type:request_types(code, category)
        `)
        .in('employee_id', empIds)
        .eq('status', 'approved')
        .gte('start_date', period.period_start)
        .lte('start_date', period.period_end),
    ]);

    // Map base salary per employee (latest contract)
    const salaryMap = new Map<string, number>();
    for (const c of contractsRes.data || []) {
      if (!salaryMap.has(c.employee_id)) {
        salaryMap.set(c.employee_id, Number(c.base_salary) || 0);
      }
    }

    // Map attendance penalties
    const attMap = new Map<string, { lateMinutesUnexcused: number; absentDays: number }>();
    for (const a of attRes.data || []) {
      const m = attMap.get(a.employee_id) || { lateMinutesUnexcused: 0, absentDays: 0 };
      if (a.is_absent) {
        m.absentDays += 1;
      } else if (Number(a.late_minutes) > 0 && !a.linked_izin_telat_request_id) {
        m.lateMinutesUnexcused += Number(a.late_minutes);
      }
      attMap.set(a.employee_id, m);
    }

    // Map approved overtime hours
    const otHoursMap = new Map<string, number>();
    for (const r of otRes.data || []) {
      const code = (r.request_type as any)?.code;
      const category = (r.request_type as any)?.category;
      if (code === 'lembur' || category === 'lembur') {
        const current = otHoursMap.get(r.employee_id) || 0;
        otHoursMap.set(r.employee_id, current + (Number(r.total_days) || 0));
      }
    }

    // 5. Compute payroll runs
    const payrollRunsToUpsert: any[] = [];
    let sumTotalPayroll = 0;

    for (const emp of employees) {
      const baseSalary = salaryMap.get(emp.id) || 4500000; // Default base salary UMR fallback if no contract
      const totalAllowance = fixedAllowance;

      // Overtime Pay
      const otHours = otHoursMap.get(emp.id) || 0;
      const hourlyRate = baseSalary > 0 ? baseSalary / 173 : 35000;
      const overtimePay = Math.round(otHours * hourlyRate * overtimeMultiplier);

      // Gross Pay
      const grossPay = baseSalary + totalAllowance + overtimePay;

      // Deductions
      const bpjsKesBase = Math.min(baseSalary, bpjsKesCap);
      const bpjsKesehatanDeduction = Math.round(bpjsKesBase * bpjsKesRate);

      const bpjsTkJhtDeduction = Math.round(baseSalary * bpjsTkJhtRate);
      const bpjsTkJpBase = Math.min(baseSalary, bpjsTkJpCap);
      const bpjsTkJpDeduction = Math.round(bpjsTkJpBase * bpjsTkJpRate);
      const bpjsKetenagakerjaanDeduction = bpjsTkJhtDeduction + bpjsTkJpDeduction;

      // Attendance deductions
      const penalties = attMap.get(emp.id) || { lateMinutesUnexcused: 0, absentDays: 0 };
      const lateDeduction = Math.round(penalties.lateMinutesUnexcused * lateDeductionPerMinute);
      const absenceDailyRate = baseSalary / absenceDivisor;
      const absenceDeduction = Math.round(penalties.absentDays * absenceDailyRate);

      // Simplified PPh21 estimation (5% for taxable income above Rp 4.500.000 / month)
      const taxableMonthly = Math.max(0, grossPay - bpjsKesehatanDeduction - bpjsKetenagakerjaanDeduction - 4500000);
      const pph21Deduction = Math.round(taxableMonthly * 0.05);

      const totalDeductions =
        bpjsKesehatanDeduction +
        bpjsKetenagakerjaanDeduction +
        pph21Deduction +
        lateDeduction +
        absenceDeduction;

      const netPay = Math.max(0, grossPay - totalDeductions);
      sumTotalPayroll += netPay;

      payrollRunsToUpsert.push({
        payroll_period_id: periodId,
        employee_id: emp.id,
        base_salary: baseSalary,
        total_allowance: totalAllowance,
        overtime_pay: overtimePay,
        bpjs_kesehatan_deduction: bpjsKesehatanDeduction,
        bpjs_ketenagakerjaan_deduction: bpjsKetenagakerjaanDeduction,
        pph21_deduction: pph21Deduction,
        late_deduction: lateDeduction,
        absence_deduction: absenceDeduction,
        other_deduction: 0,
        gross_pay: grossPay,
        net_pay: netPay,
        breakdown_json: {
          period: { start: period.period_start, end: period.period_end },
          overtime_hours: otHours,
          overtime_hourly_rate: Math.round(hourlyRate),
          late_minutes_unexcused: penalties.lateMinutesUnexcused,
          absent_days: penalties.absentDays,
          bpjs_tk_breakdown: {
            jht: bpjsTkJhtDeduction,
            jp: bpjsTkJpDeduction,
          },
          generated_at: new Date().toISOString(),
        },
      });
    }

    // 6. Upsert into payroll_runs
    const { error: upsertErr } = await client
      .from('payroll_runs')
      .upsert(payrollRunsToUpsert, {
        onConflict: 'payroll_period_id,employee_id',
      });

    if (upsertErr) {
      return { success: false, generatedCount: 0, totalPayroll: 0, message: 'Gagal menyimpan kalkulasi payroll runs.', error: upsertErr.message };
    }

    // 7. Update period status to 'generated'
    await client
      .from('payroll_periods')
      .update({
        status: 'generated',
        generated_at: new Date().toISOString(),
        generated_by: executor?.id || null,
      })
      .eq('id', periodId);

    revalidatePath('/payroll');

    return {
      success: true,
      generatedCount: payrollRunsToUpsert.length,
      totalPayroll: sumTotalPayroll,
      message: `Perhitungan payroll selesai. ${payrollRunsToUpsert.length} karyawan berhasil di-generate.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      generatedCount: 0,
      totalPayroll: 0,
      message: 'Terjadi kesalahan sistem saat menjalankan engine penggajian.',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Locks and finalizes a generated payroll period permanently.
 */
export async function finalizePayrollPeriod(
  periodId: string,
  executorEmail?: string
): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const client = getClient() || (await createClient());
    const executor = await getAuthenticatedEmployee(client, executorEmail);

    if (!['management', 'admin'].includes(executor?.role || '')) {
      return {
        success: false,
        message: 'Hanya Management atau Administrator yang berwenang memfinalisasi dan mengunci periode payroll.',
      };
    }

    const { data: period, error: pErr } = await client
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .single();

    if (pErr || !period) {
      return { success: false, message: 'Periode penggajian tidak ditemukan.' };
    }

    if (period.status === 'finalized') {
      return { success: true, message: 'Periode ini sudah dalam status finalized sebelumnya.' };
    }

    // Update status to finalized
    const now = new Date().toISOString();
    const { error: updErr } = await client
      .from('payroll_periods')
      .update({
        status: 'finalized',
        approved_at: now,
        approved_by: executor.id,
      })
      .eq('id', periodId);

    if (updErr) return { success: false, message: updErr.message };

    // Record audit trail into audit_logs if table exists
    try {
      await client.from('audit_logs').insert({
        action: 'finalize_payroll',
        entity_type: 'payroll_periods',
        entity_id: periodId,
        actor_id: executor.id,
        payload_after: {
          period_start: period.period_start,
          period_end: period.period_end,
          finalized_at: now,
        },
      });
    } catch {
      // Non-blocking for audit log
    }

    revalidatePath('/payroll');

    return {
      success: true,
      message: 'Periode payroll berhasil difinalisasi dan dikunci permanen. Slip gaji karyawan kini aktif.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: 'Gagal memfinalisasi periode penggajian.',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Retrieves the comprehensive breakdown of employees for a specific payroll period.
 */
export async function getPayrollRunDetail(periodId: string): Promise<{
  period: PayrollPeriod | null;
  runs: PayrollRun[];
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());

    const { data: period, error: pErr } = await client
      .from('payroll_periods')
      .select(`
        *,
        generated_by_user:employees!payroll_periods_generated_by_fkey(id, full_name),
        approved_by_user:employees!payroll_periods_approved_by_fkey(id, full_name)
      `)
      .eq('id', periodId)
      .single();

    if (pErr || !period) return { period: null, runs: [], error: 'Periode tidak ditemukan.' };

    const { data: runs, error: rErr } = await client
      .from('payroll_runs')
      .select(`
        *,
        employee:employees!payroll_runs_employee_id_fkey(
          id,
          nik,
          full_name,
          email,
          role,
          bank_name,
          bank_account_no,
          bank_account_name,
          division:divisions!employees_division_id_fkey(id, name)
        )
      `)
      .eq('payroll_period_id', periodId)
      .order('gross_pay', { ascending: false });

    if (rErr) return { period, runs: [], error: rErr.message };

    return { period, runs: (runs as PayrollRun[]) || [], error: null };
  } catch (err: unknown) {
    return {
      period: null,
      runs: [],
      error: err instanceof Error ? err.message : 'Gagal memuat rincian payroll.',
    };
  }
}

/**
 * Retrieves payslips for the authenticated employee from finalized periods only.
 */
export async function getEmployeePayslips(employeeEmail?: string): Promise<{
  payslips: PayrollRun[];
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    const emp = await getAuthenticatedEmployee(client, employeeEmail);

    if (!emp) return { payslips: [], error: 'Karyawan tidak terautentikasi.' };

    const { data: runs, error } = await client
      .from('payroll_runs')
      .select(`
        *,
        payroll_period:payroll_periods!payroll_runs_payroll_period_id_fkey(
          id,
          period_start,
          period_end,
          status,
          approved_at
        ),
        employee:employees!payroll_runs_employee_id_fkey(
          id,
          nik,
          full_name,
          email,
          role,
          bank_name,
          bank_account_no,
          bank_account_name,
          division:divisions!employees_division_id_fkey(id, name)
        )
      `)
      .eq('employee_id', emp.id)
      .order('created_at', { ascending: false });

    if (error) return { payslips: [], error: error.message };

    // Filter to only finalized periods for staff payslip access
    const finalizedPayslips = (runs || []).filter(
      (r: any) => r.payroll_period?.status === 'finalized'
    );

    return { payslips: (finalizedPayslips as PayrollRun[]) || [], error: null };
  } catch (err: unknown) {
    return {
      payslips: [],
      error: err instanceof Error ? err.message : 'Gagal memuat slip gaji.',
    };
  }
}
