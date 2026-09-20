'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseFingerprintFile, RawAttendanceRow } from '@/lib/attendance/parser';
import { getTodayWIB } from '@/lib/date-utils';
import { getAuthenticatedEmployee, requireAuthRole } from '@/lib/auth';

function getClient() {
  return getAdminClient();
}

export interface PreviewRow extends RawAttendanceRow {
  employee_id?: string | null;
  matched_employee_name?: string | null;
  matched_employee_role?: string | null;
  matched_employee_division?: string | null;
  match_status: 'matched' | 'unmatched' | 'duplicate';
}

export interface ImportPreviewResult {
  fileName: string;
  period_start: string;
  period_end: string;
  total_rows: number;
  matched_count: number;
  unmatched_count: number;
  duplicate_count: number;
  rows: PreviewRow[];
  error?: string | null;
}

export async function parseAndPreviewFingerprint(
  base64Content: string,
  fileName: string
): Promise<ImportPreviewResult> {
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const rawRows = parseFingerprintFile(buffer);

    if (rawRows.length === 0) {
      return {
        fileName,
        period_start: '',
        period_end: '',
        total_rows: 0,
        matched_count: 0,
        unmatched_count: 0,
        duplicate_count: 0,
        rows: [],
        error: 'Tidak ada baris data valid yang terdeteksi dari berkas ini. Pastikan berkas memiliki kolom ID/AC-No dan Tanggal.',
      };
    }

    const client = getClient() || (await createClient());

    // 1. Fetch all employees to match by fingerprint_ac_no or name
    const { data: allEmployees, error: empError } = await client
      .from('employees')
      .select('id, full_name, email, role, fingerprint_ac_no, division:divisions(name)');

    if (empError) {
      return {
        fileName,
        period_start: '',
        period_end: '',
        total_rows: 0,
        matched_count: 0,
        unmatched_count: 0,
        duplicate_count: 0,
        rows: [],
        error: `Gagal membaca database karyawan: ${empError.message}`,
      };
    }

    // 2. Find min & max date in batch
    const dates = rawRows.map((r) => r.attendance_date).filter(Boolean).sort();
    const period_start = dates[0] || getTodayWIB();
    const period_end = dates[dates.length - 1] || period_start;

    // 3. Fetch existing attendance records in this period to detect duplicates
    const { data: existingAttendance } = await client
      .from('attendance')
      .select('employee_id, attendance_date, source')
      .gte('attendance_date', period_start)
      .lte('attendance_date', period_end)
      .eq('source', 'fingerprint');

    const existingSet = new Set<string>();
    (existingAttendance || []).forEach((a) => {
      existingSet.add(`${a.employee_id}_${a.attendance_date}`);
    });

    // Create fast lookup maps
    const empByAcNo = new Map<string, typeof allEmployees[0]>();
    const empByName = new Map<string, typeof allEmployees[0]>();

    (allEmployees || []).forEach((emp) => {
      if (emp.fingerprint_ac_no) {
        empByAcNo.set(String(emp.fingerprint_ac_no).trim(), emp);
      }
      empByName.set(emp.full_name.trim().toLowerCase(), emp);
    });

    let matched_count = 0;
    let unmatched_count = 0;
    let duplicate_count = 0;

    const previewRows: PreviewRow[] = [];

    for (const row of rawRows) {
      // Try matching by AC-No first, then fallback to employee name
      let emp = empByAcNo.get(row.fingerprint_ac_no);
      if (!emp && row.employee_name_raw) {
        emp = empByName.get(row.employee_name_raw.trim().toLowerCase());
      }

      if (!emp) {
        unmatched_count++;
        previewRows.push({
          ...row,
          employee_id: null,
          matched_employee_name: null,
          matched_employee_role: null,
          matched_employee_division: null,
          match_status: 'unmatched',
        });
      } else {
        const isDuplicate = existingSet.has(`${emp.id}_${row.attendance_date}`);

        if (isDuplicate) {
          duplicate_count++;
          const divName = Array.isArray(emp.division)
            ? (emp.division[0] as unknown as { name: string })?.name
            : (emp.division as unknown as { name: string })?.name;
          previewRows.push({
            ...row,
            employee_id: emp.id,
            matched_employee_name: emp.full_name,
            matched_employee_role: emp.role,
            matched_employee_division: divName || null,
            match_status: 'duplicate',
          });
        } else {
          matched_count++;
          const divName = Array.isArray(emp.division)
            ? (emp.division[0] as unknown as { name: string })?.name
            : (emp.division as unknown as { name: string })?.name;
          previewRows.push({
            ...row,
            employee_id: emp.id,
            matched_employee_name: emp.full_name,
            matched_employee_role: emp.role,
            matched_employee_division: divName || null,
            match_status: 'matched',
          });
        }
      }
    }

    return {
      fileName,
      period_start,
      period_end,
      total_rows: rawRows.length,
      matched_count,
      unmatched_count,
      duplicate_count,
      rows: previewRows,
      error: null,
    };
  } catch (err: unknown) {
    return {
      fileName,
      period_start: '',
      period_end: '',
      total_rows: 0,
      matched_count: 0,
      unmatched_count: 0,
      duplicate_count: 0,
      rows: [],
      error: err instanceof Error ? err.message : 'Terjadi kegagalan saat membaca berkas',
    };
  }
}

