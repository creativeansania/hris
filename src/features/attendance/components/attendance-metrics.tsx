import React from 'react';
import { Card } from '@/components/ui/card';
import { AttendanceRecordItem } from '@/app/actions/attendance';
import { Users, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AttendanceMetricsProps {
  records: AttendanceRecordItem[];
}

export function AttendanceMetrics({ records }: AttendanceMetricsProps) {
  const total = records.length;
  const onTimeCount = records.filter(
    (r) => r.clock_in && r.late_minutes === 0 && !r.is_absent
  ).length;
  const lateCount = records.filter((r) => r.late_minutes > 0).length;
  const absentCount = records.filter(
    (r) => r.is_absent || (!r.clock_in && !r.clock_out)
  ).length;

  const onTimePercentage = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Total Rekap Presensi</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-white">{total}</div>
          <p className="text-[11px] text-slate-400 mt-1">Data pada filter terpilih</p>
        </div>
      </Card>

      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Tepat Waktu</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {onTimeCount}{' '}
            <span className="text-xs font-normal text-slate-400">({onTimePercentage}%)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sesuai jam kerja shift</p>
        </div>
      </Card>

      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Terlambat</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-amber-400">{lateCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Kejadian telat clock-in</p>
        </div>
      </Card>

      <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Tidak Hadir / Alpa</span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-rose-400">{absentCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Tanpa clock-in atau alpa</p>
        </div>
      </Card>
    </div>
  );
}
