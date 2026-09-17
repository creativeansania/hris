'use client';

import React, { useState } from 'react';
import { Bell, LogOut, Shield, Wifi, WifiOff, Menu } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';
import { EmployeeRole } from '@/types/database';

interface TopbarProps {
  userName?: string;
  userEmail?: string;
  userRole?: EmployeeRole;
  onMobileMenuToggle?: () => void;
}

export function Topbar({
  userName = 'Administrator',
  userEmail = 'admin@company.com',
  userRole = 'admin',
  onMobileMenuToggle,
}: TopbarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/auth/signout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const roleStyle = ROLE_COLORS[userRole] || ROLE_COLORS.staff;
  const roleLabel = ROLE_LABELS[userRole] || userRole;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile trigger & breadcrumb/status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-900/60 border-slate-800 text-slate-300">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-400">Sistem Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">Mode Offline (PWA)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Notification & Profile */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition"
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-[#0d1322]" />
        </button>

        <div className="h-5 w-[1px] bg-slate-800" />

        {/* User Card */}
        <div className="flex items-center gap-3 pl-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xs font-semibold text-white shadow-sm ring-1 ring-white/10">
            {userName.charAt(0).toUpperCase()}
          </div>

          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[140px]">
              {userName}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
              >
                {roleLabel}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            title="Keluar / Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
