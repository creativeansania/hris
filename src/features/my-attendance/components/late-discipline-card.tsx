import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Check,
  Clock,
  Timer,
} from 'lucide-react';
import { LateAccumulationItem } from '@/types/database';

interface LateDisciplineCardProps {
  lateAccumulation: LateAccumulationItem | null;
}

export function LateDisciplineCard({ lateAccumulation }: LateDisciplineCardProps) {
  const unexcusedCount = lateAccumulation?.unexcused_count || 0;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0b1222] to-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-bold text-white">
              Status Kedisiplinan & Akumulasi Sanksi Keterlambatan
            </h3>
            <p className="text-xs text-slate-400">
              Pemisahan antara keterlambatan dengan izin yang disetujui (Excused) vs keterlambatan tanpa izin (Unexcused).
            </p>
          </div>
        </div>

        <div>
          {unexcusedCount === 0 ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Disiplin Terjaga (Bebas Sanksi)
            </span>
          ) : unexcusedCount <= 3 ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Toleransi Bulanan ({unexcusedCount}/3x)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5" />
              Melebihi Toleransi ({unexcusedCount}x)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase text-emerald-400 flex items-center gap-1 font-semibold">
            <Check className="w-3.5 h-3.5" />
            Telat Berizin (Excused)
          </span>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {lateAccumulation?.excused_count || 0} Hari
          </p>
          <p className="text-[10px] text-slate-500 font-sans mt-0.5">
            Disetujui atasan, bebas sanksi pemotongan
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase text-amber-400 flex items-center gap-1 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Telat Tanpa Izin (Unexcused)
          </span>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {lateAccumulation?.unexcused_count || 0} Hari
          </p>
          <p className="text-[10px] text-slate-500 font-sans mt-0.5">
            Masuk perhitungan batas sanksi (maks. 3x)
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase text-rose-400 flex items-center gap-1 font-semibold">
            <Timer className="w-3.5 h-3.5" />
            Estimasi Denda / Potongan Sanksi
          </span>
          <p className="text-xl font-bold text-rose-400 mt-1">
            Rp {(lateAccumulation?.deduction_amount || 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-slate-500 font-sans mt-0.5">
            {unexcusedCount > 3
              ? 'Dikenakan Rp 50.000 per pelanggaran ke-4+'
              : 'Belum ada potongan sanksi'}
          </p>
        </div>
      </div>
    </div>
  );
}
