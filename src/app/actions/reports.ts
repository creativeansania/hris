'use server';

import { getActionClient } from '@/lib/supabase/action-client';
import { EmployeeRole } from '@/types/database';
import { getAuthenticatedEmployee, requireAuthRole } from '@/lib/auth';
import { getDivisions } from '@/app/actions/divisions';

// In-memory cache for reporting metrics (30s TTL)
const reportMetricsCache = new Map<string, { data: ReportingMetricsResult; expiresAt: number }>();

export async function invalidateReportingMetricsCache() {
  reportMetricsCache.clear();
}

export interface ReportFilterPayload {
  month: number; // 1-12
  year: number;  // 2026
  divisionId?: string; // 'all' or uuid
  employeeId?: string; // 'all' or uuid
  userEmail?: string;
}

export interface DivisionBreakdown {
  id: string;
  name: string;
  employeeCount: number;
  presentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  overtimeHours: number;
  leaveDays: number;
  onTimeRate: number; // percentage 0-100
  totalBaseSalary: number;
}

export interface TopPerformer {
  id: string;
  fullName: string;
  nik: string;
  divisionName: string;
  value: number; // minutes for late, hours for overtime
  frequency: number; // count of occurrences
}

export interface EmployeeReportRow {
  id: string;
  nik: string;
  fullName: string;
  email: string;
  role: string;
  divisionId: string | null;
  divisionName: string;
  presentDays: number;
  lateDays: number;
  excusedLateDays: number;
  totalLateMinutes: number;
  overtimeHours: number;
  leaveDays: number;
  baseSalary: number;
  estimatedOvertimePay: number;
}

export interface ManagementCostSummary {
  totalBaseSalary: number;
  totalOvertimeCost: number;
  estimatedLateDeductions: number;
  estimatedTotalPayroll: number;
  averageCostPerEmployee: number;
}

export interface ReportingMetricsResult {
  scopeRole: EmployeeRole;
  filterPeriod: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    label: string;
  };
  overall: {
    totalEmployees: number;
    totalPresentDays: number;
    totalLateDays: number;
    totalExcusedLateDays: number;
    totalLateMinutes: number;
    totalOvertimeHours: number;
    totalLeaveDays: number;
    onTimeRate: number;
  };
  divisionBreakdowns: DivisionBreakdown[];
  topLateEmployees: TopPerformer[];
  topOvertimeEmployees: TopPerformer[];
  employeeRows: EmployeeReportRow[];
  managementCost: ManagementCostSummary;
  divisionsList: Array<{ id: string; name: string }>;
  error: string | null;
}

/**
 * Fetches the list of all divisions to populate filters.
 */
export async function getReportingDivisionsList() {
  const { data, error } = await getDivisions();
  return { divisions: (data || []).map((d) => ({ id: d.id, name: d.name })), error };
}

/**
 * Calculates comprehensive reporting metrics for HR and Management.
 */
