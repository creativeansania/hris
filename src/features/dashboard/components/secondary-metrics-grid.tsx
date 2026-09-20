import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Briefcase, CalendarDays } from 'lucide-react';

interface SecondaryMetricsGridProps {
  totalLateMinutes: number;
  totalExcusedLateDays: number;
  totalLateDays: number;
  totalOvertimeHours: number;
  totalLeaveDays: number;
}

export function SecondaryMetricsGrid({
  totalLateMinutes,
  totalExcusedLateDays,
  totalLateDays,
  totalOvertimeHours,
  totalLeaveDays,
}: SecondaryMetricsGridProps) {
  return (
    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Late Time */}
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Akumulasi Telat</span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="my-3">
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {totalLateMinutes}
            <span className="text-xs font-normal text-slate-400 ml-1">menit</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalExcusedLateDays} izin sah
          </p>
        </div>
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
          {totalLateDays} total keterlambatan
        </div>
      </Card>

      {/* Overtime */}
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Lembur Sah</span>
          <Briefcase className="w-4 h-4 text-purple-400" />
        </div>
        <div className="my-3">
          <div className="text-2xl font-bold text-purple-300 font-mono">
            {totalOvertimeHours.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">jam</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Disetujui atasan</p>
        </div>
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
          Standar Depnaker 1/173
        </div>
      </Card>

      {/* Leave Days */}
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Cuti & Izin</span>
          <CalendarDays className="w-4 h-4 text-blue-400" />
        </div>
        <div className="my-3">
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {totalLeaveDays}
            <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cuti tahunan & sakit</p>
        </div>
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
          Total izin periode aktif
        </div>
      </Card>
    </div>
  );
}
