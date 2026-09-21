'use client';

import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { LeaveBalance } from '@/types/database';

interface EmployeeAttendanceTabProps {
  attendanceSummary: {
    presentDays: number;
    lateMinutes: number;
    excusedLateCount: number;
  };
  leaveBalance: LeaveBalance | null;
}

export function EmployeeAttendanceTab({
  attendanceSummary,
  leaveBalance,
}: EmployeeAttendanceTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm md:col-span-1">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Clock className="w-4 h-4 text-blue-400" />
          Kehadiran Bulan Berjalan
        </h3>
        <div className="space-y-3 text-xs font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-sans">Hari Masuk Kerja:</span>
            <span className="font-bold text-white text-base">
              {attendanceSummary.presentDays} hari
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-sans">Total Terlambat:</span>
            <span className="font-bold text-rose-400 text-base">
              {attendanceSummary.lateMinutes} menit
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-sans">Izin Telat (Excused):</span>
            <span className="font-bold text-emerald-400 text-base">
              {attendanceSummary.excusedLateCount} hari
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Calendar className="w-4 h-4 text-purple-400" />
          Rincian Saldo Cuti {new Date().getFullYear()}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Hak Kuota</span>
            <span className="text-xl font-bold font-mono text-white">
              {leaveBalance?.quota ?? 12}
            </span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Carry Over</span>
            <span className="text-xl font-bold font-mono text-slate-300">
              {leaveBalance?.carry_over ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Terpakai</span>
            <span className="text-xl font-bold font-mono text-rose-400">
              {leaveBalance?.used ?? 0}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30">
            <span className="text-[10px] text-blue-300 block uppercase font-bold">
              Sisa Saldo
            </span>
            <span className="text-xl font-extrabold font-mono text-blue-400">
              {leaveBalance?.remaining ?? 12}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
