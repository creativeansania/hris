'use client';

import { useState, useEffect } from 'react';
import { EmployeeRole } from '@/types/database';
import type { User } from '@supabase/supabase-js';
import { getCurrentUserEmployee } from '@/app/actions/employees';

export interface CurrentUserData {
  user: User | null;
  email: string | null;
  role: EmployeeRole | null;
  name: string | null;
  employeeId: string | null;
  isLoading: boolean;
  isPlaceholder: boolean;
}

const CACHE_KEY = 'hris_user_profile_cache';

function getStoredCache(): Omit<CurrentUserData, 'isLoading'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function setStoredCache(data: Omit<CurrentUserData, 'isLoading'> | null) {
  if (typeof window === 'undefined') return;
  try {
    if (data) sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    else sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

// Module-level cache to avoid multiple redundant network requests across components
let cachedUserData: Omit<CurrentUserData, 'isLoading'> | null = null;
let pendingFetch: Promise<Omit<CurrentUserData, 'isLoading'>> | null = null;

async function fetchUserData(): Promise<Omit<CurrentUserData, 'isLoading'>> {
  if (cachedUserData) return cachedUserData;
  const stored = getStoredCache();
  if (stored) {
    cachedUserData = stored;
  }
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

      const { user, employee: emp } = await getCurrentUserEmployee();

      if (!user) {
        setStoredCache(null);
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
      let name: string = emp?.full_name || user.email?.split('@')[0] || 'Karyawan';

      if (emp) {
        employeeId = emp.id;
        role = emp.role as EmployeeRole;
        name = emp.full_name || name;
      }

      cachedUserData = {
        user: user as unknown as User,
        email,
        role: role || 'staff',
        name,
        employeeId,
        isPlaceholder: false,
      };

      setStoredCache(cachedUserData);
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
    const stored = cachedUserData || getStoredCache();
    if (stored) {
      cachedUserData = stored;
      return { ...stored, isLoading: false };
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
  setStoredCache(null);
}
