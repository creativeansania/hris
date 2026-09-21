'use server';

import { getActionClient } from '@/lib/supabase/action-client';
import { revalidatePath } from 'next/cache';
import { RequestType, RequestCategory, GenderType, MaritalStatusType } from '@/types/database';
import { requireAuthRole } from '@/lib/auth';

export async function getRequestTypes(): Promise<{ data: RequestType[]; error: string | null }> {
  try {
    const supabase = await getActionClient();
    const { data, error } = await supabase
      .from('request_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data as RequestType[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Gagal mengambil jenis pengajuan' };
  }
}

export async function updateRequestType(
  id: string,
  formData: {
    name: string;
    category: RequestCategory;
    default_days?: number | null;
    is_half_day?: boolean;
    requires_attachment?: boolean;
    attachment_mandatory_after_days?: number | null;
    deducts_annual_leave?: boolean;
    gender_restriction?: GenderType | null;
    marital_status_restriction?: MaritalStatusType | null;
    min_service_days?: number;
    description?: string | null;
    is_active?: boolean;
  }
) {
  try {
    const supabase = await getActionClient();
    const authCheck = await requireAuthRole(supabase, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await supabase
      .from('request_types')
      .update({
        name: formData.name.trim(),
        category: formData.category,
        default_days: formData.default_days !== undefined ? formData.default_days : null,
        is_half_day: formData.is_half_day ?? false,
        requires_attachment: formData.requires_attachment ?? false,
        attachment_mandatory_after_days: formData.attachment_mandatory_after_days || null,
        deducts_annual_leave: formData.deducts_annual_leave ?? false,
        gender_restriction: formData.gender_restriction || null,
        marital_status_restriction: formData.marital_status_restriction || null,
        min_service_days: formData.min_service_days || 0,
        description: formData.description?.trim() || null,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/request-types');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal memperbarui jenis pengajuan' };
  }
}

export async function toggleRequestTypeStatus(id: string, is_active: boolean) {
  try {
    const supabase = await getActionClient();
    const authCheck = await requireAuthRole(supabase, ['admin', 'hr']);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    const { error } = await supabase
      .from('request_types')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/request-types');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal mengubah status' };
  }
}
