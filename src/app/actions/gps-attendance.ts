'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  findClosestOffice,
  isGpsAccuracyAcceptable,
  OfficeLocationGeo,
} from '@/lib/geo/haversine';
import { AttendanceReviewStatus } from '@/types/database';
import { checkClockInRateLimit } from '@/lib/rate-limiter';
import { sanitizeText } from '@/lib/security';
import { logAuditEvent } from '@/lib/audit';

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export interface GpsClockInPayload {
  employeeEmail?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceInfo?: string;
  notes?: string;
  isMockLocation?: boolean;
  recordedAt?: string;
}

export interface GpsClockOutPayload {
  employeeEmail?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceInfo?: string;
  recordedAt?: string;
}

export async function getTodayGpsStatus(employeeEmail?: string) {
  try {
    const client = getClient() || (await createClient());

    // 1. Resolve employee
    let empQuery = client.from('employees').select('id, full_name, email, role, work_schedule_id');
    if (employeeEmail) {
      empQuery = empQuery.ilike('email', employeeEmail.trim());
    }
    const { data: emp, error: empError } = await empQuery.limit(1).maybeSingle();

    if (empError || !emp) {
      return { employee: null, attendance: null, officeLocations: [], error: 'Karyawan tidak ditemukan' };
    }

    // 2. Fetch today's attendance (source = app_fallback)
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance, error: attError } = await client
      .from('attendance')
      .select('*, office:office_locations(name, address, radius_meters)')
      .eq('employee_id', emp.id)
      .eq('attendance_date', today)
      .eq('source', 'app_fallback')
      .maybeSingle();

    // 3. Fetch active office locations
    const { data: locations } = await client
      .from('office_locations')
      .select('id, name, address, latitude, longitude, radius_meters, is_active')
      .eq('is_active', true);

    return {
      employee: emp,
      attendance: attendance || null,
      officeLocations: (locations as OfficeLocationGeo[]) || [],
      error: null,
    };
  } catch (err: unknown) {
    return {
      employee: null,
      attendance: null,
      officeLocations: [],
      error: err instanceof Error ? err.message : 'Gagal memuat status GPS hari ini',
    };
  }
}

