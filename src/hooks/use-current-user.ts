'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EmployeeRole } from '@/types/database';
import type { User } from '@supabase/supabase-js';

export interface CurrentUserData {
  user: User | null;
  email: string | null;
  role: EmployeeRole | null;
  name: string | null;
  employeeId: string | null;
  isLoading: boolean;
  isPlaceholder: boolean;
}

// Module-level cache to avoid multiple redundant network requests across components
let cachedUserData: Omit<CurrentUserData, 'isLoading'> | null = null;
let pendingFetch: Promise<Omit<CurrentUserData, 'isLoading'>> | null = null;

async function fetchUserData(): Promise<Omit<CurrentUserData, 'isLoading'>> {
  if (cachedUserData) return cachedUserData;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');

      if (isPlaceholder) {
        return {
          user: null,
          email: 'admin@hris.internal',
          role: 'admin' as EmployeeRole,
          name: 'Administrator',
          employeeId: null,
          isPlaceholder: true,
        };
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          user: null,
          email: null,
          role: null,
          name: null,
          employeeId: null,
          isPlaceholder: false,
        };
      }

      const email = user.email || null;
      let employeeId: string | null = null;
      let role: EmployeeRole | null = null;
      let name: string = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Karyawan';

      // Fetch employee record to resolve role and details
      const { data: emp } = await supabase
        .from('employees')
        .select('id, full_name, role, email')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (emp) {
        employeeId = emp.id;
        role = emp.role as EmployeeRole;
        name = emp.full_name || name;
      } else if (email) {
        const { data: empByEmail } = await supabase
          .from('employees')
          .select('id, full_name, role, email')
          .eq('email', email)
          .maybeSingle();

        if (empByEmail) {
          employeeId = empByEmail.id;
          role = empByEmail.role as EmployeeRole;
          name = empByEmail.full_name || name;
        }
      }

      cachedUserData = {
        user,
        email,
        role: role || 'staff',
        name,
        employeeId,
        isPlaceholder: false,
      };

      return cachedUserData;
    } catch (err) {
      console.error('[useCurrentUser] Failed to fetch current user:', err);
      return {
        user: null,
        email: null,
        role: null,
        name: null,
        employeeId: null,
        isPlaceholder: false,
      };
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

export function useCurrentUser(): CurrentUserData {
  const [data, setData] = useState<CurrentUserData>(() => {
    if (cachedUserData) {
      return { ...cachedUserData, isLoading: false };
    }
    return {
      user: null,
      email: null,
      role: null,
      name: null,
      employeeId: null,
      isLoading: true,
      isPlaceholder: false,
    };
  });

  useEffect(() => {
    let isMounted = true;

    fetchUserData().then((result) => {
      if (isMounted) {
        setData({ ...result, isLoading: false });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return data;
}

export function clearUserCache() {
  cachedUserData = null;
  pendingFetch = null;
}
