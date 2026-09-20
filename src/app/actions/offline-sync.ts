'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { submitGpsClockIn, submitGpsClockOut } from '@/app/actions/gps-attendance';
import { createLeaveOrPermitRequest } from '@/app/actions/requests';
import { logAuditEvent } from '@/lib/audit';

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export interface SyncAttendanceItemInput {
  id: string;
  type: 'clock_in' | 'clock_out';
  employeeEmail?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceInfo?: string;
  notes?: string;
  recordedAt: string;
}

export interface SyncRequestItemInput {
  id: string;
  employeeEmail: string;
  requestTypeId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isHalfDay: boolean;
  reason: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    base64: string;
  }>;
}

/**
 * Server action to synchronize a single queued offline attendance item.
 */
export async function syncOfflineAttendanceItem(payload: SyncAttendanceItemInput): Promise<{
  success: boolean;
  id: string;
  error?: string;
  message?: string;
}> {
  try {
    if (payload.type === 'clock_in') {
      const res = await submitGpsClockIn({
        employeeEmail: payload.employeeEmail,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        deviceInfo: payload.deviceInfo,
        notes: payload.notes,
        recordedAt: payload.recordedAt,
      });

      if (!res.success) {
        // If error is duplicate clock-in, we consider it already synced
        if (res.error?.includes('sudah melakukan Clock In')) {
          return { success: true, id: payload.id, message: 'Presensi masuk sudah tercatat sebelumnya.' };
        }
        return { success: false, id: payload.id, error: res.error || undefined };
      }

      await logAuditEvent({
        action: 'offline_attendance_synced',
        entityType: 'attendance',
        entityId: res.data?.record?.id || undefined,
        metadata: {
          originalRecordedAt: payload.recordedAt,
          type: 'clock_in',
          office: res.data?.officeName,
        },
      });

      return {
        success: true,
        id: payload.id,
        message: `Clock In offline (${res.data?.clockInTime}) berhasil disinkronkan ke server!`,
      };
    } else {
      const res = await submitGpsClockOut({
        employeeEmail: payload.employeeEmail,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        deviceInfo: payload.deviceInfo,
        recordedAt: payload.recordedAt,
      });

      if (!res.success) {
        if (res.error?.includes('sudah melakukan Clock Out')) {
          return { success: true, id: payload.id, message: 'Presensi pulang sudah tercatat sebelumnya.' };
        }
        return { success: false, id: payload.id, error: res.error || undefined };
      }

      await logAuditEvent({
        action: 'offline_attendance_synced',
        entityType: 'attendance',
        entityId: payload.id,
        metadata: {
          originalRecordedAt: payload.recordedAt,
          type: 'clock_out',
        },
      });

      return {
        success: true,
        id: payload.id,
        message: `Clock Out offline (${res.data?.clockOutTime}) berhasil disinkronkan ke server!`,
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      id: payload.id,
      error: err instanceof Error ? err.message : 'Gagal memproses sinkronisasi item presensi',
    };
  }
}

/**
 * Server action to synchronize a queued offline leave/permit request.
 */
export async function syncOfflineRequestItem(payload: SyncRequestItemInput): Promise<{
  success: boolean;
  id: string;
  error?: string;
  message?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('employeeEmail', payload.employeeEmail);
    formData.append('request_type_id', payload.requestTypeId);
    formData.append('start_date', payload.startDate);
    formData.append('end_date', payload.endDate || payload.startDate);
    if (payload.startTime) formData.append('start_time', payload.startTime);
    if (payload.endTime) formData.append('end_time', payload.endTime);
    formData.append('is_half_day', payload.isHalfDay ? 'true' : 'false');
    formData.append(
      'reason',
      `[Sinkronisasi Offline PWA] ${payload.reason}`
    );

    // Convert base64 files back to File objects if present
    if (payload.files && payload.files.length > 0) {
      for (let i = 0; i < payload.files.length; i++) {
        const fileObj = payload.files[i];
        try {
          const byteString = atob(fileObj.base64.split(',')[1] || fileObj.base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
          }
          const blob = new Blob([ab], { type: fileObj.type });
          formData.append(`file_${i}`, blob, fileObj.name);
        } catch (fErr) {
          console.warn('[OfflineSync] Failed to decode base64 file:', fErr);
        }
      }
    }

    const res = await createLeaveOrPermitRequest(formData);

    if (!res.success) {
      return { success: false, id: payload.id, error: res.error || undefined };
    }

    await logAuditEvent({
      action: 'offline_request_synced',
      entityType: 'request',
      entityId: res.requestId || undefined,
      metadata: {
        offlineRequestId: payload.id,
        requestTypeId: payload.requestTypeId,
      },
    });

    return {
      success: true,
      id: payload.id,
      message: 'Pengajuan cuti/izin offline berhasil disinkronkan ke server!',
    };
  } catch (err: unknown) {
    return {
      success: false,
      id: payload.id,
      error: err instanceof Error ? err.message : 'Gagal memproses sinkronisasi pengajuan',
    };
  }
}
