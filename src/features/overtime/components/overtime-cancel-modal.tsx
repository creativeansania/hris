import React from 'react';
import { Modal } from '@/components/ui/modal';

interface OvertimeCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function OvertimeCancelModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
}: OvertimeCancelModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batalkan Surat Perintah Lembur"
      description="Pembatalan penugasan ini akan mencabut instruksi lembur karyawan bersangkutan."
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-300">
          Apakah Anda yakin ingin membatalkan perintah lembur ini? Tindakan ini tidak dapat
          dibatalkan.
        </p>
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Kembali
          </button>
          <button
            onClick={onConfirm}
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
