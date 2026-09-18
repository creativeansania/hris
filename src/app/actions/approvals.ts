'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { RequestItem, ApprovalDecision } from '@/types/database';

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
      .select('id, full_name, email, role, spv_id, division_id')
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
        .select('id, full_name, email, role, spv_id, division_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) {
        emp = data;
      } else {
        const { data: byEmail } = await client
          .from('employees')
          .select('id, full_name, email, role, spv_id, division_id')
          .ilike('email', user.email)
          .maybeSingle();
        emp = byEmail;
      }
    }
  }

  if (!emp) {
    const { data: fallback } = await client
      .from('employees')
      .select('id, full_name, email, role, spv_id, division_id')
      .limit(1)
      .maybeSingle();
    emp = fallback;
  }

  return emp;
}

/**
 * Retrieves requests assigned for approval to the current user (SPV, Kadiv, Management, HR, Admin).
 */
export async function getPendingApprovalsForUser(filters?: {
  userEmail?: string;
  tab?: 'pending' | 'history' | 'all';
}): Promise<{ data: RequestItem[]; currentUserId: string | null; error: string | null }> {
  try {
    const client = getClient() || (await createClient());
    const currentUser = await getAuthenticatedEmployee(client, filters?.userEmail);

    if (!currentUser) {
      return { data: [], currentUserId: null, error: 'User tidak ditemukan.' };
    }

    const isHrOrAdmin = currentUser.role === 'hr' || currentUser.role === 'admin';

    // Fetch all requests with joined details
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
        created_by_user:employees!requests_created_by_fkey(
          id,
          full_name,
          role
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
      .order('submitted_at', { ascending: false });

    if (error) {
      return { data: [], currentUserId: currentUser.id, error: error.message };
    }

    const allRequests = (data as RequestItem[]) || [];

    // Filter relevant requests for this user:
    // 1. Where user is explicitly listed in approvals
    // 2. OR if HR/Admin, where there's an approval with approver_role in ('hr', 'admin')
    const userRelevantRequests = allRequests.filter((req) => {
      if (!req.approvals || req.approvals.length === 0) return false;

      const isDirectApprover = req.approvals.some((a) => a.approver_id === currentUser.id);
      if (isDirectApprover) return true;

      if (isHrOrAdmin) {
        return req.approvals.some((a) => a.approver_role === 'hr' || a.approver_role === 'admin');
      }

      return false;
    });

    const tab = filters?.tab || 'pending';

    const filtered = userRelevantRequests.filter((req) => {
      // Find my approval record
      const myAppr =
        req.approvals?.find((a) => a.approver_id === currentUser.id) ||
        (isHrOrAdmin
          ? req.approvals?.find((a) => a.approver_role === 'hr' || a.approver_role === 'admin')
          : null);

      if (tab === 'pending') {
        // Needs my action: my decision is pending AND overall request is pending
        return req.status === 'pending' && myAppr?.decision === 'pending';
      } else if (tab === 'history') {
        // Either decided by me, or overall request is finalized
        return myAppr?.decision !== 'pending' || req.status !== 'pending';
      }
      return true;
    });

    return { data: filtered, currentUserId: currentUser.id, error: null };
  } catch (err: unknown) {
    return {
      data: [],
      currentUserId: null,
      error: err instanceof Error ? err.message : 'Gagal memuat antrean approval.',
    };
  }
}

/**
 * Submits an approval or rejection decision, evaluating parallel conditions and executing side-effects.
 */
export async function submitApprovalDecision(payload: {
  requestId: string;
  decision: 'approved' | 'rejected';
  note?: string;
  userEmail?: string;
}) {
  try {
    const client = getClient() || (await createClient());
    const currentUser = await getAuthenticatedEmployee(client, payload.userEmail);

    if (!currentUser) {
      return { success: false, error: 'User approver tidak ditemukan.' };
    }

    if (payload.decision === 'rejected' && (!payload.note || payload.note.trim().length < 3)) {
      return {
        success: false,
        error: 'Alasan penolakan wajib diisi (minimal 3 karakter).',
      };
    }

    // 1. Find request & its approvals
    const { data: request, error: reqErr } = await client
      .from('requests')
      .select(`
        *,
        request_type:request_types(*),
        approvals:request_approvals(*)
      `)
      .eq('id', payload.requestId)
      .maybeSingle();

    if (reqErr || !request) {
      return { success: false, error: 'Data pengajuan tidak ditemukan.' };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: `Pengajuan ini sudah ditutup dengan status '${request.status}'.`,
      };
    }

    // 2. Match approval record for current user
    const isHrOrAdmin = currentUser.role === 'hr' || currentUser.role === 'admin';
    let targetApproval = request.approvals?.find((a: any) => a.approver_id === currentUser.id);

    if (!targetApproval && isHrOrAdmin) {
      targetApproval = request.approvals?.find(
        (a: any) => a.approver_role === 'hr' || a.approver_role === 'admin'
      );
    }

    if (!targetApproval) {
      return {
        success: false,
        error: 'Anda tidak memiliki hak akses approval untuk permohonan ini.',
      };
    }

    // 3. Update the approval record
    const { error: apprUpdateErr } = await client
      .from('request_approvals')
      .update({
        decision: payload.decision,
        note: payload.note?.trim() || null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', targetApproval.id);

    if (apprUpdateErr) {
      return { success: false, error: apprUpdateErr.message };
    }

    // 4. Fetch all approvals to determine parallel consensus
    const { data: allApprovals } = await client
      .from('request_approvals')
      .select('decision, note')
      .eq('request_id', payload.requestId);

    const approvalsList = allApprovals || [];

    // Parallel Rule 1: ANY rejection -> Whole request rejected
    const hasRejection = approvalsList.some((a: any) => a.decision === 'rejected');

    // Parallel Rule 2: ALL approved -> Whole request approved
    const allApproved =
      approvalsList.length > 0 && approvalsList.every((a: any) => a.decision === 'approved');

    let newStatus = request.status;

    if (hasRejection) {
      newStatus = 'rejected';
      await client
        .from('requests')
        .update({
          status: 'rejected',
          decided_at: new Date().toISOString(),
        })
        .eq('id', payload.requestId);
    } else if (allApproved) {
      newStatus = 'approved';
      await client
        .from('requests')
        .update({
          status: 'approved',
          decided_at: new Date().toISOString(),
        })
        .eq('id', payload.requestId);

      // Execute side-effects upon full approval:
      // Side-effect A: Deduct Leave Quota (if deducts_leave_quota is true)
      if (request.request_type?.deducts_leave_quota) {
        const year = new Date(request.start_date).getFullYear();
        const totalDays = Number(request.total_days) || 1;

        const { data: curBal } = await client
          .from('leave_balances')
          .select('id, used')
          .eq('employee_id', request.employee_id)
          .eq('year', year)
          .eq('request_type_id', request.request_type_id)
          .maybeSingle();

        if (curBal) {
          await client
            .from('leave_balances')
            .update({
              used: Number(curBal.used || 0) + totalDays,
              updated_at: new Date().toISOString(),
            })
            .eq('id', curBal.id);
        } else {
          // Auto create with used deducted
          await client.from('leave_balances').insert({
            employee_id: request.employee_id,
            year,
            request_type_id: request.request_type_id,
            quota: 12,
            used: totalDays,
            adjustment: 0,
            carry_over: 0,
          });
        }
      }

      // Side-effect B: Link to Attendance if Izin Telat
      if (request.request_type?.code === 'izin_telat') {
        await client
          .from('attendance')
          .update({
            linked_izin_telat_request_id: request.id,
          })
          .eq('employee_id', request.employee_id)
          .eq('attendance_date', request.start_date);
      }
    }

    revalidatePath('/approvals');
    revalidatePath('/requests');
    revalidatePath('/my-attendance');
    revalidatePath('/dashboard');

    return {
      success: true,
      requestStatus: newStatus,
      message:
        payload.decision === 'approved'
          ? allApproved
            ? 'Keputusan persetujuan berhasil dicatat. Permohonan resmi DISETUJUI sepenuhnya.'
            : 'Keputusan persetujuan Anda telah dicatat. Menunggu persetujuan paralel dari approver lainnya.'
          : 'Keputusan penolakan berhasil dicatat. Permohonan telah DITOLAK.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memproses keputusan approval.',
    };
  }
}
