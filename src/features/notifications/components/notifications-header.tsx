import React from 'react';
import { RefreshCw, CheckCheck, Sparkles } from 'lucide-react';

interface NotificationsHeaderProps {
  unreadCount: number;
  scanning: boolean;
  statusMessage: string | null;
  onScanReminders: () => void;
  onMarkAllRead: () => void;
  onDismissStatus: () => void;
}

export function NotificationsHeader({
  unreadCount,
  scanning,
  statusMessage,
  onScanReminders,
  onMarkAllRead,
  onDismissStatus,
}: NotificationsHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Pusat Pesan & Pengingat
            </span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                {unreadCount} Belum Dibaca
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Pusat Notifikasi
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Semua riwayat pembaruan status pengajuan, penugasan lembur, dan pengingat operasional.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onScanReminders}
            disabled={scanning}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 hover:text-white flex items-center gap-2 transition disabled:opacity-50 shadow-sm cursor-pointer"
            title="Jalankan pemindaian otomatis pengingat kontrak dan kuota"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Memindai...' : 'Pindai Pengingat'}</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner after scan */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={onDismissStatus}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
