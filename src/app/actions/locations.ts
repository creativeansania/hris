'use server';

import { getActionClient } from '@/lib/supabase/action-client';
import { revalidatePath } from 'next/cache';
import { OfficeLocation } from '@/types/database';
import { requireAuthRole } from '@/lib/auth';

// In-memory cache for office locations (60s TTL)
let locationsCache: { data: OfficeLocation[]; expiresAt: number } | null = null;

export async function invalidateLocationsCache() {
  locationsCache = null;
}

export async function getOfficeLocations(): Promise<{ data: OfficeLocation[]; error: string | null }> {
  if (locationsCache && Date.now() < locationsCache.expiresAt) {
    return { data: locationsCache.data, error: null };
  }

  try {
    const client = await getActionClient();
    const { data, error } = await client
      .from('office_locations')
      .select('*')
      .order('name', { ascending: true });

    if (error) return { data: [], error: error.message };
    const result = (data as OfficeLocation[]) || [];
    locationsCache = { data: result, expiresAt: Date.now() + 60_000 };
    return { data: result, error: null };
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
    const client = await getActionClient();
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
    invalidateLocationsCache();
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
    const client = await getActionClient();
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
    invalidateLocationsCache();
    revalidatePath('/settings/locations');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memperbarui lokasi kantor' };
  }
}

export async function deleteOfficeLocation(id: string) {
  try {
    const client = await getActionClient();
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client.from('office_locations').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    invalidateLocationsCache();
    revalidatePath('/settings/locations');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menghapus lokasi kantor' };
  }
}
