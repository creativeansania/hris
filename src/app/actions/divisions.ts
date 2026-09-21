'use server';

import { getActionClient } from '@/lib/supabase/action-client';
import { revalidatePath } from 'next/cache';
import { Division } from '@/types/database';
import { requireAuthRole } from '@/lib/auth';

// In-memory cache for divisions (60s TTL)
let divisionsCache: { data: Division[]; expiresAt: number } | null = null;

export async function invalidateDivisionsCache() {
  divisionsCache = null;
}

export async function getDivisions(): Promise<{ data: Division[]; error: string | null }> {
  if (divisionsCache && Date.now() < divisionsCache.expiresAt) {
    return { data: divisionsCache.data, error: null };
  }

  try {
    const client = await getActionClient();
    const { data, error } = await client
      .from('divisions')
      .select('*')
      .order('name', { ascending: true });

    if (error) return { data: [], error: error.message };

    // Fetch kepala divisi names
    const kepalaIds = (data || [])
      .map((d) => d.kepala_divisi_id)
      .filter(Boolean);

    let employeesMap: Record<string, { id: string; full_name: string; email: string }> = {};
    if (kepalaIds.length > 0) {
      const { data: emps } = await client
        .from('employees')
        .select('id, full_name, email')
        .in('id', kepalaIds);

      if (emps) {
        emps.forEach((e) => {
          employeesMap[e.id] = e;
        });
      }
    }

    const merged = (data || []).map((d) => ({
      ...d,
      kepala_divisi: d.kepala_divisi_id ? employeesMap[d.kepala_divisi_id] || null : null,
    }));

    const result = merged as Division[];
    divisionsCache = { data: result, expiresAt: Date.now() + 60_000 };
    return { data: result, error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal mengambil data divisi' };
  }
}

export async function createDivision(formData: {
  name: string;
  kepala_divisi_id?: string | null;
}) {
  try {
    const client = await getActionClient();
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await client.from('divisions').insert({
      name: formData.name.trim(),
      kepala_divisi_id: formData.kepala_divisi_id || null,
      is_active: true,
    });

    if (error) return { success: false, error: error.message };
    invalidateDivisionsCache();
    revalidatePath('/settings/divisions');
    revalidatePath('/employees');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal membuat divisi' };
  }
}

export async function updateDivision(
  id: string,
  formData: {
    name: string;
    kepala_divisi_id?: string | null;
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
      .from('divisions')
      .update({
        name: formData.name.trim(),
        kepala_divisi_id: formData.kepala_divisi_id || null,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    invalidateDivisionsCache();
    revalidatePath('/settings/divisions');
    revalidatePath('/employees');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memperbarui divisi' };
  }
}

export async function deleteDivision(id: string) {
  try {
    const client = await getActionClient();
    const authCheck = await requireAuthRole(client, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { count } = await client
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('division_id', id);

    if (count && count > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus divisi. Masih ada ${count} karyawan di divisi ini.`,
      };
    }

    const { error } = await client.from('divisions').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    invalidateDivisionsCache();
    revalidatePath('/settings/divisions');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menghapus divisi' };
  }
}
