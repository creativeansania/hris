import React from 'react';
import { Smartphone } from 'lucide-react';
import { TodayGpsAttendanceState } from '@/types/database';

interface AttendanceAuditTrailProps {
  attendance: TodayGpsAttendanceState | null;
}

export function AttendanceAuditTrail({ attendance }: AttendanceAuditTrailProps) {
  if (!attendance) return null;

  return (
    <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px] font-semibold flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          Audit Trail Presensi GPS Hari Ini
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
            attendance.review_status === 'auto_valid'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : attendance.review_status === 'approved'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : attendance.review_status === 'rejected'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          Status: {attendance.review_status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px] text-slate-400">
        <div>
          <span className="text-slate-500 block">Koordinat Tercatat:</span>
          <span className="text-white">
            {attendance.submitted_latitude?.toFixed(5)}, {attendance.submitted_longitude?.toFixed(5)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Jarak ke Kantor:</span>
          <span className="text-white">
            {attendance.distance_to_office_meters || 0} meter
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Akurasi GPS:</span>
          <span className="text-white">
            ±{Math.round(attendance.gps_accuracy_meters || 0)}m
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Catatan Tugas:</span>
          <span className="text-white truncate block" title={attendance.late_reason || undefined}>
            {attendance.late_reason || '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