export async function confirmAttendanceImport(payload: {
  fileName: string;
  period_start: string;
  period_end: string;
  rows: PreviewRow[];
  duplicateHandling: 'skip' | 'overwrite';
}) {
  try {
    const client = getClient() || (await createClient());

    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const uploaderId = authCheck.employee.id;

    // Filter rows that have a matched employee
    const validRows = payload.rows.filter((r) => r.employee_id);

    if (validRows.length === 0) {
      return { success: false, error: 'Tidak ada baris yang cocok dengan data karyawan untuk diimpor.' };
    }

    // 1. Create Import Batch Record
    const { data: batch, error: batchError } = await client
      .from('attendance_import_batches')
      .insert({
        file_name: payload.fileName,
        period_start: payload.period_start,
        period_end: payload.period_end,
        row_count: payload.rows.length,
        matched_count: validRows.length,
        unmatched_count: payload.rows.length - validRows.length,
        uploaded_by: uploaderId,
        status: 'processed',
        notes: `Import fingerprint via web (Penanganan Duplikat: ${payload.duplicateHandling})`,
      })
      .select('id')
      .single();

    if (batchError || !batch) {
      return { success: false, error: `Gagal membuat catatan batch: ${batchError?.message}` };
    }

    // 2. Prepare attendance records to insert / upsert
    const recordsToInsert = validRows
      .filter((r) => {
        if (payload.duplicateHandling === 'skip' && r.match_status === 'duplicate') {
          return false;
        }
        return true;
      })
      .map((r) => {
        // Calculate work minutes if both clocks are available
        let workMinutes = 0;
        if (r.clock_in && r.clock_out) {
          const [inH, inM] = r.clock_in.split(':').map(Number);
          const [outH, outM] = r.clock_out.split(':').map(Number);
          const inTotal = inH * 60 + inM;
          const outTotal = outH * 60 + outM;
          if (outTotal > inTotal) {
            workMinutes = outTotal - inTotal;
          }
        }

        return {
          employee_id: r.employee_id!,
          attendance_date: r.attendance_date,
          source: 'fingerprint' as const,
          on_duty: r.on_duty || null,
          off_duty: r.off_duty || null,
          clock_in: r.clock_in || null,
          clock_out: r.clock_out || null,
          late_minutes: r.late_minutes || 0,
          early_minutes: r.early_minutes || 0,
          ot_minutes: r.ot_minutes || 0,
          work_minutes: workMinutes,
          is_absent: r.is_absent || false,
          department_raw: r.department_raw || null,
          import_batch_id: batch.id,
        };
      });

    if (recordsToInsert.length > 0) {
      // Upsert into attendance with unique constraint (employee_id, attendance_date, source)
      const { error: insertError } = await client
        .from('attendance')
        .upsert(recordsToInsert, {
          onConflict: 'employee_id,attendance_date,source',
        });

      if (insertError) {
        return { success: false, error: `Gagal menyimpan data absensi: ${insertError.message}` };
      }
    }

    revalidatePath('/attendance-management');
    revalidatePath('/my-attendance');
    return {
      success: true,
      error: null,
      inserted_count: recordsToInsert.length,
      skipped_count: validRows.length - recordsToInsert.length,
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memproses konfirmasi impor' };
  }
}

export async function getAttendanceBatches() {
  try {
    const client = getClient() || (await createClient());
    const { data, error } = await client
      .from('attendance_import_batches')
      .select(`
        *,
        uploader:employees(full_name, email)
      `)
      .order('uploaded_at', { ascending: false })
      .limit(20);

    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal mengambil riwayat impor' };
  }
}

export interface AttendanceRecordItem {
  id: string;
  employee_id: string;
  attendance_date: string;
  source: string;
  on_duty: string | null;
  off_duty: string | null;
  clock_in: string | null;
  clock_out: string | null;
  late_minutes: number;
  early_minutes: number;
  ot_minutes: number;
  work_minutes: number;
  is_absent: boolean;
  late_reason: string | null;
  late_reason_filled_at: string | null;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    division?: { name: string } | null;
  } | null;
}

