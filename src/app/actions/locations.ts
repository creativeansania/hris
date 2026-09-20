'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { OfficeLocation } from '@/types/database';
import { requireAuthRole } from '@/lib/auth';

function getClient() {
  return getAdminClient();
}

export async function getOfficeLocations(): Promise<{ data: OfficeLocation[]; error: string | null }> {
  try {
    const client = getClient() || (await createClient());
    const { data, error } = await client
      .from('office_locations')
      .select('*')
      .order('name', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data as OfficeLocation[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal mengambil data lokasi kantor' };
  }
}

export async function createOfficeLocation(formData: {
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
}) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client.from('office_locations').insert({
      name: formData.name.trim(),
      address: formData.address?.trim() || null,
      latitude: formData.latitude,
      longitude: formData.longitude,
      radius_meters: formData.radius_meters || 100,
      is_active: true,
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/locations');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menambah lokasi kantor' };
  }
}

export async function updateOfficeLocation(
  id: string,
  formData: {
    name: string;
    address?: string | null;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active?: boolean;
  }
) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client
      .from('office_locations')
      .update({
        name: formData.name.trim(),
        address: formData.address?.trim() || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        radius_meters: formData.radius_meters,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/locations');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memperbarui lokasi kantor' };
  }
}

export async function deleteOfficeLocation(id: string) {
  try {
    const client = getClient() || (await createClient());
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client.from('office_locations').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/locations');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menghapus lokasi kantor' };
  }
}
