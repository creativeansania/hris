import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';

interface CancelRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isPending: boolean;
}

export function CancelRequestModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
}: CancelRequestModalProps) {
  const [cancelReason, setCancelReason] = useState('');

  const handleConfirm = async () => {
    await onConfirm(cancelReason);
    setCancelReason('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Pembatalan"
      description="Pengajuan yang dibatalkan tidak dapat diaktifkan kembali."
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-300">
          Apakah Anda yakin ingin membatalkan permohonan cuti / izin ini?
        </p>
        <div>
          <label className="block text-slate-400 text-[11px] mb-1">
            Alasan Pembatalan (Opsional):
          </label>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Contoh: Rencana berubah, jadwal diundur"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Kembali
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
          >
            {isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
