import React from 'react';
import { Clock, CheckCircle2, Users } from 'lucide-react';
import { RequestItem, Employee } from '@/types/database';

interface OvertimeMetricsProps {
  totalApprovedHours: number;
  pendingHrCount: number;
  approvedCount: number;
  isSupervisorOrAbove: boolean;
  subordinates: Employee[];
  myOvertimes: RequestItem[];
}

export function OvertimeMetrics({
  totalApprovedHours,
  pendingHrCount,
  approvedCount,
  isSupervisorOrAbove,
  subordinates,
  myOvertimes,
}: OvertimeMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Jam Disetujui */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Jam Lembur Disetujui
          </span>
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Clock className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-400 font-mono">
            {totalApprovedHours.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400">Jam Kerja</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Siap dikalkulasi ke payroll</p>
      </div>

      {/* Menunggu HR */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Menunggu Persetujuan HR
          </span>
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-amber-400 font-mono">
            {pendingHrCount}
          </span>
          <span className="text-xs text-slate-400">surat perintah</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Atasan auto-approved, menunggu HR</p>
      </div>

      {/* Penugasan Disetujui */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Selesai Disetujui
          </span>
          <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white font-mono">
            {approvedCount}
          </span>
          <span className="text-xs text-slate-400">penugasan</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Disetujui lengkap Atasan & HR</p>
      </div>

      {/* Anggota Tim / Bawahan */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isSupervisorOrAbove ? 'Bawahan Dapat Ditugaskan' : 'Status Lembur'}
          </span>
          <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <Users className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white font-mono">
            {isSupervisorOrAbove ? subordinates.length : myOvertimes.length}
          </span>
          <span className="text-xs text-slate-400">
            {isSupervisorOrAbove ? 'staf di hierarki' : 'penugasan tercatat'}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {isSupervisorOrAbove ? 'Khusus bawahan langsung / divisi' : 'Surat perintah resmi'}
        </p>
      </div>
    </div>
  );
}
