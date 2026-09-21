import React from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { OfflineAttendanceItem } from '@/lib/offline-db';

interface OfflineQueueCardProps {
  offlineQueue: OfflineAttendanceItem[];
  isSyncingQueue: boolean;
  isOffline: boolean;
  onSyncQueue: () => void;
}

export function OfflineQueueCard({
  offlineQueue,
  isSyncingQueue,
  isOffline,
  onSyncQueue,
}: OfflineQueueCardProps) {
  if (offlineQueue.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs animate-in fade-in">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-300">
            Antrean Presensi Offline ({offlineQueue.length})
          </span>
        </div>

        <button
          onClick={onSyncQueue}
          disabled={isSyncingQueue || isOffline}
          className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
          <span>
            {isSyncingQueue
              ? 'Menyinkronkan...'
              : isOffline
              ? 'Tersimpan Offline'
              : 'Sinkronkan Sekarang'}
          </span>
        </button>
      </div>

      <div className="divide-y divide-amber-500/10">
        {offlineQueue.map((item) => (
          <div
            key={item.id}
            className="py-2 flex items-center justify-between font-mono text-[11px]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  item.type === 'clock_in'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {item.type === 'clock_in' ? 'Clock In' : 'Clock Out'}
              </span>
              <span className="text-slate-300">
                {new Date(item.recordedAt).toLocaleTimeString('id-ID', { hour12: false })}
              </span>
              <span className="text-slate-500 text-[10px]">
                (±{Math.round(item.accuracy)}m)
              </span>
            </div>
            <div className="text-right">
              <span className="text-amber-400 text-[10px]">
                {item.status === 'syncing' ? 'Sedang kirim...' : 'Menunggu koneksi online'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
