'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Holiday, HolidayType } from '@/types/database';
import { requireAuthRole } from '@/lib/auth';

function getClient() {
  return getAdminClient();
}

export async function getHolidays(year?: number): Promise<{ data: Holiday[]; error: string | null }> {
  try {
    const client = getClient() || (await createClient());
    const currentYear = year || new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const { data, error } = await client
      .from('holidays')
      .select('*')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .order('holiday_date', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data as Holiday[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal mengambil data hari libur' };
  }
}

export async function createHoliday(formData: {
  name: string;
  holiday_date: string;
  type: HolidayType;
  description?: string | null;
}) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client.from('holidays').insert({
      name: formData.name.trim(),
      holiday_date: formData.holiday_date,
      type: formData.type || 'nasional',
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/holidays');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menambah hari libur' };
  }
}

export async function updateHoliday(
  id: string,
  formData: {
    name: string;
    holiday_date: string;
    type: HolidayType;
    description?: string | null;
  }
) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client
      .from('holidays')
      .update({
        name: formData.name.trim(),
        holiday_date: formData.holiday_date,
        type: formData.type,
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/holidays');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memperbarui hari libur' };
  }
}

export async function deleteHoliday(id: string) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client.from('holidays').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/holidays');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menghapus hari libur' };
  }
}