export async function getAttendanceManagement(filters: {
  date?: string;
  month?: number;
  year?: number;
  divisionId?: string | 'all';
  employeeId?: string | 'all';
  page?: number;
  pageSize?: number;
}) {
  try {
    const client = getClient() || (await createClient());
    const shouldPaginate = typeof filters.page === 'number' && filters.page > 0;
    const page = shouldPaginate ? filters.page! : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50;

    let query = client
      .from('attendance')
      .select(
        `
        *,
        employee:employees!attendance_employee_id_fkey(
          id,
          full_name,
          email,
          role,
          division_id,
          division:divisions(name)
        )
      `,
        { count: 'exact' }
      )
      .order('attendance_date', { ascending: false })
      .order('clock_in', { ascending: true });

    if (filters.date) {
      query = query.eq('attendance_date', filters.date);
    } else if (filters.year && filters.month) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const lastDay = new Date(filters.year, filters.month, 0).getDate();
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
      query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
    }

    if (filters.employeeId && filters.employeeId !== 'all') {
      query = query.eq('employee_id', filters.employeeId);
    }

    if (shouldPaginate && (!filters.divisionId || filters.divisionId === 'all')) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) return { data: [], total: 0, page, pageSize, totalPages: 0, error: error.message };

    let results = (data as AttendanceRecordItem[]) || [];

    // Client-side division filtering if relation nested filter
    if (filters.divisionId && filters.divisionId !== 'all') {
      results = results.filter((r) => r.employee && (r.employee as unknown as { division_id: string }).division_id === filters.divisionId);
    }

    const total = count ?? results.length;
    const totalPages = shouldPaginate ? Math.ceil(total / pageSize) : 1;

    return {
      data: results,
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
      pageSize: 50,
      totalPages: 0,
      error: err instanceof Error ? err.message : 'Gagal mengambil data absensi',
    };
  }
}

export async function getMyAttendanceHistory(employeeEmail?: string, month?: number, year?: number) {
  try {
    const client = getClient() || (await createClient());

    // Find employee by email (or first admin if dev preview)
    let empQuery = client.from('employees').select('id, full_name, email');
    if (employeeEmail) {
      empQuery = empQuery.ilike('email', employeeEmail.trim());
    }
    const { data: emp } = await empQuery.limit(1).maybeSingle();

    if (!emp) {
      return { employee: null, data: [], summary: null, error: 'Data karyawan tidak ditemukan' };
    }

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;

    const { data, error } = await client
      .from('attendance')
      .select('*')
      .eq('employee_id', emp.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    if (error) return { employee: emp, data: [], summary: null, error: error.message };

    const records = (data as AttendanceRecordItem[]) || [];

    // Calculate personal summary
    const presentDays = records.filter((r) => r.clock_in && !r.is_absent).length;
    const onTimeDays = records.filter((r) => r.clock_in && r.late_minutes === 0 && !r.is_absent).length;
    const lateDays = records.filter((r) => r.late_minutes > 0).length;
    const totalLateMinutes = records.reduce((acc, r) => acc + (r.late_minutes || 0), 0);
    const absentDays = records.filter((r) => r.is_absent).length;

    return {
      employee: emp,
      data: records,
      summary: {
        presentDays,
        onTimeDays,
        lateDays,
        totalLateMinutes,
        absentDays,
      },
      error: null,
    };
  } catch (err: unknown) {
    return { employee: null, data: [], summary: null, error: err instanceof Error ? err.message : 'Gagal memuat presensi' };
  }
}

export async function fillLateReason(attendanceId: string, lateReason: string) {
  try {
    const client = getClient() || (await createClient());

    const currentEmp = await getAuthenticatedEmployee(client);
    if (!currentEmp) {
      return { success: false, error: 'Tidak terotentikasi. Silakan login terlebih dahulu.' };
    }

    // Verify ownership or administrative privilege
    const { data: record, error: recError } = await client
      .from('attendance')
      .select('employee_id')
      .eq('id', attendanceId)
      .maybeSingle();

    if (recError || !record) {
      return { success: false, error: 'Data absensi tidak ditemukan.' };
    }

    const isOwner = record.employee_id === currentEmp.id;
    const isPrivileged = ['admin', 'hr', 'management'].includes(currentEmp.role);

    if (!isOwner && !isPrivileged) {
      return {
        success: false,
        error: 'Akses ditolak. Anda hanya dapat mengisi alasan keterlambatan untuk data absensi Anda sendiri.',
      };
    }

    const { error } = await client
      .from('attendance')
      .update({
        late_reason: lateReason.trim(),
        late_reason_filled_at: new Date().toISOString(),
      })
      .eq('id', attendanceId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/my-attendance');
    revalidatePath('/attendance-management');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menyimpan alasan keterlambatan' };
  }
}
