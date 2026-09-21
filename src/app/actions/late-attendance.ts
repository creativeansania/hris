'use server';

import { getActionClient } from '@/lib/supabase/action-client';
import { revalidatePath } from 'next/cache';
import { getTodayWIB, getWIBDateParts } from '@/lib/date-utils';
import { requireAuthRole } from '@/lib/auth';
import {
  IzinTelatItem,
  LateAccumulationItem,
  AttendanceCorrectionItem,
} from '@/types/database';

/**
 * Checks whether an employee is eligible to submit "Izin Telat" today.
 * Izin Telat must be submitted BEFORE the scheduled start time of the employee's work schedule.
 */
export async function checkCanApplyIzinTelat(employeeEmail?: string) {
  try {
    const client = await getActionClient();

    let empQuery = client.from('employees').select('id, full_name, email, role, work_schedule_id');
    if (employeeEmail) {
      empQuery = empQuery.ilike('email', employeeEmail.trim());
    }
    const { data: emp, error: empError } = await empQuery.limit(1).maybeSingle();

    if (empError || !emp) {
      return {
        canApply: false,
        employee: null,
        scheduledStartTime: '08:00',
        message: 'Data karyawan tidak ditemukan.',
      };
    }

    const wibParts = getWIBDateParts();
    const dayOfWeek = wibParts.dayOfWeek;

    let scheduledStartTime = '08:00';
    let isDayOff = false;

    if (emp.work_schedule_id) {
      const { data: scheduleDay } = await client
        .from('work_schedule_days')
        .select('*')
        .eq('group_id', emp.work_schedule_id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      if (scheduleDay) {
        if (scheduleDay.is_day_off) {
          isDayOff = true;
        } else if (scheduleDay.start_time) {
          scheduledStartTime = scheduleDay.start_time.slice(0, 5);
        }
      }
    }

    if (isDayOff) {
      return {
        canApply: false,
        employee: emp,
        scheduledStartTime,
        message: 'Hari ini adalah hari libur kerja sesuai jadwal Anda.',
      };
    }

    // Compare current time with scheduled start time
    const [schH, schM] = scheduledStartTime.split(':').map(Number);
    const scheduledTotalMinutes = schH * 60 + schM;
    const currentTotalMinutes = wibParts.hour * 60 + wibParts.minute;

    // Check if already applied for today (specifically for Izin Telat)
    const today = getTodayWIB();

    const { data: reqType } = await client
      .from('request_types')
      .select('id')
      .eq('code', 'izin_telat')
      .maybeSingle();

    let existingQuery = client
      .from('requests')
      .select('id, status, start_time, end_time, reason')
      .eq('employee_id', emp.id)
      .eq('start_date', today);

    if (reqType) {
      existingQuery = existingQuery.eq('request_type_id', reqType.id);
    }

    const { data: existingRequest } = await existingQuery.maybeSingle();

    if (existingRequest) {
      return {
        canApply: false,
        employee: emp,
        scheduledStartTime,
        existingRequest,
        message: `Anda sudah mengajukan Izin Telat untuk hari ini (Status: ${existingRequest.status}).`,
      };
    }

    const isBeforeStart = currentTotalMinutes <= scheduledTotalMinutes;

    return {
      canApply: isBeforeStart,
      employee: emp,
      scheduledStartTime,
      currentTotalMinutes,
      scheduledTotalMinutes,
      message: isBeforeStart
        ? `Silakan ajukan sebelum jam masuk (${scheduledStartTime} WIB).`
        : `Jam masuk kerja Anda (${scheduledStartTime} WIB) sudah terlewat. Izin Telat hanya dapat diajukan sebelum jam kerja dimulai. Silakan isi alasan keterlambatan aktual pada tabel presensi setelah Anda tiba.`,
    };
  } catch (err: unknown) {
    return {
      canApply: false,
      employee: null,
      scheduledStartTime: '08:00',
      message: err instanceof Error ? err.message : 'Gagal memeriksa jadwal kerja',
    };
  }
}

/**
 * Submits an "Izin Telat" request before work begins.
 */
export async function submitIzinTelat(payload: {
  employeeEmail?: string;
  estimatedArrival: string; // HH:MM
  reason: string;
}) {
  try {
    const client = await getActionClient();

    let empQuery = client.from('employees').select('id, full_name, email, role, spv_id, division_id');
    if (payload.employeeEmail) {
      empQuery = empQuery.ilike('email', payload.employeeEmail.trim());
    }
    const { data: emp } = await empQuery.limit(1).maybeSingle();

    if (!emp) {
      return { success: false, error: 'Data karyawan tidak ditemukan.' };
    }

    // Get 'izin_telat' request_type
    const { data: reqType } = await client
      .from('request_types')
      .select('id')
      .eq('code', 'izin_telat')
      .single();

    if (!reqType) {
      return { success: false, error: 'Tipe pengajuan Izin Telat belum terdaftar di sistem.' };
    }

    const today = getTodayWIB();

    // Check existing request specifically for izin_telat
    const { data: existing } = await client
      .from('requests')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('request_type_id', reqType.id)
      .eq('start_date', today)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Anda sudah mengajukan permohonan untuk hari ini.' };
    }

    // Insert request
    const { data: newRequest, error: reqError } = await client
      .from('requests')
      .insert({
        request_type_id: reqType.id,
        employee_id: emp.id,
        created_by: emp.id,
        start_date: today,
        end_date: today,
        start_time: '08:00:00',
        end_time: `${payload.estimatedArrival}:00`,
        total_days: 1,
        reason: payload.reason.trim(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (reqError || !newRequest) {
      return { success: false, error: `Gagal membuat pengajuan: ${reqError?.message}` };
    }

    // Insert approval record (SPV or HR)
    const { data: hrAdmin } = await client
      .from('employees')
      .select('id, role')
      .in('role', ['admin', 'hr'])
      .limit(1)
      .single();

    const approverId = emp.spv_id || hrAdmin?.id;
    const approverRole = emp.spv_id ? 'spv' : hrAdmin?.role || 'hr';

    if (approverId) {
      await client.from('request_approvals').insert({
        request_id: newRequest.id,
        approver_id: approverId,
        approver_role: approverRole,
        decision: 'pending',
      });
    }

    revalidatePath('/my-attendance');
    revalidatePath('/attendance-management');

    return { success: true, error: null, requestId: newRequest.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kegagalan sistem saat mengajukan Izin Telat',
    };
  }
}

/**
 * Fetches Izin Telat requests history for an employee.
 */
export async function getMyIzinTelatHistory(employeeEmail?: string) {
  try {
    const client = await getActionClient();

    let empQuery = client.from('employees').select('id');
    if (employeeEmail) {
      empQuery = empQuery.ilike('email', employeeEmail.trim());
    }
    const { data: emp } = await empQuery.limit(1).maybeSingle();

    if (!emp) return { data: [], error: 'Karyawan tidak ditemukan' };

    const { data, error } = await client
      .from('requests')
      .select(`
        id,
        start_date,
        start_time,
        end_time,
        reason,
        status,
        submitted_at,
        decided_at,
        request_type:request_types(name, code),
        approvals:request_approvals(
          decision,
          note,
          decided_at,
          approver:employees(full_name, role)
        )
      `)
      .eq('employee_id', emp.id)
      .order('submitted_at', { ascending: false });

    if (error) return { data: [], error: error.message };

    // Filter to izin_telat
    const izinTelatList = (data || []).filter(
      (r: any) => r.request_type?.code === 'izin_telat'
    );

    return { data: izinTelatList, error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal memuat riwayat Izin Telat' };
  }
}

/**
 * Fetches all pending Izin Telat requests for HR & Supervisors.
 */
export async function getPendingIzinTelatList() {
  try {
    const client = await getActionClient();

    const { data, error } = await client
      .from('requests')
      .select(`
        id,
        employee_id,
        start_date,
        start_time,
        end_time,
        reason,
        status,
        submitted_at,
        employee:employees!requests_employee_id_fkey(
          id,
          full_name,
          email,
          role,
          division:divisions(name)
        ),
        request_type:request_types(name, code),
        approvals:request_approvals(
          id,
          decision,
          note,
          approver:employees(full_name)
        )
      `)
      .order('submitted_at', { ascending: false });

    if (error) return { data: [], error: error.message };

    const izinTelatList = ((data || []).filter(
      (r: any) => r.request_type?.code === 'izin_telat'
    ) as unknown) as IzinTelatItem[];

    return { data: izinTelatList, error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal memuat daftar pengajuan Izin Telat' };
  }
}

/**
 * Approves or rejects an Izin Telat request.
 * If approved, automatically links it to that day's attendance record and recalculates accumulations.
 */
export async function decideIzinTelat(
  requestId: string,
  decision: 'approved' | 'rejected',
  note?: string
) {
  try {
    const client = await getActionClient();

    const authCheck = await requireAuthRole(client, ['admin', 'hr', 'management', 'spv']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    // 1. Update request status
    const { data: req, error: reqError } = await client
      .from('requests')
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select('id, employee_id, start_date')
      .single();

    if (reqError || !req) {
      return { success: false, error: `Gagal memperbarui status pengajuan: ${reqError?.message}` };
    }

    // 2. Update approvals table
    await client
      .from('request_approvals')
      .update({
        decision,
        note: note || null,
        decided_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    // 3. If approved, link to attendance record for that date
    if (decision === 'approved') {
      const { data: att } = await client
        .from('attendance')
        .select('id')
        .eq('employee_id', req.employee_id)
        .eq('attendance_date', req.start_date)
        .maybeSingle();

      if (att) {
        await client
          .from('attendance')
          .update({ linked_izin_telat_request_id: requestId })
          .eq('id', att.id);
      }

      // Recalculate monthly late accumulation
      const [yearStr, monthStr] = req.start_date.split('-');
      await calculateMonthlyLateAccumulation(req.employee_id, Number(yearStr), Number(monthStr));
    }

    revalidatePath('/attendance-management');
    revalidatePath('/my-attendance');

    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memproses keputusan Izin Telat',
    };
  }
}

/**
 * Calculates and upserts monthly late accumulation for an employee.
 * Separates excused (linked to approved izin telat) vs unexcused (sanctioned) lates.
 */
export async function calculateMonthlyLateAccumulation(
  employeeId: string,
  year: number,
  month: number
) {
  try {
    const client = await getActionClient();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Fetch all attendance for this employee in this month
    const { data: records, error } = await client
      .from('attendance')
      .select('id, attendance_date, clock_in, late_minutes, is_absent, linked_izin_telat_request_id')
      .eq('employee_id', employeeId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (error) return { success: false, error: error.message };

    const attList = records || [];

    let lateCount = 0;
    let totalLateMinutes = 0;
    let excusedCount = 0;
    let unexcusedCount = 0;
    let absenceWithoutLeaveCount = 0;

    for (const r of attList) {
      if (r.is_absent) {
        absenceWithoutLeaveCount++;
      }

      if (r.late_minutes && r.late_minutes > 0) {
        lateCount++;
        totalLateMinutes += r.late_minutes;

        if (r.linked_izin_telat_request_id) {
          excusedCount++;
        } else {
          unexcusedCount++;
        }
      }
    }

    // Deduction penalty calculation:
    // Tolerated 3 unexcused lates per month. Beyond 3, Rp 50,000 per violation.
    const penaltyPerViolation = 50000;
    const excessLates = Math.max(0, unexcusedCount - 3);
    const deductionAmount = excessLates * penaltyPerViolation;

    // Upsert into late_accumulations table
    const { error: upsertError } = await client
      .from('late_accumulations')
      .upsert(
        {
          employee_id: employeeId,
          year,
          month,
          late_count: lateCount,
          total_late_minutes: totalLateMinutes,
          excused_count: excusedCount,
          unexcused_count: unexcusedCount,
          absence_without_leave_count: absenceWithoutLeaveCount,
          deduction_amount: deductionAmount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,year,month' }
      );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return {
      success: true,
      error: null,
      data: {
        lateCount,
        totalLateMinutes,
        excusedCount,
        unexcusedCount,
        absenceWithoutLeaveCount,
        deductionAmount,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghitung akumulasi keterlambatan',
    };
  }
}

/**
 * Bulk recalculation of late accumulations for all employees for a given month.
 */
export async function recalculateAllLateAccumulations(year: number, month: number) {
  try {
    const client = await getActionClient();

    const { data: employees } = await client
      .from('employees')
      .select('id')
      .eq('status', 'active');

    for (const emp of employees || []) {
      await calculateMonthlyLateAccumulation(emp.id, year, month);
    }

    revalidatePath('/attendance-management');
    revalidatePath('/my-attendance');

    return { success: true, count: employees?.length || 0, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal melakukan kalkulasi massal akumulasi keterlambatan',
    };
  }
}

/**
 * Gets personal late accumulation status for an employee.
 */
export async function getMyLateAccumulation(employeeEmail?: string, year?: number, month?: number) {
  try {
    const client = await getActionClient();

    let empQuery = client.from('employees').select('id');
    if (employeeEmail) {
      empQuery = empQuery.ilike('email', employeeEmail.trim());
    }
    const { data: emp } = await empQuery.limit(1).maybeSingle();

    if (!emp) return { data: null, error: 'Karyawan tidak ditemukan' };

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Ensure up-to-date calculation
    await calculateMonthlyLateAccumulation(emp.id, currentYear, currentMonth);

    const { data, error } = await client
      .from('late_accumulations')
      .select('*')
      .eq('employee_id', emp.id)
      .eq('year', currentYear)
      .eq('month', currentMonth)
      .maybeSingle();

    return { data: data || null, error: error?.message || null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Gagal memuat status akumulasi keterlambatan' };
  }
}

/**
 * Gets late accumulations summary for all employees for HR monitoring.
 */
export async function getLateAccumulationsSummary(year: number, month: number, divisionId?: string) {
  try {
    const client = await getActionClient();

    let query = client
      .from('late_accumulations')
      .select(`
        *,
        employee:employees!late_accumulations_employee_id_fkey(
          id,
          full_name,
          email,
          role,
          nik,
          division_id,
          division:divisions(name)
        )
      `)
      .eq('year', year)
      .eq('month', month)
      .order('unexcused_count', { ascending: false })
      .order('total_late_minutes', { ascending: false });

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    let results = data || [];
    if (divisionId && divisionId !== 'all') {
      results = results.filter((r: any) => r.employee?.division_id === divisionId);
    }

    return { data: (results as unknown) as LateAccumulationItem[], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal memuat rekapitulasi akumulasi sanksi' };
  }
}

/**
 * Non-destructive attendance correction by HR.
 * Records the change in attendance_corrections with audit reason, and updates the active attendance row.
 */
export async function createAttendanceCorrection(payload: {
  attendanceId: string;
  correctedClockIn?: string;
  correctedClockOut?: string;
  reason: string;
}) {
  try {
    if (!payload.reason || payload.reason.trim().length === 0) {
      return { success: false, error: 'Alasan koreksi wajib diisi untuk keperluan audit trail.' };
    }

    const client = await getActionClient();

    const authCheck = await requireAuthRole(client, ['admin', 'hr', 'management']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const hrId = authCheck.employee.id;

    // 2. Fetch original attendance record
    const { data: orig, error: origError } = await client
      .from('attendance')
      .select('*, employee:employees(work_schedule_id)')
      .eq('id', payload.attendanceId)
      .single();

    if (origError || !orig) {
      return { success: false, error: 'Data absensi tidak ditemukan.' };
    }

    // 3. Calculate corrected values
    const newClockIn = payload.correctedClockIn || orig.clock_in;
    const newClockOut = payload.correctedClockOut || orig.clock_out;

    let newLateMinutes = orig.late_minutes;
    let newWorkMinutes = orig.work_minutes;

    if (newClockIn) {
      const [h, m] = newClockIn.split(':').map(Number);
      let scheduledH = 8;
      let scheduledM = 0;

      const scheduleId = (orig.employee as any)?.work_schedule_id;
      if (scheduleId && orig.attendance_date) {
        const attDate = new Date(`${orig.attendance_date}T12:00:00Z`);
        const dayOfWeek = attDate.getUTCDay();
        const { data: schDay } = await client
          .from('work_schedule_days')
          .select('start_time, is_day_off')
          .eq('group_id', scheduleId)
          .eq('day_of_week', dayOfWeek)
          .maybeSingle();

        if (schDay && schDay.start_time && !schDay.is_day_off) {
          const [sH, sM] = schDay.start_time.split(':').map(Number);
          scheduledH = sH;
          scheduledM = sM;
        }
      }

      const diffMinutes = h * 60 + m - (scheduledH * 60 + scheduledM);
      newLateMinutes = Math.max(0, diffMinutes);
    }

    if (newClockIn && newClockOut) {
      const [inH, inM] = newClockIn.split(':').map(Number);
      const [outH, outM] = newClockOut.split(':').map(Number);
      const totalIn = inH * 60 + inM;
      const totalOut = outH * 60 + outM;
      newWorkMinutes = Math.max(0, totalOut - totalIn);
    }

    // 4. Insert into attendance_corrections
    const { error: insertCorrError } = await client
      .from('attendance_corrections')
      .insert({
        attendance_id: payload.attendanceId,
        corrected_clock_in: newClockIn,
        corrected_clock_out: newClockOut,
        corrected_late_minutes: newLateMinutes,
        corrected_work_minutes: newWorkMinutes,
        reason: payload.reason.trim(),
        corrected_by: hrId,
      });

    if (insertCorrError) {
      return { success: false, error: `Gagal mencatat riwayat koreksi: ${insertCorrError.message}` };
    }

    // 5. Update active attendance row
    const { error: updateError } = await client
      .from('attendance')
      .update({
        clock_in: newClockIn,
        clock_out: newClockOut,
        late_minutes: newLateMinutes,
        work_minutes: newWorkMinutes,
      })
      .eq('id', payload.attendanceId);

    if (updateError) {
      return { success: false, error: `Gagal memperbarui nilai absensi: ${updateError.message}` };
    }

    // 6. Recalculate late accumulation
    const [yearStr, monthStr] = orig.attendance_date.split('-');
    await calculateMonthlyLateAccumulation(orig.employee_id, Number(yearStr), Number(monthStr));

    revalidatePath('/attendance-management');
    revalidatePath('/my-attendance');

    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kegagalan sistem saat menyimpan koreksi',
    };
  }
}

/**
 * Gets the correction audit history for a specific attendance record.
 */
export async function getAttendanceCorrections(attendanceId: string) {
  try {
    const client = await getActionClient();

    const { data, error } = await client
      .from('attendance_corrections')
      .select(`
        *,
        corrector:employees(full_name, email, role)
      `)
      .eq('attendance_id', attendanceId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as unknown as AttendanceCorrectionItem[], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal memuat riwayat koreksi' };
  }
}
