'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { NotificationItem, NotificationType, EmployeeRole } from '@/types/database';

function getClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Resolves current authenticated employee from Supabase Auth or email fallback.
 */
async function getAuthenticatedEmployee(client: any, userEmail?: string) {
  let emp = null;

  if (userEmail) {
    const { data } = await client
      .from('employees')
      .select('id, full_name, email, role, division_id, spv_id')
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
        .select('id, full_name, email, role, division_id, spv_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) {
        emp = data;
      } else {
        const { data: byEmail } = await client
          .from('employees')
          .select('id, full_name, email, role, division_id, spv_id')
          .ilike('email', user.email)
          .maybeSingle();
        emp = byEmail;
      }
    }
  }

  // Fallback to first active admin/HR for dev environment
  if (!emp) {
    const { data: fallback } = await client
      .from('employees')
      .select('id, full_name, email, role, division_id, spv_id')
      .in('role', ['admin', 'hr', 'management', 'staff'])
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    emp = fallback;
  }

  return emp;
}

/**
 * Internal helper to create a single notification
 */
export async function createNotification(payload: {
  employee_id: string;
  type: NotificationType | string;
  title: string;
  message?: string | null;
  action_url?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
}): Promise<{ success: boolean; data?: NotificationItem; error?: string }> {
  try {
    const client = getClient() || (await createClient());

    const { data, error } = await client
      .from('notifications')
      .insert({
        employee_id: payload.employee_id,
        type: payload.type,
        title: payload.title,
        message: payload.message || null,
        action_url: payload.action_url || null,
        related_entity_type: payload.related_entity_type || null,
        related_entity_id: payload.related_entity_id || null,
        is_read: false,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/notifications');
    return { success: true, data: data as NotificationItem };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal membuat notifikasi.',
    };
  }
}

/**
 * Helper to create bulk notifications for multiple employees (e.g. all HR, all Management, etc.)
 */
export async function createBulkNotifications(
  payloads: Array<{
    employee_id: string;
    type: NotificationType | string;
    title: string;
    message?: string | null;
    action_url?: string | null;
    related_entity_type?: string | null;
    related_entity_id?: string | null;
  }>
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!payloads || payloads.length === 0) {
      return { success: true, count: 0 };
    }

    const client = getClient() || (await createClient());

    const records = payloads.map((p) => ({
      employee_id: p.employee_id,
      type: p.type,
      title: p.title,
      message: p.message || null,
      action_url: p.action_url || null,
      related_entity_type: p.related_entity_type || null,
      related_entity_id: p.related_entity_id || null,
      is_read: false,
    }));

    const { data, error } = await client
      .from('notifications')
      .insert(records)
      .select('id');

    if (error) {
      console.error('Error inserting bulk notifications:', error);
      return { success: false, count: 0, error: error.message };
    }

    revalidatePath('/notifications');
    return { success: true, count: data?.length || 0 };
  } catch (err: unknown) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Gagal membuat notifikasi massal.',
    };
  }
}

/**
 * Fetches notifications for the current authenticated user with unread count.
 */
