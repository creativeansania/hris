import { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from './admin';
import { createClient } from './server';

/**
 * Retrieves the appropriate Supabase client for Server Actions.
 * Prefers the Admin client (service role) to bypass RLS policies where appropriate,
 * falling back to the cookie-based Server client when service role key is absent.
 */
export async function getActionClient(): Promise<SupabaseClient> {
  const admin = getAdminClient();
  if (admin) {
    return admin;
  }
  return await createClient();
}