export async function getReportingMetrics(
  filters: ReportFilterPayload
): Promise<ReportingMetricsResult> {
  const cacheKey = `${filters.month}_${filters.year}_${filters.divisionId || 'all'}_${filters.employeeId || 'all'}_${filters.userEmail || ''}`;
  const cached = reportMetricsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  const defaultRes: ReportingMetricsResult = {
    scopeRole: 'staff',
    filterPeriod: {
      month: filters.month,
      year: filters.year,
      startDate: '',
      endDate: '',
      label: '',
    },
    overall: {
      totalEmployees: 0,
      totalPresentDays: 0,
      totalLateDays: 0,
      totalExcusedLateDays: 0,
      totalLateMinutes: 0,
      totalOvertimeHours: 0,
      totalLeaveDays: 0,
      onTimeRate: 0,
    },
    divisionBreakdowns: [],
    topLateEmployees: [],
    topOvertimeEmployees: [],
    employeeRows: [],
    managementCost: {
      totalBaseSalary: 0,
      totalOvertimeCost: 0,
      estimatedLateDeductions: 0,
      estimatedTotalPayroll: 0,
      averageCostPerEmployee: 0,
    },
    divisionsList: [],
    error: null,
  };

  try {
    const client = await getActionClient();
    const authCheck = await requireAuthRole(
      client,
      ['admin', 'hr', 'management', 'kepala_divisi', 'spv'],
      filters.userEmail
    );

    if (!authCheck.authorized) {
      defaultRes.error = authCheck.error;
      return defaultRes;
    }

    const currentUser = authCheck.employee;
    const userRole: EmployeeRole = currentUser.role;

    // 1. Calculate Period Range
    const m = Number(filters.month) || new Date().getMonth() + 1;
    const y = Number(filters.year) || new Date().getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const periodLabel = `${monthNames[m - 1]} ${y}`;

    defaultRes.scopeRole = userRole;
    defaultRes.filterPeriod = {
      month: m,
      year: y,
      startDate,
      endDate,
      label: periodLabel,
    };

    // 2. Fetch Divisions (cached)
    const { data: allDivisions } = await getDivisions();
    const divisionsList = (allDivisions || []).map((d) => ({ id: d.id, name: d.name }));
    defaultRes.divisionsList = divisionsList;

    // 3. Determine accessible division restriction
    let targetDivisionId = filters.divisionId && filters.divisionId !== 'all' ? filters.divisionId : null;
    if (['kepala_divisi', 'spv'].includes(userRole) && currentUser?.division_id) {
      // Restricted to supervisor's division
      targetDivisionId = currentUser.division_id;
    }

    // 4. Fetch Employees
    let empQuery = client
      .from('employees')
      .select(`
        id,
        nik,
        full_name,
        email,
        role,
        status,
        division_id,
        division:divisions!employees_division_id_fkey(id, name)
      `)
      .neq('status', 'inactive');

    if (targetDivisionId) {
      empQuery = empQuery.eq('division_id', targetDivisionId);
    }
    if (filters.employeeId && filters.employeeId !== 'all') {
      empQuery = empQuery.eq('id', filters.employeeId);
    }

    const { data: rawEmployees, error: empErr } = await empQuery;
    if (empErr) {
      defaultRes.error = empErr.message;
      return defaultRes;
    }

    const employees = rawEmployees || [];
    const employeeIds = employees.map((e) => e.id);

    if (employeeIds.length === 0) {
      return defaultRes;
    }

    // 5. Parallel queries for Attendance, Overtime, Leave, Contracts
    // Avoid passing 90+ UUIDs into SQL IN clause when viewing all company employees
    const isFiltered = Boolean(targetDivisionId || (filters.employeeId && filters.employeeId !== 'all'));

    let attQuery = client
      .from('attendance')
      .select(`
        employee_id,
        attendance_date,
        clock_in,
        clock_out,
        late_minutes,
        is_absent,
        linked_izin_telat_request_id
      `)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (isFiltered) {
      attQuery = attQuery.in('employee_id', employeeIds);
    }

    let reqQuery = client
      .from('requests')
      .select(`
        id,
        employee_id,
        total_days,
        start_date,
        end_date,
        status,
        request_type:request_types(id, name, code, category)
      `)
      .eq('status', 'approved')
      .gte('start_date', startDate)
      .lte('start_date', endDate);

    if (isFiltered) {
      reqQuery = reqQuery.in('employee_id', employeeIds);
    }

    let contractsQuery = client
      .from('employee_contracts')
      .select('employee_id, contract_type, base_salary, start_date, end_date')
      .order('start_date', { ascending: false });

    if (isFiltered) {
      contractsQuery = contractsQuery.in('employee_id', employeeIds);
    }

    const [attRes, reqRes, contractsRes] = await Promise.all([
      attQuery,
      reqQuery,
      contractsQuery,
    ]);

    const attendances = attRes.data || [];
    const requests = reqRes.data || [];
    const contracts = contractsRes.data || [];

    // Map latest contract base_salary for each employee
    const salaryMap = new Map<string, number>();
    for (const c of contracts) {
      if (!salaryMap.has(c.employee_id)) {
        salaryMap.set(c.employee_id, Number(c.base_salary) || 0);
      }
    }

    // 6. Aggregate per-employee metrics
    const empMetricsMap = new Map<string, {
      presentDays: number;
      lateDays: number;
      excusedLateDays: number;
      totalLateMinutes: number;
      overtimeHours: number;
      leaveDays: number;
    }>();

    for (const id of employeeIds) {
      empMetricsMap.set(id, {
        presentDays: 0,
        lateDays: 0,
        excusedLateDays: 0,
        totalLateMinutes: 0,
        overtimeHours: 0,
        leaveDays: 0,
      });
    }

    // Aggregate attendance
    for (const att of attendances) {
      const m = empMetricsMap.get(att.employee_id);
      if (!m) continue;

      const isLate = (Number(att.late_minutes) || 0) > 0;
      if (att.is_absent) {
        // Absent
      } else if (isLate) {
        m.lateDays += 1;
        m.totalLateMinutes += Number(att.late_minutes) || 0;
        if (att.linked_izin_telat_request_id) {
          m.excusedLateDays += 1;
        }
      } else if (att.clock_in) {
        m.presentDays += 1;
      }
    }

    // Aggregate requests (Overtime & Leave)
    for (const req of requests) {
      const m = empMetricsMap.get(req.employee_id);
      if (!m) continue;

      const category = (req.request_type as any)?.category;
      const code = (req.request_type as any)?.code;

      if (category === 'lembur' || code === 'lembur') {
        m.overtimeHours += Number(req.total_days) || 0;
      } else if (category === 'cuti' || category === 'izin') {
        m.leaveDays += Number(req.total_days) || 0;
      }
    }

    // 7. Build detailed employee rows
    const employeeRows: EmployeeReportRow[] = [];
    let totalAllPresent = 0;
    let totalAllLate = 0;
    let totalAllExcused = 0;
    let totalAllLateMin = 0;
    let totalAllOvertime = 0;
    let totalAllLeave = 0;
    let totalAllSalary = 0;
    let totalAllOvertimePay = 0;
    let totalAllLateDeductions = 0;

    for (const emp of employees) {
      const m = empMetricsMap.get(emp.id)!;
      const baseSalary = salaryMap.get(emp.id) || 0;

      // Depnaker formula estimation: 1/173 * base_salary * 1.5 * overtimeHours
      const hourlyRate = baseSalary > 0 ? baseSalary / 173 : 35000;
      const estimatedOvertimePay = Math.round(m.overtimeHours * hourlyRate * 1.5);

      // Late deduction estimation (e.g. unexcused late: Rp 1.000 / minute)
      const unexcusedMinutes = m.excusedLateDays > 0 && m.lateDays > 0
        ? Math.round(m.totalLateMinutes * ((m.lateDays - m.excusedLateDays) / m.lateDays))
        : m.totalLateMinutes;
      const lateDeduction = Math.round(unexcusedMinutes * 1000);

      const divName = (emp.division as any)?.name || 'Tanpa Divisi';

      employeeRows.push({
        id: emp.id,
        nik: emp.nik,
        fullName: emp.full_name,
        email: emp.email,
        role: emp.role,
        divisionId: emp.division_id,
        divisionName: divName,
        presentDays: m.presentDays,
        lateDays: m.lateDays,
        excusedLateDays: m.excusedLateDays,
        totalLateMinutes: m.totalLateMinutes,
        overtimeHours: m.overtimeHours,
        leaveDays: m.leaveDays,
        baseSalary,
        estimatedOvertimePay,
      });

      totalAllPresent += m.presentDays;
      totalAllLate += m.lateDays;
      totalAllExcused += m.excusedLateDays;
      totalAllLateMin += m.totalLateMinutes;
      totalAllOvertime += m.overtimeHours;
      totalAllLeave += m.leaveDays;
      totalAllSalary += baseSalary;
      totalAllOvertimePay += estimatedOvertimePay;
      totalAllLateDeductions += lateDeduction;
    }

    // 8. Aggregate Division Breakdown
    const divBreakdownMap = new Map<string, {
      name: string;
      employeeCount: number;
      presentDays: number;
      lateDays: number;
      totalLateMinutes: number;
      overtimeHours: number;
      leaveDays: number;
      totalBaseSalary: number;
    }>();

    for (const d of divisionsList) {
      divBreakdownMap.set(d.id, {
        name: d.name,
        employeeCount: 0,
        presentDays: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        overtimeHours: 0,
        leaveDays: 0,
        totalBaseSalary: 0,
      });
    }

    for (const row of employeeRows) {
      if (!row.divisionId) continue;
      const target = divBreakdownMap.get(row.divisionId);
      if (target) {
        target.employeeCount += 1;
        target.presentDays += row.presentDays;
        target.lateDays += row.lateDays;
        target.totalLateMinutes += row.totalLateMinutes;
        target.overtimeHours += row.overtimeHours;
        target.leaveDays += row.leaveDays;
        target.totalBaseSalary += row.baseSalary;
      }
    }

    const divisionBreakdowns: DivisionBreakdown[] = Array.from(divBreakdownMap.entries())
      .filter(([_, stats]) => stats.employeeCount > 0)
      .map(([id, stats]) => {
        const totalAttendances = stats.presentDays + stats.lateDays;
        const onTimeRate = totalAttendances > 0
          ? Math.round((stats.presentDays / totalAttendances) * 100)
          : 100;

        return {
          id,
          name: stats.name,
          employeeCount: stats.employeeCount,
          presentDays: stats.presentDays,
          lateDays: stats.lateDays,
          totalLateMinutes: stats.totalLateMinutes,
          overtimeHours: stats.overtimeHours,
          leaveDays: stats.leaveDays,
          onTimeRate,
          totalBaseSalary: stats.totalBaseSalary,
        };
      })
      .sort((a, b) => b.employeeCount - a.employeeCount);

    // 9. Top 5 Late and Top 5 Overtime
    const topLateEmployees: TopPerformer[] = [...employeeRows]
      .filter((r) => r.totalLateMinutes > 0)
      .sort((a, b) => b.totalLateMinutes - a.totalLateMinutes)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        fullName: r.fullName,
        nik: r.nik,
        divisionName: r.divisionName,
        value: r.totalLateMinutes,
        frequency: r.lateDays,
      }));

    const topOvertimeEmployees: TopPerformer[] = [...employeeRows]
      .filter((r) => r.overtimeHours > 0)
      .sort((a, b) => b.overtimeHours - a.overtimeHours)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        fullName: r.fullName,
        nik: r.nik,
        divisionName: r.divisionName,
        value: r.overtimeHours,
        frequency: r.overtimeHours > 0 ? 1 : 0,
      }));

    // 10. Overall Rate
    const totalAllAttCount = totalAllPresent + totalAllLate;
    const overallOnTimeRate = totalAllAttCount > 0
      ? Math.round((totalAllPresent / totalAllAttCount) * 100)
      : 100;

    const estimatedTotalPayroll = totalAllSalary + totalAllOvertimePay - totalAllLateDeductions;
    const averageCostPerEmployee = employees.length > 0
      ? Math.round(estimatedTotalPayroll / employees.length)
      : 0;

    return {
      scopeRole: userRole,
      filterPeriod: {
        month: m,
        year: y,
        startDate,
        endDate,
        label: periodLabel,
      },
      overall: {
        totalEmployees: employees.length,
        totalPresentDays: totalAllPresent,
        totalLateDays: totalAllLate,
        totalExcusedLateDays: totalAllExcused,
        totalLateMinutes: totalAllLateMin,
        totalOvertimeHours: totalAllOvertime,
        totalLeaveDays: totalAllLeave,
        onTimeRate: overallOnTimeRate,
      },
      divisionBreakdowns,
      topLateEmployees,
      topOvertimeEmployees,
      employeeRows: employeeRows.sort((a, b) => a.fullName.localeCompare(b.fullName)),
      managementCost: {
        totalBaseSalary: totalAllSalary,
        totalOvertimeCost: totalAllOvertimePay,
        estimatedLateDeductions: totalAllLateDeductions,
        estimatedTotalPayroll,
        averageCostPerEmployee,
      },
      divisionsList,
      error: null,
    };

    reportMetricsCache.set(cacheKey, { data: defaultRes, expiresAt: Date.now() + 30_000 });
    return defaultRes;
  } catch (err: unknown) {
    defaultRes.error = err instanceof Error ? err.message : 'Gagal memproses data laporan.';
    return defaultRes;
  }
}
