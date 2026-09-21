'use server';

import { getActionClient } from '@/lib/supabase/action-client';
import { revalidatePath } from 'next/cache';
import { RequestItem, LeaveBalance, RequestType } from '@/types/database';
import { sanitizeText, sanitizeFileName } from '@/lib/security';
import { checkFileUploadRateLimit } from '@/lib/rate-limiter';
import { logAuditEvent } from '@/lib/audit';

import { getAuthenticatedEmployee } from '@/lib/auth';

/**
 * Retrieves the annual leave balance for an employee, automatically creating it if missing.
 */
export async function getEmployeeLeaveBalance(
  employeeId?: string,
  year: number = new Date().getFullYear(),
  employeeEmail?: string
): Promise<{ data: LeaveBalance | null; error: string | null }> {
  try {
    const client = await getActionClient();

    let targetEmpId = employeeId;
    let targetEmp: any = null;

    if (!targetEmpId) {
      targetEmp = await getAuthenticatedEmployee(client, employeeEmail);
      targetEmpId = targetEmp?.id;
    } else {
      const { data } = await client
        .from('employees')
        .select('id, full_name, email, role, join_date')
        .eq('id', targetEmpId)
        .maybeSingle();
      targetEmp = data;
    }

    if (!targetEmpId) {
      return { data: null, error: 'Karyawan tidak ditemukan.' };
    }

    // Lookup cuti_tahunan request_type
    const { data: cutiTahunanType } = await client
      .from('request_types')
      .select('id, code, name')
      .eq('code', 'cuti_tahunan')
      .maybeSingle();

    if (!cutiTahunanType) {
      return { data: null, error: 'Jenis pengajuan cuti tahunan belum dikonfigurasi.' };
    }

    // Lookup existing leave balance
    const { data: balance, error: balError } = await client
      .from('leave_balances')
      .select('*')
      .eq('employee_id', targetEmpId)
      .eq('year', year)
      .eq('request_type_id', cutiTahunanType.id)
      .maybeSingle();

    if (balError) {
      return { data: null, error: balError.message };
    }

    if (balance) {
      const quota = Number(balance.quota) || 0;
      const used = Number(balance.used) || 0;
      const adjustment = Number(balance.adjustment) || 0;
      const carryOver = Number(balance.carry_over) || 0;
      const remaining = Math.max(0, quota + carryOver + adjustment - used);

      return {
        data: {
          ...balance,
          quota,
          used,
          adjustment,
          carry_over: carryOver,
          remaining,
          request_type: cutiTahunanType,
        },
        error: null,
      };
    }

    // Auto-generate leave balance for this year
    let initialQuota = 12;
    if (targetEmp?.join_date) {
      const join = new Date(targetEmp.join_date);
      if (join.getFullYear() === year) {
        // Prorata: remaining months in the year
        const joinMonth = join.getMonth() + 1; // 1-12
        initialQuota = Math.max(1, 12 - joinMonth + 1);
      }
    }

    const { data: newBalance, error: insertError } = await client
      .from('leave_balances')
      .insert({
        employee_id: targetEmpId,
        year,
        request_type_id: cutiTahunanType.id,
        quota: initialQuota,
        used: 0,
        adjustment: 0,
        carry_over: 0,
      })
      .select('*')
      .single();

    if (insertError) {
      return { data: null, error: insertError.message };
    }

    return {
      data: {
        ...newBalance,
        remaining: initialQuota,
        request_type: cutiTahunanType,
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Gagal memuat saldo cuti.',
    };
  }
}

/**
 * Calculates working days between two dates, excluding Sundays and company/national holidays.
 */
export async function calculateWorkingDays(startDateStr: string, endDateStr?: string | null) {
  try {
    const client = await getActionClient();
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date(startDateStr);

    if (end < start) return 0;

    // Fetch holidays within the range
    const { data: holidays } = await client
      .from('holidays')
      .select('holiday_date')
      .gte('holiday_date', startDateStr)
      .lte('holiday_date', endDateStr || startDateStr);

    const holidaySet = new Set((holidays || []).map((h: any) => h.holiday_date));

    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dayOfWeek = cur.getDay(); // 0 = Sunday
      const dateString = cur.toISOString().split('T')[0];

      // Exclude Sunday (0) and registered holidays
      if (dayOfWeek !== 0 && !holidaySet.has(dateString)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    return count;
  } catch {
    return 1;
  }
}

/**
 * Submits a new leave or permit request with multi-file upload & parallel approval routing.
 */
export async function createLeaveOrPermitRequest(formData: FormData) {
  try {
    const client = await getActionClient();

    const employeeEmail = formData.get('employeeEmail') as string | null;
    const requestTypeId = formData.get('request_type_id') as string;
    const startDate = formData.get('start_date') as string;
    const endDate = (formData.get('end_date') as string) || startDate;
    const startTime = (formData.get('start_time') as string) || null;
    const endTime = (formData.get('end_time') as string) || null;
    const rawReason = formData.get('reason') as string;
    const reason = sanitizeText(rawReason);
    const isHalfDay = formData.get('is_half_day') === 'true';

    if (!requestTypeId || !startDate || !reason) {
      return { success: false, error: 'Mohon lengkapi jenis pengajuan, tanggal, dan alasan.' };
    }

    const employee = await getAuthenticatedEmployee(client, employeeEmail || undefined);
    if (!employee) {
      return { success: false, error: 'Data karyawan tidak ditemukan.' };
    }

    // Rate limiting check
    const rateLimit = checkFileUploadRateLimit(employee.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    // 1. Lookup request type
    const { data: reqType, error: rtErr } = await client
      .from('request_types')
      .select('*')
      .eq('id', requestTypeId)
      .maybeSingle();

    if (rtErr || !reqType) {
      return { success: false, error: 'Jenis pengajuan tidak valid atau sudah tidak aktif.' };
    }

    // 2. Calculate total days
    let totalDays = 1;
    if (isHalfDay) {
      totalDays = 0.5;
    } else {
      totalDays = await calculateWorkingDays(startDate, endDate);
      if (totalDays <= 0) {
        return {
          success: false,
          error: 'Rentang tanggal yang dipilih berada pada hari libur / non-kerja.',
        };
      }
    }

    // 3. Quota check if deducts_leave_quota
    if (reqType.deducts_leave_quota) {
      const year = new Date(startDate).getFullYear();
      const { data: balance } = await getEmployeeLeaveBalance(employee.id, year);

      if (!balance || (balance.remaining ?? 0) < totalDays) {
        return {
          success: false,
          error: `Sisa kuota cuti tahunan tidak mencukupi (Tersedia: ${balance?.remaining ?? 0} hari, Dibutuhkan: ${totalDays} hari).`,
        };
      }
    }

    // 4. File attachments validation
    const uploadedFiles: File[] = [];
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`file_${i}`) as File | null;
      if (file && file.size > 0 && file.name && file.name !== 'undefined') {
        uploadedFiles.push(file);
      }
    }

    if (reqType.requires_attachment && uploadedFiles.length === 0) {
      return {
        success: false,
        error: `Pengajuan '${reqType.name}' mewajibkan dokumen pendukung (Surat Dokter / Undangan / Bukti Resmi).`,
      };
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    for (const f of uploadedFiles) {
      if (f.size > 5 * 1024 * 1024) {
        return { success: false, error: `Ukuran file ${f.name} melebihi batas 5MB.` };
      }
      if (!allowedMimes.includes(f.type)) {
        return {
          success: false,
          error: `Format file ${f.name} tidak didukung. Harap unggah JPG, PNG, atau PDF.`,
        };
      }
    }

    // 5. Insert Request Record
    const { data: newRequest, error: reqError } = await client
      .from('requests')
      .insert({
        request_type_id: reqType.id,
        employee_id: employee.id,
        created_by: employee.id,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime ? `${startTime}:00` : null,
        end_time: endTime ? `${endTime}:00` : null,
        total_days: totalDays,
        reason,
        status: 'pending',
      })
      .select('id')
      .single();

    if (reqError || !newRequest) {
      return { success: false, error: `Gagal menyimpan permohonan: ${reqError?.message}` };
    }

    // 6. Upload files to Storage bucket 'leave-attachments' & insert request_attachments
    for (const file of uploadedFiles) {
      const cleanName = sanitizeFileName(file.name);
      const storagePath = `requests/${newRequest.id}/${Date.now()}_${cleanName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadErr } = await client.storage
        .from('leave-attachments')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadErr) {
        const { data: publicUrlData } = client.storage
          .from('leave-attachments')
          .getPublicUrl(storagePath);

        await client.from('request_attachments').insert({
          request_id: newRequest.id,
          file_name: cleanName,
          file_url: publicUrlData.publicUrl,
          file_size_bytes: file.size,
          mime_type: file.type,
        });
      }
    }

    // 7. Route Parallel Approvers according to hris_approval_flow.md
    // - Staff: SPV (via employee.spv_id) + HR
    // - SPV: Kepala Divisi (via divisions.kepala_divisi_id) + HR
    // - Kepala Divisi: Management + HR
    // - HR / Management / Admin: Management or auto-skip
    const approvers: Array<{ id: string; role: string }> = [];

    // Hierarchical Approver lookup
    if (employee.role === 'staff') {
      if (employee.spv_id) {
        approvers.push({ id: employee.spv_id, role: 'spv' });
      } else if (employee.division_id) {
        const { data: div } = await client
          .from('divisions')
          .select('kepala_divisi_id')
          .eq('id', employee.division_id)
          .maybeSingle();
        if (div?.kepala_divisi_id) {
          approvers.push({ id: div.kepala_divisi_id, role: 'kepala_divisi' });
        }
      }
    } else if (employee.role === 'spv') {
      if (employee.division_id) {
        const { data: div } = await client
          .from('divisions')
          .select('kepala_divisi_id')
          .eq('id', employee.division_id)
          .maybeSingle();
        if (div?.kepala_divisi_id) {
          approvers.push({ id: div.kepala_divisi_id, role: 'kepala_divisi' });
        }
      }
    } else if (employee.role === 'kepala_divisi') {
      const { data: mgmt } = await client
        .from('employees')
        .select('id')
        .eq('role', 'management')
        .limit(1)
        .maybeSingle();
      if (mgmt?.id) {
        approvers.push({ id: mgmt.id, role: 'management' });
      }
    }

    // HR Parallel Approver (Pick primary active HR / Admin)
    const { data: hrEmp } = await client
      .from('employees')
      .select('id')
      .in('role', ['hr', 'admin'])
      .order('role', { ascending: true }) // 'admin' or 'hr'
      .limit(1)
      .maybeSingle();

    if (hrEmp?.id && !approvers.some((a) => a.id === hrEmp.id)) {
      approvers.push({ id: hrEmp.id, role: 'hr' });
    }

    // Fallback: If no approvers found (e.g. initial setup), assign to first admin
    if (approvers.length === 0) {
      const { data: anyAdmin } = await client
        .from('employees')
        .select('id, role')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();
      if (anyAdmin?.id) {
        approvers.push({ id: anyAdmin.id, role: anyAdmin.role });
      }
    }

    // Insert into request_approvals with auto-skip rule
    for (const approver of approvers) {
      const isAutoSkip = approver.id === employee.id;
      await client.from('request_approvals').insert({
        request_id: newRequest.id,
        approver_id: approver.id,
        approver_role: approver.role,
        decision: isAutoSkip ? 'approved' : 'pending',
        decided_at: isAutoSkip ? new Date().toISOString() : null,
        note: isAutoSkip ? 'Auto-approved (pembuat pengajuan adalah approver)' : null,
      });
    }

    // Dispatch notification to approvers
    for (const approver of approvers) {
      if (approver.id !== employee.id) {
        await client.from('notifications').insert({
          employee_id: approver.id,
          type: 'request_submitted',
          title: 'Pengajuan Baru Menunggu Persetujuan',
          message: `${employee.full_name} mengajukan ${reqType.name} (${totalDays} hari) mulai ${startDate}.`,
          action_url: '/approvals',
          related_entity_type: 'requests',
          related_entity_id: newRequest.id,
          is_read: false,
        });
      }
    }

    // Check if all are already auto-approved
    const { data: allApprovals } = await client
      .from('request_approvals')
      .select('decision')
      .eq('request_id', newRequest.id);

    const allApproved =
      allApprovals &&
      allApprovals.length > 0 &&
      allApprovals.every((a: any) => a.decision === 'approved');

    if (allApproved) {
      await client
        .from('requests')
        .update({ status: 'approved', decided_at: new Date().toISOString() })
        .eq('id', newRequest.id);

      // Deduct quota if deducts_leave_quota
      if (reqType.deducts_leave_quota) {
        const year = new Date(startDate).getFullYear();
        const { data: curBal } = await client
          .from('leave_balances')
          .select('id, used')
          .eq('employee_id', employee.id)
          .eq('year', year)
          .eq('request_type_id', reqType.id)
          .maybeSingle();

        if (curBal) {
          await client
            .from('leave_balances')
            .update({ used: Number(curBal.used || 0) + totalDays })
            .eq('id', curBal.id);
        }
      }

      // Notify requester of auto-approval
      await client.from('notifications').insert({
        employee_id: employee.id,
        type: 'request_approved',
        title: 'Pengajuan Anda Telah Disetujui',
        message: `Pengajuan ${reqType.name} (${startDate}) telah disetujui secara otomatis.`,
        action_url: '/requests',
        related_entity_type: 'requests',
        related_entity_id: newRequest.id,
        is_read: false,
      });
    }

    // Record Audit Log
    await logAuditEvent({
      actorId: employee.id,
      action: 'create_request',
      entityType: 'requests',
      entityId: newRequest.id,
      metadata: {
        requestType: reqType.name,
        startDate,
        endDate,
        totalDays,
      },
    });

    revalidatePath('/requests');
    revalidatePath('/approvals');
    revalidatePath('/dashboard');

    return {
      success: true,
      requestId: newRequest.id,
      message: 'Permohonan cuti/izin berhasil diajukan dan sedang menunggu persetujuan.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kegagalan saat membuat pengajuan.',
    };
  }
}

/**
 * Fetches requests made by the current user with detailed approval statuses and attachments.
 */
export async function getMyRequests(filters?: {
  status?: string;
  category?: string;
  employeeEmail?: string;
}): Promise<{ data: RequestItem[]; error: string | null }> {
  try {
    const client = await getActionClient();
    const employee = await getAuthenticatedEmployee(client, filters?.employeeEmail);

    if (!employee) return { data: [], error: 'Karyawan tidak ditemukan.' };

    let query = client
      .from('requests')
      .select(`
        *,
        request_type:request_types(*),
        attachments:request_attachments(*),
        approvals:request_approvals(
          id,
          approver_id,
          approver_role,
          decision,
          note,
          decided_at,
          approver:employees(id, full_name, email, role)
        )
      `)
      .eq('employee_id', employee.id)
      .order('submitted_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    // Client-side filter for category if specified
    let results = (data as RequestItem[]) || [];
    if (filters?.category && filters.category !== 'all') {
      results = results.filter((r) => r.request_type?.category === filters.category);
    }

    return { data: results, error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat daftar pengajuan.',
    };
  }
}

/**
 * Cancels a pending request submitted by the employee.
 */
export async function cancelMyRequest(
  requestId: string,
  reason?: string,
  employeeEmail?: string
) {
  try {
    const client = await getActionClient();
    const employee = await getAuthenticatedEmployee(client, employeeEmail);

    if (!employee) return { success: false, error: 'Karyawan tidak terverifikasi.' };

    const { data: request, error: fetchErr } = await client
      .from('requests')
      .select('id, employee_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchErr || !request) {
      return { success: false, error: 'Pengajuan tidak ditemukan.' };
    }

    if (request.employee_id !== employee.id && employee.role !== 'admin') {
      return { success: false, error: 'Anda tidak memiliki otoritas membatalkan pengajuan ini.' };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: `Pengajuan tidak dapat dibatalkan karena status sudah '${request.status}'.`,
      };
    }

    const cleanReason = sanitizeText(reason) || 'Dibatalkan oleh pemohon';

    const { error: updateErr } = await client
      .from('requests')
      .update({
        status: 'cancelled',
        cancelled_by: employee.id,
        cancelled_at: new Date().toISOString(),
        cancel_reason: cleanReason,
      })
      .eq('id', requestId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Record Audit Log
    await logAuditEvent({
      actorId: employee.id,
      action: 'cancel_request',
      entityType: 'requests',
      entityId: requestId,
      metadata: {
        cancelReason: cleanReason,
      },
    });

    revalidatePath('/requests');
    revalidatePath('/approvals');
    revalidatePath('/dashboard');

    return { success: true, message: 'Pengajuan berhasil dibatalkan.' };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal membatalkan pengajuan.',
    };
  }
}

/**
 * Retrieves a single request with full attachments and approvals breakdown.
 */
export async function getRequestDetails(requestId: string): Promise<{ data: RequestItem | null; error: string | null }> {
  try {
    const client = await getActionClient();

    const { data, error } = await client
      .from('requests')
      .select(`
        *,
        employee:employees!requests_employee_id_fkey(
          id,
          full_name,
          email,
          role,
          photo_url,
          division:divisions(id, name)
        ),
        request_type:request_types(*),
        attachments:request_attachments(*),
        approvals:request_approvals(
          id,
          approver_id,
          approver_role,
          decision,
          note,
          decided_at,
          approver:employees(id, full_name, email, role, photo_url)
        )
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as RequestItem) || null, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Gagal memuat detail pengajuan.',
    };
  }
}
