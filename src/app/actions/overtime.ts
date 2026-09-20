'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { RequestItem, Employee } from '@/types/database';

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function getAuthenticatedEmployee(client: any, employeeEmail?: string) {
  let emp = null;

  if (employeeEmail) {
    const { data } = await client
      .from('employees')
      .select('id, full_name, email, role, spv_id, division_id, photo_url')
      .ilike('email', employeeEmail.trim())
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
        .select('id, full_name, email, role, spv_id, division_id, photo_url')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) {
        emp = data;
      } else {
        const { data: byEmail } = await client
          .from('employees')
          .select('id, full_name, email, role, spv_id, division_id, photo_url')
          .ilike('email', user.email)
          .maybeSingle();
        emp = byEmail;
      }
    }
  }

  if (!emp) {
    const { data: fallback } = await client
      .from('employees')
      .select('id, full_name, email, role, spv_id, division_id, photo_url')
      .limit(1)
      .maybeSingle();
    emp = fallback;
  }

  return emp;
}

/**
 * Returns subordinates that the logged-in supervisor is authorized to assign overtime to.
 * Staff returns [] (cannot assign overtime).
 */
export async function getAssignableSubordinates(supervisorEmail?: string): Promise<{
  data: Employee[];
  supervisorRole: string;
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    const supervisor = await getAuthenticatedEmployee(client, supervisorEmail);

    if (!supervisor) {
      return { data: [], supervisorRole: 'staff', error: 'Atasan tidak ditemukan.' };
    }

    if (supervisor.role === 'staff') {
      return {
        data: [],
        supervisorRole: supervisor.role,
        error: null,
      };
    }

    let query = client
      .from('employees')
      .select(`
        id,
        full_name,
        email,
        role,
        division_id,
        spv_id,
        photo_url,
        division:divisions(id, name)
      `)
      .eq('status', 'active')
      .neq('id', supervisor.id)
      .order('full_name', { ascending: true });

    if (supervisor.role === 'spv') {
      // Direct subordinates or staff in same division
      if (supervisor.division_id) {
        query = query.or(
          `spv_id.eq.${supervisor.id},and(division_id.eq.${supervisor.division_id},role.eq.staff)`
        );
      } else {
        query = query.eq('spv_id', supervisor.id);
      }
    } else if (supervisor.role === 'kepala_divisi') {
      // All employees in division
      if (supervisor.division_id) {
        query = query.eq('division_id', supervisor.division_id);
      }
    }
    // Management, HR, Admin can assign to anyone

    const { data, error } = await query;

    if (error) {
      return { data: [], supervisorRole: supervisor.role, error: error.message };
    }

    return {
      data: (data as unknown as Employee[]) || [],
      supervisorRole: supervisor.role,
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: [],
      supervisorRole: 'staff',
      error: err instanceof Error ? err.message : 'Gagal mengambil daftar bawahan.',
    };
  }
}

/**
 * Creates an overtime assignment for one or multiple subordinates.
 * Sets supervisor approval to 'approved' (auto-skip) and routes to HR for approval.
 */
