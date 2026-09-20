'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAuthRole } from '@/lib/auth';

export interface ScheduleDayInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start_time?: string | null;
  break_end_time?: string | null;
  is_day_off: boolean;
  late_tolerance_minutes?: number;
}

export async function getScheduleGroups() {
  try {
    const client = getAdminClient() || (await createClient());

    const { data: groups, error: groupError } = await client
      .from('work_schedule_groups')
      .select('*')
      .order('name', { ascending: true });

    if (groupError) return { data: [], error: groupError.message };

    const { data: days, error: daysError } = await client
      .from('work_schedule_days')
      .select('*')
      .order('day_of_week', { ascending: true });

    const merged = (groups || []).map((g) => ({
      ...g,
      days: (days || []).filter((d) => d.group_id === g.id),
    }));

    return { data: merged, error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal mengambil jadwal kerja' };
  }
}

export async function saveScheduleGroup(
  groupId: string | null,
  groupData: { name: string; is_active?: boolean },
  daysData: ScheduleDayInput[]
) {
  try {
    const admin = getAdminClient() || (await createClient());
    const authCheck = await requireAuthRole(admin, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    let targetGroupId = groupId;

    if (targetGroupId) {
      const { error: updateError } = await admin
        .from('work_schedule_groups')
        .update({
          name: groupData.name.trim(),
          is_active: groupData.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetGroupId);

      if (updateError) return { success: false, error: updateError.message };
    } else {
      const { data: newGroup, error: insertError } = await admin
        .from('work_schedule_groups')
        .insert({
          name: groupData.name.trim(),
          is_active: groupData.is_active ?? true,
        })
        .select('id')
        .single();

      if (insertError || !newGroup) {
        return { success: false, error: insertError?.message || 'Gagal membuat grup jadwal' };
      }
      targetGroupId = newGroup.id;
    }

    // Delete existing days for this group and re-insert active working days
    await admin.from('work_schedule_days').delete().eq('group_id', targetGroupId);

    // Only insert working days (days where is_day_off is false)
    const workingDays = daysData.filter((d) => !d.is_day_off);
    if (workingDays.length > 0) {
      const daysToInsert = workingDays.map((d) => ({
        group_id: targetGroupId,
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        break_start: d.break_start_time || null,
        break_end: d.break_end_time || null,
      }));

      const { error: daysError } = await admin
        .from('work_schedule_days')
        .insert(daysToInsert);

      if (daysError) return { success: false, error: daysError.message };
    }

    revalidatePath('/settings/schedules');
    revalidatePath('/employees');
    return { success: true, error: null, id: targetGroupId };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menyimpan jadwal kerja' };
  }
}

export async function deleteScheduleGroup(groupId: string) {
  try {
    const admin = getAdminClient() || (await createClient());
    const authCheck = await requireAuthRole(admin, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    // Check if any employees assigned to this schedule
    const { count } = await admin
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('work_schedule_id', groupId);

    if (count && count > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus jadwal. Masih ada ${count} karyawan yang menggunakan jadwal ini.`,
      };
    }

    await admin.from('work_schedule_days').delete().eq('group_id', groupId);
    const { error } = await admin.from('work_schedule_groups').delete().eq('id', groupId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/schedules');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menghapus jadwal' };
  }
}