export async function getMyNotifications(
  userEmail?: string,
  filter?: 'all' | 'unread',
  limit = 50
): Promise<{
  success: boolean;
  data: NotificationItem[];
  unreadCount: number;
  error?: string | null;
}> {
  try {
    const client = getClient() || (await createClient());
    const employee = await getAuthenticatedEmployee(client, userEmail);

    if (!employee) {
      return {
        success: false,
        data: [],
        unreadCount: 0,
        error: 'Data karyawan tidak ditemukan.',
      };
    }

    // 1. Get Unread Count for this employee
    const { count: unreadCount, error: countErr } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employee.id)
      .eq('is_read', false);

    if (countErr) {
      console.error('Error getting unread count:', countErr);
    }

    // 2. Fetch Notifications
    let query = client
      .from('notifications')
      .select(`
        *,
        employee:employees!notifications_employee_id_fkey(
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        data: [],
        unreadCount: unreadCount || 0,
        error: error.message,
      };
    }

    return {
      success: true,
      data: (data as NotificationItem[]) || [],
      unreadCount: unreadCount || 0,
      error: null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      data: [],
      unreadCount: 0,
      error: err instanceof Error ? err.message : 'Gagal memuat daftar notifikasi.',
    };
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = getClient() || (await createClient());

    const { error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/notifications');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memperbarui status notifikasi.',
    };
  }
}

/**
 * Marks all unread notifications as read for current user.
 */
export async function markAllNotificationsAsRead(userEmail?: string): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const client = getClient() || (await createClient());
    const employee = await getAuthenticatedEmployee(client, userEmail);

    if (!employee) {
      return { success: false, error: 'Data karyawan tidak terverifikasi.' };
    }

    const { data, error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('employee_id', employee.id)
      .eq('is_read', false)
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/notifications');
    revalidatePath('/dashboard');
    return { success: true, count: data?.length || 0 };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menandai semua notifikasi dibaca.',
    };
  }
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = getClient() || (await createClient());

    const { error } = await client
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/notifications');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghapus notifikasi.',
    };
  }
}

/**
 * Scans system tables to check and dispatch automated reminder notifications:
 * 1. PKWT Contracts approaching expiry (H-30 and H-7) -> HR & Management
 * 2. Low leave quota (<= 2 days remaining) -> Employee
 * 3. Frequent late attendance (>= 4 times in current month) -> Employee & HR
 */
export async function checkAndDispatchSystemReminders(userEmail?: string): Promise<{
  success: boolean;
  contractsNotified: number;
  quotaNotified: number;
  latesNotified: number;
  message: string;
}> {
  try {
    const client = getClient() || (await createClient());

    let contractsNotified = 0;
    let quotaNotified = 0;
    let latesNotified = 0;

    // Fetch HR & Management employees for target recipient groups
    const { data: hrMgmtUsers } = await client
      .from('employees')
      .select('id, role')
      .in('role', ['hr', 'admin', 'management'])
      .eq('status', 'active');

    const hrMgmtIds = (hrMgmtUsers || []).map((u: any) => u.id);

    // =========================================================================
    // 1. Contract Expiry Check (H-30 and H-7)
    // =========================================================================
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const { data: expiringContracts } = await client
      .from('employee_contracts')
      .select(`
        id,
        contract_type,
        start_date,
        end_date,
        employee_id,
        employee:employees!employee_contracts_employee_id_fkey(
          id,
          full_name,
          nik,
          status
        )
      `)
      .eq('contract_type', 'pkwt')
      .gte('end_date', todayStr)
      .lte('end_date', thirtyDaysStr);

    if (expiringContracts && expiringContracts.length > 0) {
      for (const contract of expiringContracts) {
        const emp: any = Array.isArray(contract.employee) ? contract.employee[0] : contract.employee;
        if (!emp || emp.status !== 'active') continue;

        const endDate = new Date(contract.end_date);
        const diffMs = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let urgencyTag = '';
        if (daysRemaining <= 7) {
          urgencyTag = 'H-7';
        } else if (daysRemaining <= 30) {
          urgencyTag = 'H-30';
        }

        if (urgencyTag) {
          // Check if notification already dispatched in the past 7 days for this contract & urgency
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);

          const { data: existingNotif } = await client
            .from('notifications')
            .select('id')
            .eq('type', 'contract_expiring')
            .eq('related_entity_id', contract.id)
            .ilike('title', `%${urgencyTag}%`)
            .gte('created_at', oneWeekAgo.toISOString())
            .limit(1);

          if (!existingNotif || existingNotif.length === 0) {
            // Notify HR & Management
            const newNotifs = hrMgmtIds.map((targetId) => ({
              employee_id: targetId,
              type: 'contract_expiring' as NotificationType,
              title: `Peringatan Kontrak PKWT ${urgencyTag}: ${emp.full_name}`,
              message: `Kontrak PKWT untuk karyawan ${emp.full_name} (${emp.nik}) akan berakhir dalam ${daysRemaining} hari pada tanggal ${contract.end_date}. Segera tentukan perpanjangan atau transisi ke PKWTT.`,
              action_url: `/employees/${emp.id}`,
              related_entity_type: 'employee_contracts',
              related_entity_id: contract.id,
            }));

            await createBulkNotifications(newNotifs);
            contractsNotified += newNotifs.length;
          }
        }
      }
    }

    // =========================================================================
    // 2. Leave Quota Check (Remaining <= 2 days)
    // =========================================================================
    const currentYear = now.getFullYear();
    const { data: balances } = await client
      .from('leave_balances')
      .select(`
        id,
        employee_id,
        quota,
        used,
        adjustment,
        carry_over,
        employee:employees!leave_balances_employee_id_fkey(id, full_name, status)
      `)
      .eq('year', currentYear);

    if (balances && balances.length > 0) {
      for (const bal of balances) {
        const emp: any = Array.isArray(bal.employee) ? bal.employee[0] : bal.employee;
        if (!emp || emp.status !== 'active') continue;

        const quota = Number(bal.quota || 0);
        const used = Number(bal.used || 0);
        const adj = Number(bal.adjustment || 0);
        const co = Number(bal.carry_over || 0);
        const remaining = Math.max(0, quota + co + adj - used);

        if (remaining <= 2) {
          // Check if notification sent within past 14 days
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(now.getDate() - 14);

          const { data: existingNotif } = await client
            .from('notifications')
            .select('id')
            .eq('employee_id', bal.employee_id)
            .eq('type', 'leave_quota_warning')
            .gte('created_at', twoWeeksAgo.toISOString())
            .limit(1);

          if (!existingNotif || existingNotif.length === 0) {
            await createNotification({
              employee_id: bal.employee_id,
              type: 'leave_quota_warning',
              title: 'Pemberitahuan Kuota Cuti Menipis',
              message: `Sisa kuota cuti tahunan Anda untuk tahun ${currentYear} tersisa ${remaining} hari. Harap rencanakan penggunaan cuti Anda dengan bijak.`,
              action_url: '/requests',
              related_entity_type: 'leave_balances',
              related_entity_id: bal.id,
            });
            quotaNotified++;
          }
        }
      }
    }

    // =========================================================================
    // 3. Accumulated Lates Check (>= 4x in current month)
    // =========================================================================
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const { data: monthlyLates } = await client
      .from('attendance')
      .select('id, employee_id, attendance_date, late_minutes, employee:employees!attendance_employee_id_fkey(id, full_name)')
      .gte('attendance_date', startOfMonth)
      .gt('late_minutes', 0);

    if (monthlyLates && monthlyLates.length > 0) {
      // Group by employee
      const lateCounts = new Map<string, { count: number; name: string }>();
      for (const att of monthlyLates) {
        const empId = att.employee_id;
        const current = lateCounts.get(empId) || {
          count: 0,
          name: (att as any).employee?.full_name || 'Karyawan',
        };
        current.count++;
        lateCounts.set(empId, current);
      }

      for (const [empId, info] of lateCounts.entries()) {
        if (info.count >= 4) {
          // Check if repeat late notification sent this month
          const { data: existingNotif } = await client
            .from('notifications')
            .select('id')
            .eq('employee_id', empId)
            .eq('type', 'attendance_late_repeat')
            .gte('created_at', startOfMonth)
            .limit(1);

          if (!existingNotif || existingNotif.length === 0) {
            // Notify Employee
            await createNotification({
              employee_id: empId,
              type: 'attendance_late_repeat',
              title: 'Peringatan Akumulasi Keterlambatan Presensi',
              message: `Anda telah tercatat terlambat sebanyak ${info.count} kali pada bulan ini. Harap perhatikan waktu kedatangan Anda agar tidak mempengaruhi evaluasi kedisiplinan.`,
              action_url: '/my-attendance',
              related_entity_type: 'attendance',
            });

            // Also Notify HR
            const hrNotifs = hrMgmtIds.map((hrId) => ({
              employee_id: hrId,
              type: 'attendance_late_repeat' as NotificationType,
              title: `Peringatan Keterlambatan: ${info.name} (>= 4x)`,
              message: `Karyawan ${info.name} telah tercatat terlambat ${info.count} kali pada bulan berjalan ini.`,
              action_url: `/attendance-management`,
              related_entity_type: 'attendance',
            }));

            await createBulkNotifications(hrNotifs);
            latesNotified += 1 + hrNotifs.length;
          }
        }
      }
    }

    return {
      success: true,
      contractsNotified,
      quotaNotified,
      latesNotified,
      message: `Pemeriksaan pengingat sistem selesai. Dispatched: ${contractsNotified} notifikasi kontrak, ${quotaNotified} peringatan kuota cuti, ${latesNotified} peringatan telat berulang.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      contractsNotified: 0,
      quotaNotified: 0,
      latesNotified: 0,
      message: err instanceof Error ? err.message : 'Gagal memproses pengingat sistem.',
    };
  }
}