export async function createOvertimeAssignment(payload: {
  employeeIds: string[];
  date: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  reason: string;
  supervisorEmail?: string;
}) {
  try {
    const client = getClient() || (await createClient());
    const supervisor = await getAuthenticatedEmployee(client, payload.supervisorEmail);

    if (!supervisor) {
      return { success: false, error: 'Data atasan pembuat tugas tidak terverifikasi.' };
    }

    if (supervisor.role === 'staff') {
      return {
        success: false,
        error: 'Staff tidak memiliki kewenangan menerbitkan surat penugasan lembur.',
      };
    }

    if (!payload.employeeIds || payload.employeeIds.length === 0) {
      return { success: false, error: 'Pilih minimal 1 karyawan yang akan ditugaskan lembur.' };
    }

    if (!payload.date || !payload.startTime || !payload.endTime || !payload.reason?.trim()) {
      return { success: false, error: 'Semua field (tanggal, jam, dan uraian tugas) wajib diisi.' };
    }

    // Calculate duration in hours
    const [startH, startM] = payload.startTime.split(':').map(Number);
    const [endH, endM] = payload.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) {
      // Overnight overtime (past midnight)
      diffMinutes += 24 * 60;
    }

    const durationHours = Number((diffMinutes / 60).toFixed(2));
    if (durationHours < 0.5) {
      return { success: false, error: 'Durasi lembur minimal adalah 30 menit (0.5 jam).' };
    }

    // Lookup 'lembur' request_type
    const { data: lemburType, error: typeErr } = await client
      .from('request_types')
      .select('id, name')
      .eq('code', 'lembur')
      .maybeSingle();

    if (typeErr || !lemburType) {
      return { success: false, error: 'Jenis pengajuan Lembur belum terdaftar di sistem.' };
    }

    // Lookup HR approver
    const { data: hrApprover } = await client
      .from('employees')
      .select('id, role')
      .in('role', ['hr', 'admin'])
      .order('role', { ascending: true })
      .limit(1)
      .maybeSingle();

    const createdIds: string[] = [];

    // Loop through each assigned subordinate
    for (const empId of payload.employeeIds) {
      // 1. Insert Request
      const { data: newReq, error: reqErr } = await client
        .from('requests')
        .insert({
          request_type_id: lemburType.id,
          employee_id: empId,
          created_by: supervisor.id,
          start_date: payload.date,
          end_date: payload.date,
          start_time: `${payload.startTime}:00`,
          end_time: `${payload.endTime}:00`,
          total_days: durationHours, // Stored as hours in numeric(5,1)
          reason: payload.reason.trim(),
          status: 'pending',
        })
        .select('id')
        .single();

      if (reqErr || !newReq) {
        console.error('Error inserting overtime request:', reqErr);
        continue;
      }

      createdIds.push(newReq.id);

      // 2. Parallel Approvals
      // Approver 1: Supervisor (Creator) -> AUTO-APPROVED!
      await client.from('request_approvals').insert({
        request_id: newReq.id,
        approver_id: supervisor.id,
        approver_role: supervisor.role,
        decision: 'approved',
        note: 'Auto-approved (atasan adalah pembuat penugasan lembur)',
        decided_at: new Date().toISOString(),
      });

      // Approver 2: HR -> Pending
      if (hrApprover && hrApprover.id !== supervisor.id) {
        await client.from('request_approvals').insert({
          request_id: newReq.id,
          approver_id: hrApprover.id,
          approver_role: hrApprover.role,
          decision: 'pending',
        });

        // Notify HR of pending overtime approval
        await client.from('notifications').insert({
          employee_id: hrApprover.id,
          type: 'overtime_assigned',
          title: 'Persetujuan Lembur Menunggu Review',
          message: `${supervisor.full_name} mengajukan penugasan lembur pada ${payload.date} (${durationHours} jam).`,
          action_url: '/approvals',
          related_entity_type: 'requests',
          related_entity_id: newReq.id,
          is_read: false,
        });
      } else if (!hrApprover) {
        // If no HR, and supervisor is admin, can mark approved immediately
        if (supervisor.role === 'admin') {
          await client
            .from('requests')
            .update({ status: 'approved', decided_at: new Date().toISOString() })
            .eq('id', newReq.id);
        }
      }

      // Notify subordinate employee
      await client.from('notifications').insert({
        employee_id: empId,
        type: 'overtime_assigned',
        title: 'Penugasan Lembur Baru',
        message: `Anda ditugaskan lembur pada ${payload.date} (${payload.startTime} - ${payload.endTime}) oleh ${supervisor.full_name}. Catatan: ${payload.reason.trim()}`,
        action_url: '/overtime',
        related_entity_type: 'requests',
        related_entity_id: newReq.id,
        is_read: false,
      });
    }

    revalidatePath('/overtime');
    revalidatePath('/approvals');
    revalidatePath('/dashboard');

    return {
      success: true,
      count: createdIds.length,
      message: `Surat tugas lembur untuk ${createdIds.length} karyawan berhasil dibuat dan diteruskan ke HR.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal membuat surat penugasan lembur.',
    };
  }
}

/**
 * Returns personal overtime assignments for the logged-in employee (staff view).
 */
export async function getMyOvertimeList(employeeEmail?: string): Promise<{
  data: RequestItem[];
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    const employee = await getAuthenticatedEmployee(client, employeeEmail);

    if (!employee) return { data: [], error: 'Karyawan tidak ditemukan.' };

    const { data: lemburType } = await client
      .from('request_types')
      .select('id')
      .eq('code', 'lembur')
      .maybeSingle();

    if (!lemburType) return { data: [], error: null };

    const { data, error } = await client
      .from('requests')
      .select(`
        *,
        employee:employees!requests_employee_id_fkey(
          id,
          full_name,
          role,
          division:divisions(name)
        ),
        created_by_user:employees!requests_created_by_fkey(
          id,
          full_name,
          role,
          photo_url,
          division:divisions(name)
        ),
        request_type:request_types(*),
        approvals:request_approvals(
          id,
          approver_role,
          decision,
          note,
          decided_at,
          approver:employees(id, full_name, role)
        )
      `)
      .eq('employee_id', employee.id)
      .eq('request_type_id', lemburType.id)
      .order('start_date', { ascending: false });

    if (error) return { data: [], error: error.message };

    return { data: (data as RequestItem[]) || [], error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat riwayat lembur pribadi.',
    };
  }
}

/**
 * Returns all overtime assignments issued by this supervisor (supervisor view).
 */
export async function getAssignedOvertimeList(supervisorEmail?: string): Promise<{
  data: RequestItem[];
  error: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    const supervisor = await getAuthenticatedEmployee(client, supervisorEmail);

    if (!supervisor) return { data: [], error: 'Atasan tidak ditemukan.' };

    const { data: lemburType } = await client
      .from('request_types')
      .select('id')
      .eq('code', 'lembur')
      .maybeSingle();

    if (!lemburType) return { data: [], error: null };

    let query = client
      .from('requests')
      .select(`
        *,
        employee:employees!requests_employee_id_fkey(
          id,
          full_name,
          role,
          photo_url,
          division:divisions(name)
        ),
        created_by_user:employees!requests_created_by_fkey(
          id,
          full_name,
          role
        ),
        request_type:request_types(*),
        approvals:request_approvals(
          id,
          approver_role,
          decision,
          note,
          decided_at,
          approver:employees(id, full_name, role)
        )
      `)
      .eq('request_type_id', lemburType.id)
      .order('start_date', { ascending: false });

    // If supervisor is not HR/Admin, only show those created by this supervisor
    if (supervisor.role !== 'admin' && supervisor.role !== 'hr') {
      query = query.eq('created_by', supervisor.id);
    }

    const { data, error } = await query;

    if (error) return { data: [], error: error.message };

    return { data: (data as RequestItem[]) || [], error: null };
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Gagal memuat penugasan lembur tim.',
    };
  }
}

/**
 * Cancels a pending overtime assignment.
 */
export async function cancelOvertimeAssignment(requestId: string, supervisorEmail?: string) {
  try {
    const client = getClient() || (await createClient());
    const supervisor = await getAuthenticatedEmployee(client, supervisorEmail);

    if (!supervisor) return { success: false, error: 'Atasan tidak terverifikasi.' };

    const { data: req, error: fetchErr } = await client
      .from('requests')
      .select('id, created_by, status')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchErr || !req) return { success: false, error: 'Penugasan tidak ditemukan.' };

    if (req.created_by !== supervisor.id && supervisor.role !== 'admin' && supervisor.role !== 'hr') {
      return { success: false, error: 'Anda tidak memiliki hak membatalkan penugasan ini.' };
    }

    if (req.status !== 'pending') {
      return { success: false, error: `Penugasan tidak dapat dibatalkan (Status: ${req.status}).` };
    }

    const { error: updErr } = await client
      .from('requests')
      .update({
        status: 'cancelled',
        cancelled_by: supervisor.id,
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'Dibatalkan oleh atasan pembuat tugas',
      })
      .eq('id', requestId);

    if (updErr) return { success: false, error: updErr.message };

    revalidatePath('/overtime');
    revalidatePath('/approvals');

    return { success: true, message: 'Penugasan lembur berhasil dibatalkan.' };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal membatalkan penugasan lembur.',
    };
  }
}
