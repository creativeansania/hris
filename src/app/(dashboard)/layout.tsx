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

        {/* Database Config Banner (Slim dismissible notification) */}
        {isPlaceholderEnv && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Mode Simulasi:</strong> Supabase URL placeholder aktif. Masukkan API key di <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-200">.env.local</code> untuk database produksi.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                Buka Supabase <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setIsPlaceholderEnv(false)}
                className="text-amber-400/80 hover:text-white px-1.5 py-0.5 text-xs font-bold rounded"
                title="Tutup pemberitahuan"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Floating RBAC Unauthorized Toast (Non-intrusive bottom-right) */}
        {unauthorizedWarning.show && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md bg-[#160d14]/95 border border-rose-500/40 p-3.5 rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3 text-xs text-rose-200 animate-in slide-in-from-bottom-2 duration-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-rose-300">Akses Dibatasi (RBAC)</p>
              <p className="text-slate-300">
                Peran Anda (<span className="text-white font-medium">{userRole}</span>) tidak diizinkan mengakses{' '}
                <code className="bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-200">{unauthorizedWarning.deniedRoute}</code>.
              </p>
            </div>
            <button
              onClick={() => setUnauthorizedWarning({ show: false })}
              className="text-slate-400 hover:text-white p-1 rounded-md transition"
              title="Tutup"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
