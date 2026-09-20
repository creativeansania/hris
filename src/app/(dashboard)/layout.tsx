'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EmployeeRole } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Database, ArrowUpRight, ShieldAlert } from 'lucide-react';

import { OfflineBanner } from '@/components/offline-banner';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Developer Admin');
  const [userEmail, setUserEmail] = useState<string>('admin@hris.internal');
  const [userRole, setUserRole] = useState<EmployeeRole>('admin');
  const [isPlaceholderEnv, setIsPlaceholderEnv] = useState(false);
  const [unauthorizedWarning, setUnauthorizedWarning] = useState<{
    show: boolean;
    deniedRoute?: string;
  }>({ show: false });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'unauthorized') {
        setUnauthorizedWarning({
          show: true,
          deniedRoute: params.get('deniedRoute') || 'halaman tersebut',
        });
      }
    }
  }, []);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');
    setIsPlaceholderEnv(isPlaceholder);

    if (!isPlaceholder) {
      const fetchUserData = async () => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email || 'user@hris.internal');
          const { data: emp } = await supabase
            .from('employees')
            .select('full_name, role')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (emp) {
            setUserName(emp.full_name);
            setUserRole(emp.role);
          } else {
            setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Karyawan');
          }
        }
      };

      fetchUserData();
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#090d16] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        userRole={userRole}
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <Topbar
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)}
        />

        {/* Global Offline Status & Queue Banner */}
        <OfflineBanner />

        {/* PWA Floating Install Prompt */}
        <PwaInstallPrompt />

        {/* Unauthorized Access Banner (RBAC Security) */}
        {unauthorizedWarning.show && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-rose-300 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Akses Ditolak:</strong> Peran Anda ({userRole}) tidak memiliki otoritas untuk mengakses <code className="bg-rose-500/20 px-1 py-0.5 rounded text-rose-200">{unauthorizedWarning.deniedRoute}</code>. Pembatasan ini ditegakkan oleh RBAC Security Middleware.
              </span>
            </div>
            <button
              onClick={() => setUnauthorizedWarning({ show: false })}
              className="text-rose-400 hover:text-white px-2 py-0.5 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Database Config Banner (if using placeholder credentials) */}
        {isPlaceholderEnv && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Sprint 0 Fondasi:</strong> Project berjalan dengan environment placeholder. Masukkan kredensial Supabase di <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-200">.env.local</code> untuk menyambungkan database & Google OAuth asli.
              </span>
            </div>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-4 shrink-0"
            >
              Buka Supabase <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
