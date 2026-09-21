import React from 'react';
import { UserCheck, CheckCircle2, Clock, Timer } from 'lucide-react';

interface AttendanceSummaryCardsProps {
  summary: {
    presentDays: number;
    onTimeDays: number;
    lateDays: number;
    totalLateMinutes: number;
    absentDays: number;
  } | null;
}

export function AttendanceSummaryCards({ summary }: AttendanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">
            Kehadiran Bulan Ini
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white font-mono">
            {summary?.presentDays || 0}
          </span>
          <span className="text-xs text-slate-500">Hari Kerja</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">
            Tepat Waktu
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-400 font-mono">
            {summary?.onTimeDays || 0}
          </span>
          <span className="text-xs text-slate-500">Hari</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">
            Total Hari Terlambat
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-400 font-mono">
            {summary?.lateDays || 0}
          </span>
          <span className="text-xs text-slate-500">Hari</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">
            Akumulasi Menit Telat
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <Timer className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-rose-400 font-mono">
            {summary?.totalLateMinutes || 0}
          </span>
          <span className="text-xs text-slate-500">Menit</span>
        </div>
      </div>
    </div>
  );
}
