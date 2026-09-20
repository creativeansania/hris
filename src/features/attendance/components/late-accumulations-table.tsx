import React from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatIDR } from '@/lib/formatters';
import { Clock, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LateAccumulationsTableProps {
  accumulations: any[];
  onRecalculate: () => void;
  isRecalculating: boolean;
  selectedMonth: number;
  selectedYear: number;
}

export function LateAccumulationsTable({
  accumulations,
  onRecalculate,
  isRecalculating,
  selectedMonth,
  selectedYear,
}: LateAccumulationsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Akumulasi Keterlambatan & Potongan Disiplin
          </h3>
          <p className="text-xs text-slate-400">
            Rekapitulasi menit keterlambatan bulanan untuk perhitungan potongan payroll.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="border-slate-700 text-slate-300 hover:text-white text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRecalculating ? 'animate-spin text-blue-400' : ''}`} />
          {isRecalculating ? 'Menghitung Ulang...' : 'Hitung Ulang Akumulasi'}
        </Button>
      </div>

      {accumulations.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Belum Ada Rekap Keterlambatan"
          description={`Belum ada data akumulasi keterlambatan untuk periode bulan ${selectedMonth}/${selectedYear}. Klik 'Hitung Ulang Akumulasi' untuk memproses.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#0d1322]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-3">Karyawan</th>
                <th className="py-3 px-3">Divisi</th>
                <th className="py-3 px-3 text-center">Total Kejadian</th>
                <th className="py-3 px-3 text-center">Total Menit Telat</th>
                <th className="py-3 px-3 text-center">Izin Sah (Dispensasi)</th>
                <th className="py-3 px-3 text-center">Menit Bersih (Kena Sanksi)</th>
                <th className="py-3 px-3 text-right">Potongan Gaji</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {accumulations.map((item) => {
                const totalMinutes = item.total_late_minutes || 0;
                const excusedMinutes = item.excused_late_minutes || 0;
                const unexcusedMinutes = Math.max(0, totalMinutes - excusedMinutes);
                const penalty = item.penalty_amount || 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{item.employee?.full_name || '-'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.employee?.nik || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {item.employee?.division?.name || 'Umum'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {item.late_count || 0} kali
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-400 font-semibold">
                      {totalMinutes} mnt
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400">
                      {excusedMinutes} mnt
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-rose-400">
                      {unexcusedMinutes} mnt
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                      {penalty > 0 ? `-${formatIDR(penalty)}` : 'Rp 0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
