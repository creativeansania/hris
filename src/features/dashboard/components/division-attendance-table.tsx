import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { DivisionBreakdown } from '@/app/actions/reports';

interface DivisionAttendanceTableProps {
  divisions: DivisionBreakdown[];
}

export function DivisionAttendanceTable({ divisions }: DivisionAttendanceTableProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Performa Presensi per Divisi"
        subtitle="Komparasi tingkat disiplin tepat waktu dan akumulasi menit telat"
      />

      {divisions.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500">
          Belum ada data presensi untuk divisi dalam periode ini.
        </div>
      ) : (
        <div className="space-y-4">
          {divisions.map((div) => (
            <div key={div.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200">{div.name}</span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    ({div.employeeCount} karyawan)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {div.onTimeRate}% Tepat Waktu
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${div.onTimeRate}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Hadir: {div.presentDays} hari</span>
                <span className="text-amber-400/90">
                  Telat: {div.lateDays}x ({div.totalLateMinutes} mnt)
                </span>
                <span className="text-purple-400/90">
                  Lembur: {div.overtimeHours.toFixed(1)} jam
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
