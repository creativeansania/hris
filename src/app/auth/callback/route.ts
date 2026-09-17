import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  const user = data.user;
  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login?error=no_email`);
  }
  const userEmail = user.email.toLowerCase();

  try {
    // Gunakan admin client untuk lookup & claim agar aman dari RLS limitation sebelum auth_user_id terhubung
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = supabase;
    }

    // 1. Cari data employee berdasarkan email terdaftar
    const { data: employee, error: empError } = await adminClient
      .from('employees')
      .select('id, email, status, role, auth_user_id, full_name')
      .ilike('email', userEmail)
      .maybeSingle();

    if (empError) {
      console.error('Database query error checking employee:', empError);
      return NextResponse.redirect(`${origin}/login?error=db_error`);
    }

    // Kasus 1: Email belum didaftarkan oleh HR/Admin
    if (!employee) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=unregistered`);
    }

    // Kasus 2: Akun karyawan dinonaktifkan
    if (employee.status === 'inactive') {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=account_disabled`);
    }

    // Kasus 3: Karyawan baru pertama kali login (pending_claim -> active)
    if (employee.status === 'pending_claim' || !employee.auth_user_id) {
      const { error: updateError } = await adminClient
        .from('employees')
        .update({
          auth_user_id: user.id,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id);

      if (updateError) {
        console.error('Failed to activate employee claim:', updateError);
        return NextResponse.redirect(`${origin}/login?error=claim_failed`);
      }

      // Log audit jika memungkinkan
      try {
        await adminClient.from('audit_logs').insert({
          user_id: employee.id,
          action: 'LOGIN_FIRST_CLAIM',
          table_name: 'employees',
          record_id: employee.id,
          old_values: { status: 'pending_claim' },
          new_values: { status: 'active', auth_user_id: user.id },
        });
      } catch {
        // Abaikan jika audit_logs gagal
      }

      return NextResponse.redirect(`${origin}${next}?welcome=1`);
    }

    // Kasus 4: Sudah aktif dan terhubung
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error('Unexpected error in auth callback:', err);
    return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
  }
}