export async function submitGpsClockIn(payload: GpsClockInPayload) {
  try {
    // 1. Validate GPS Accuracy
    if (!isGpsAccuracyAcceptable(payload.accuracy)) {
      return {
        success: false,
        error: `Akurasi GPS terlalu rendah (±${Math.round(payload.accuracy)}m). Sistem mewajibkan akurasi di bawah 100m. Silakan berpindah ke area terbuka atau nyalakan akurasi tinggi pada ponsel Anda.`,
      };
    }

    const client = getClient() || (await createClient());

    // 2. Resolve employee
    let empQuery = client.from('employees').select('id, full_name, email, role, work_schedule_id');
    if (payload.employeeEmail) {
      empQuery = empQuery.ilike('email', payload.employeeEmail.trim());
    }
    const { data: emp } = await empQuery.limit(1).maybeSingle();

    if (!emp) {
      return { success: false, error: 'Data karyawan tidak ditemukan untuk presensi ini.' };
    }

    // Rate Limiting Check
    const rateLimit = checkClockInRateLimit(emp.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    const punchDate = payload.recordedAt ? new Date(payload.recordedAt) : new Date();
    const today = punchDate.toISOString().split('T')[0];

    // 3. Check if already clocked in today
    const { data: existing } = await client
      .from('attendance')
      .select('id, clock_in')
      .eq('employee_id', emp.id)
      .eq('attendance_date', today)
      .eq('source', 'app_fallback')
      .maybeSingle();

    if (existing && existing.clock_in) {
      return {
        success: false,
        error: `Anda sudah melakukan Clock In hari ini pada jam ${existing.clock_in}.`,
      };
    }

    // 4. Fetch active office locations and calculate geofence
    const { data: locations } = await client
      .from('office_locations')
      .select('id, name, address, latitude, longitude, radius_meters, is_active')
      .eq('is_active', true);

    const geoLocations = (locations as OfficeLocationGeo[]) || [];
    if (geoLocations.length === 0) {
      return {
        success: false,
        error: 'Belum ada lokasi kantor cabang yang aktif terdaftar di sistem. Hubungi Administrator.',
      };
    }

    const closestResult = findClosestOffice(
      { latitude: payload.latitude, longitude: payload.longitude },
      geoLocations
    );

    if (!closestResult.office) {
      return { success: false, error: 'Tidak dapat menentukan lokasi kantor terdekat.' };
    }

    const isInsideRadius = closestResult.isWithinRadius;
    const reviewStatus: AttendanceReviewStatus = isInsideRadius ? 'auto_valid' : 'pending_review';

    // 5. Calculate Current Time and Late Minutes
    const now = punchDate;
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentSeconds = String(now.getSeconds()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}:${currentSeconds}`;

    // Sanitize input notes & append offline sync audit note if applicable
    let cleanNotes = sanitizeText(payload.notes);
    if (payload.recordedAt) {
      const syncTimeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });
      const offlineTag = `[Sync Offline PWA: Dicatat ${currentTimeStr}, sinkronisasi online ${syncTimeStr}]`;
      cleanNotes = cleanNotes ? `${offlineTag} ${cleanNotes}` : offlineTag;
    }

    // If outside radius and no notes provided, encourage or require notes
    if (!isInsideRadius && cleanNotes.length === 0) {
      return {
        success: false,
        error: `Anda berada di luar radius kantor (${closestResult.distanceMeters}m dari ${closestResult.office.name}, batas: ${closestResult.office.radius_meters}m). Wajib mencantumkan catatan tugas/kegiatan luar kantor.`,
      };
    }

    let lateMinutes = 0;
    // Check schedule for today
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    if (emp.work_schedule_id) {
      const { data: scheduleDay } = await client
        .from('work_schedule_days')
        .select('*')
        .eq('group_id', emp.work_schedule_id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      if (scheduleDay && scheduleDay.start_time && !scheduleDay.is_day_off) {
        const [schH, schM] = scheduleDay.start_time.split(':').map(Number);
        const schMinutes = schH * 60 + schM;
        const curMinutes = now.getHours() * 60 + now.getMinutes();
        if (curMinutes > schMinutes) {
          lateMinutes = curMinutes - schMinutes;
        }
      }
    }

    // 6. Build and Upsert Attendance Record
    const attendanceRecord = {
      employee_id: emp.id,
      attendance_date: today,
      source: 'app_fallback',
      clock_in: currentTimeStr,
      late_minutes: lateMinutes,
      early_minutes: 0,
      work_minutes: 0,
      is_absent: false,
      office_location_id: closestResult.office.id,
      submitted_latitude: payload.latitude,
      submitted_longitude: payload.longitude,
      gps_accuracy_meters: payload.accuracy,
      distance_to_office_meters: closestResult.distanceMeters,
      review_status: reviewStatus,
      device_info: sanitizeText(payload.deviceInfo) || 'Web Browser',
      is_mock_location: payload.isMockLocation || false,
      late_reason: cleanNotes || null,
      late_reason_filled_at: cleanNotes ? now.toISOString() : null,
    };

    const { data: inserted, error: insertError } = await client
      .from('attendance')
      .upsert(attendanceRecord, {
        onConflict: 'employee_id,attendance_date,source',
      })
      .select('*')
      .single();

    if (insertError) {
      return { success: false, error: `Gagal menyimpan presensi GPS: ${insertError.message}` };
    }

    // Audit Logging
    await logAuditEvent({
      actorId: emp.id,
      action: 'gps_clock_in',
      entityType: 'attendance',
      entityId: inserted.id,
      metadata: {
        office: closestResult.office.name,
        distanceMeters: closestResult.distanceMeters,
        isInsideRadius,
        lateMinutes,
      },
    });

    // If late, dispatch in-app notification to employee
    if (lateMinutes > 0 && emp?.id) {
      await client.from('notifications').insert({
        employee_id: emp.id,
        type: 'attendance_late',
        title: 'Pemberitahuan Keterlambatan Presensi',
        message: `Presensi masuk Anda tercatat terlambat ${lateMinutes} menit pada ${today}. Harap ajukan form permohonan jika keterlambatan memiliki alasan sah.`,
        action_url: '/requests',
        related_entity_type: 'attendance',
        related_entity_id: inserted?.id || null,
        is_read: false,
      });
    }

    revalidatePath('/clock-in');
    revalidatePath('/my-attendance');
    revalidatePath('/attendance-management');
    revalidatePath('/notifications');

    return {
      success: true,
      error: null,
      data: {
        record: inserted,
        officeName: closestResult.office.name,
        distanceMeters: closestResult.distanceMeters,
        radiusMeters: closestResult.office.radius_meters,
        isInsideRadius,
        reviewStatus,
        clockInTime: currentTimeStr,
        lateMinutes,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kegagalan saat memproses Clock In GPS',
    };
  }
}

export async function submitGpsClockOut(payload: GpsClockOutPayload) {
  try {
    const client = getClient() || (await createClient());

    // 1. Resolve employee
    let empQuery = client.from('employees').select('id, full_name, email');
    if (payload.employeeEmail) {
      empQuery = empQuery.ilike('email', payload.employeeEmail.trim());
    }
    const { data: emp } = await empQuery.limit(1).maybeSingle();

    if (!emp) {
      return { success: false, error: 'Data karyawan tidak ditemukan.' };
    }

    // Rate Limiting Check
    const rateLimit = checkClockInRateLimit(emp.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    const punchDate = payload.recordedAt ? new Date(payload.recordedAt) : new Date();
    const today = punchDate.toISOString().split('T')[0];

    // 2. Find today's clock in record
    const { data: attendance, error: attError } = await client
      .from('attendance')
      .select('*')
      .eq('employee_id', emp.id)
      .eq('attendance_date', today)
      .eq('source', 'app_fallback')
      .maybeSingle();

    if (attError || !attendance || !attendance.clock_in) {
      return {
        success: false,
        error: 'Anda belum tercatat melakukan Clock In hari ini. Silakan Clock In terlebih dahulu.',
      };
    }

    if (attendance.clock_out) {
      return {
        success: false,
        error: `Anda sudah melakukan Clock Out hari ini pada jam ${attendance.clock_out}.`,
      };
    }

    // 3. Compute clock out time and work minutes
    const now = punchDate;
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentSeconds = String(now.getSeconds()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}:${currentSeconds}`;

    const [inH, inM] = attendance.clock_in.split(':').map(Number);
    const inTotalMinutes = inH * 60 + inM;
    const outTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const workMinutes = Math.max(0, outTotalMinutes - inTotalMinutes);

    // 4. Update attendance record
    const { error: updateError } = await client
      .from('attendance')
      .update({
        clock_out: currentTimeStr,
        work_minutes: workMinutes,
      })
      .eq('id', attendance.id);

    if (updateError) {
      return { success: false, error: `Gagal memperbarui Clock Out: ${updateError.message}` };
    }

    // Audit Logging
    await logAuditEvent({
      actorId: emp.id,
      action: 'gps_clock_out',
      entityType: 'attendance',
      entityId: attendance.id,
      metadata: {
        workMinutes,
        clockOutTime: currentTimeStr,
      },
    });

    revalidatePath('/clock-in');
    revalidatePath('/my-attendance');
    revalidatePath('/attendance-management');

    return {
      success: true,
      error: null,
      data: {
        clockOutTime: currentTimeStr,
        workMinutes,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kegagalan saat memproses Clock Out GPS',
    };
  }
}

export async function getPendingGpsAttendanceList() {
  try {
    const client = getClient() || (await createClient());

    const { data, error } = await client
      .from('attendance')
      .select(`
        *,
        employee:employees!attendance_employee_id_fkey(
          id,
          full_name,
          email,
          role,
          nik,
          division:divisions(name)
        ),
        office:office_locations(
          name,
          address,
          radius_meters
        ),
        reviewer:employees!attendance_reviewed_by_fkey(
          full_name,
          email
        )
      `)
      .eq('source', 'app_fallback')
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal memuat daftar review GPS' };
  }
}

export async function reviewGpsAttendance(
  attendanceId: string,
  decision: 'approved' | 'rejected',
  notes?: string
) {
  try {
    const client = getClient() || (await createClient());

    // Resolve reviewer (current admin/hr)
    const { data: adminEmp } = await client
      .from('employees')
      .select('id')
      .in('role', ['admin', 'hr', 'management'])
      .limit(1)
      .single();

    const reviewerId = adminEmp?.id || null;

    const { error } = await client
      .from('attendance')
      .update({
        review_status: decision,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', attendanceId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/attendance-management');
    revalidatePath('/my-attendance');
    revalidatePath('/clock-in');

    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memperbarui status review presensi',
    };
  }
}
