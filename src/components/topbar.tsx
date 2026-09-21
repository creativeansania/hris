'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Shield, Wifi, WifiOff, Menu, Download, Database, RefreshCw } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';
import { EmployeeRole } from '@/types/database';
import { NotificationsPopover } from '@/components/notifications-popover';
import { getAllOfflineQueueStats } from '@/lib/offline-db';
import { syncAllOfflineData } from '@/lib/sync-engine';

interface TopbarProps {
  userName?: string;
  userEmail?: string;
  userRole?: EmployeeRole;
  onMobileMenuToggle?: () => void;
}

export function Topbar({
  userName = 'Karyawan',
  userEmail = '',
  userRole = 'staff',
  onMobileMenuToggle,
}: TopbarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  const checkQueue = async () => {
    const stats = await getAllOfflineQueueStats();
    setQueueCount(stats.total);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };
    const handleQueueChange = () => checkQueue();
    const handleSyncStarted = () => setIsSyncing(true);
    const handleSyncCompleted = () => {
      setIsSyncing(false);
      checkQueue();
    };

    const handleInstallReady = () => setCanInstall(true);
    const handleAppInstalled = () => setCanInstall(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('hris-queue-changed', handleQueueChange);
    window.addEventListener('hris-sync-started', handleSyncStarted);
    window.addEventListener('hris-sync-completed', handleSyncCompleted);
    window.addEventListener('hris-pwa-install-ready', handleInstallReady);
    window.addEventListener('hris-pwa-installed', handleAppInstalled);

    setIsOnline(navigator.onLine);
    checkQueue();

    if (typeof window !== 'undefined' && (window as any).deferredPrompt) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('hris-queue-changed', handleQueueChange);
      window.removeEventListener('hris-sync-started', handleSyncStarted);
      window.removeEventListener('hris-sync-completed', handleSyncCompleted);
      window.removeEventListener('hris-pwa-install-ready', handleInstallReady);
      window.removeEventListener('hris-pwa-installed', handleAppInstalled);
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

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') setCanInstall(false);
      (window as any).deferredPrompt = null;
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncAllOfflineData();
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
          {/* Network Connection Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-900/60 border-slate-800 text-slate-300">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-400">Sistem Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">Mode Offline</span>
              </>
            )}
          </div>

          {/* Offline Queue Badge (if items exist) */}
          {queueCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              title={
                isOnline
                  ? `Ada ${queueCount} data di antrean. Klik untuk sinkronkan.`
                  : `${queueCount} data tersimpan di antrean offline.`
              }
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                isOnline
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>{queueCount} Antrean</span>
              {isOnline && (
                <RefreshCw
                  className={`w-2.5 h-2.5 ml-0.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-slate-400'}`}
                />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Right: Install button, Notification & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Install Button in Header */}
        {canInstall && (
          <button
            onClick={handleInstallClick}
            title="Install HRIS sebagai Aplikasi Desktop/Mobile"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Install App</span>
          </button>
        )}

        <NotificationsPopover userEmail={userEmail} />

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
