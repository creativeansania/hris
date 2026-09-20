'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload, AlertCircle, Database } from 'lucide-react';
import { getAllOfflineQueueStats } from '@/lib/offline-db';
import { syncAllOfflineData } from '@/lib/sync-engine';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const refreshQueueCount = useCallback(async () => {
    const stats = await getAllOfflineQueueStats();
    setQueueCount(stats.total);
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
      refreshQueueCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshQueueCount();
    };

    const handleQueueChange = () => {
      refreshQueueCount();
    };

    const handleSyncStarted = () => {
      setIsSyncing(true);
      setSyncSuccessMsg(null);
    };

    const handleSyncCompleted = (e: any) => {
      setIsSyncing(false);
      refreshQueueCount();
      const detail = e.detail;
      if (detail && detail.totalSynced > 0) {
        setSyncSuccessMsg(
          `${detail.totalSynced} data offline (${detail.syncedAttendance} presensi, ${detail.syncedRequests} pengajuan) berhasil disinkronkan ke server!`
        );
        setTimeout(() => setSyncSuccessMsg(null), 6000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('hris-queue-changed', handleQueueChange);
    window.addEventListener('hris-sync-started', handleSyncStarted);
    window.addEventListener('hris-sync-completed', handleSyncCompleted);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('hris-queue-changed', handleQueueChange);
      window.removeEventListener('hris-sync-started', handleSyncStarted);
      window.removeEventListener('hris-sync-completed', handleSyncCompleted);
    };
  }, [refreshQueueCount]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncAllOfflineData();
  };

  // Case 1: Synced Success Alert
  if (syncSuccessMsg) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between animate-in slide-in-from-top-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
        <button
          onClick={() => setSyncSuccessMsg(null)}
          className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5"
        >
          ✕
        </button>
      </div>
    );
  }

  // Case 2: Offline Mode
  if (!isOnline) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in slide-in-from-top-1">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Mode Offline Aktif:</strong> Anda sedang tidak terhubung ke internet. Presensi GPS & formulir pengajuan tetap dapat diisi dan otomatis tersimpan di antrean perangkat lokal (IndexedDB).
          </span>
        </div>

        {queueCount > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono font-semibold text-amber-300 flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              {queueCount} data tersimpan
            </span>
          </div>
        )}
      </div>
    );
  }

  // Case 3: Online but pending queue items exist
  if (queueCount > 0) {
    return (
      <div className="bg-blue-600/15 border-b border-blue-500/30 px-4 py-2 text-xs text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in slide-in-from-top-1">
        <div className="flex items-center gap-2">
          <CloudUpload className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Tersedia <strong>{queueCount} data offline</strong> di antrean lokal yang siap disinkronkan ke server.
          </span>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="self-end sm:self-auto px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
        </button>
      </div>
    );
  }

  return null;
}
