import React from 'react';
import { AlertCircle, Plus, Minus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { LeaveBalance } from '@/types/database';

interface LeaveAdjustmentModalProps {
  adjustingBalance: LeaveBalance | null;
  adjustDays: number;
  setAdjustDays: (days: number) => void;
  adjustType: 'add' | 'subtract';
  setAdjustType: (type: 'add' | 'subtract') => void;
  adjustReason: string;
  setAdjustReason: (reason: string) => void;
  adjustError: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LeaveAdjustmentModal({
  adjustingBalance,
  adjustDays,
  setAdjustDays,
  adjustType,
  setAdjustType,
  adjustReason,
  setAdjustReason,
  adjustError,
  isPending,
  onClose,
  onConfirm,
}: LeaveAdjustmentModalProps) {
  if (!adjustingBalance) return null;

  return (
    <Modal
      isOpen={!!adjustingBalance}
      onClose={onClose}
      title="Penyesuaian Saldo Cuti Manual"
      description={`Karyawan: ${adjustingBalance.employee?.full_name} (Tahun ${adjustingBalance.year})`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {adjustError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{adjustError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAdjustType('add')}
            className={`p-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              adjustType === 'add'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            Tambah Kuota (+)
          </button>
          <button
            type="button"
            onClick={() => setAdjustType('subtract')}
            className={`p-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              adjustType === 'subtract'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Minus className="w-4 h-4" />
            Kurangi Kuota (-)
          </button>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Jumlah Hari Penyesuaian
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={adjustDays}
            onChange={(e) => setAdjustDays(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Alasan Penyesuaian <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Contoh: Kompensasi lembur akhir pekan, koreksi kesalahan perhitungan masa kerja..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
          >
            {isPending ? 'Menyimpan...' : 'Simpan Penyesuaian'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
