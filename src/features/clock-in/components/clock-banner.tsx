import React from 'react';
import { TodayGpsAttendanceState } from '@/types/database';

interface ClockBannerProps {
  currentTime: Date;
  attendance: TodayGpsAttendanceState | null;
}

export function ClockBanner({ currentTime, attendance }: ClockBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0b1120] to-[#090d16] border border-slate-800/80 p-6 md:p-8 shadow-2xl">
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Waktu Server Indonesia (WIB)
          </span>
          <div className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono mt-1">
            {new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Asia/Jakarta',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }).format(currentTime)}
          </div>
          <p className="text-sm text-slate-400 mt-1 capitalize font-medium">
            {new Intl.DateTimeFormat('id-ID', {
              timeZone: 'Asia/Jakarta',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(currentTime)}
          </p>
        </div>

        {/* Quick status badge if clocked in */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-[150px]">
            <span className="text-[10px] font-mono uppercase text-slate-500">Jam Masuk</span>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {attendance?.clock_in || '--:--'}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">
              {(Number(attendance?.late_minutes) || 0) > 0
                ? `Telat +${attendance?.late_minutes}m`
                : attendance?.clock_in
                ? 'Tepat Waktu'
                : 'Belum Masuk'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 min-w-[150px]">
            <span className="text-[10px] font-mono uppercase text-slate-500">Jam Pulang</span>
            <p className="text-lg font-bold font-mono text-blue-400 mt-0.5">
              {attendance?.clock_out || '--:--'}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">
              {(Number(attendance?.work_minutes) || 0) > 0
                ? `Total: ${Math.floor((attendance?.work_minutes ?? 0) / 60)}j ${(attendance?.work_minutes ?? 0) % 60}m`
                : 'Belum Pulang'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
