import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { EmployeeRole } from '@/types/database';

// Route permissions definition (Role-Based Access Control)
const RESTRICTED_ROUTES: Array<{ prefix: string; allowedRoles: EmployeeRole[] }> = [
  { prefix: '/attendance-management', allowedRoles: ['hr', 'admin'] },
  { prefix: '/odoo-sync', allowedRoles: ['hr', 'admin'] },
  { prefix: '/settings', allowedRoles: ['admin', 'hr'] },
  { prefix: '/employees', allowedRoles: ['hr', 'admin', 'management'] },
  { prefix: '/approvals', allowedRoles: ['spv', 'kepala_divisi', 'hr', 'management', 'admin'] },
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Jika Supabase belum dikonfigurasi (placeholder mode), bypass auth checks
  // agar developer tetap bisa melihat preview UI dan panduan setup
  const isPlaceholder =
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseAnonKey.includes('placeholder');

  if (isPlaceholder) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected paths requiring authentication
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/my-attendance') ||
    pathname.startsWith('/clock-in') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/overtime') ||
    pathname.startsWith('/approvals') ||
    pathname.startsWith('/attendance-management') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/payroll') ||
    pathname.startsWith('/odoo-sync') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings');

  const isDev = process.env.NODE_ENV === 'development';
  const hasDevBypass =
    isDev &&
    (request.cookies.get('hris_dev_mode')?.value === 'true' ||
      request.nextUrl.searchParams.get('dev') === '1');

  if (isDev && request.nextUrl.searchParams.get('dev') === '1') {
    response.cookies.set('hris_dev_mode', 'true', {
      path: '/',
      maxAge: 86400,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  } else if (!isDev && request.cookies.has('hris_dev_mode')) {
    response.cookies.delete('hris_dev_mode');
  }

  // 1. Authentication Check
  if (isProtectedPath && !user && !hasDevBypass) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Role-Based Access Control (RBAC) Enforcement at Middleware Layer
  if (user && !hasDevBypass) {
    const matchingRestriction = RESTRICTED_ROUTES.find((r) =>
      pathname.startsWith(r.prefix)
    );

    if (matchingRestriction) {
      const { data: emp } = await supabase
        .from('employees')
        .select('role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const userRole: EmployeeRole = (emp?.role as EmployeeRole) || 'staff';

      if (!matchingRestriction.allowedRoles.includes(userRole)) {
        // Forbidden: Redirect to dashboard with unauthorized warning flag
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'unauthorized');
        url.searchParams.set('deniedRoute', pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  // 3. Prevent logged-in users from visiting /login
  const isAuthPath = pathname.startsWith('/login');
  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (manifest, sw, icons, robots, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw\\.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
