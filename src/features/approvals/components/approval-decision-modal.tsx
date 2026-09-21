import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { RequestItem } from '@/types/database';

interface ApprovalDecisionModalProps {
  data: {
    request: RequestItem;
    action: 'approved' | 'rejected';
  } | null;
  decisionNote: string;
  setDecisionNote: (note: string) => void;
  decisionError: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ApprovalDecisionModal({
  data,
  decisionNote,
  setDecisionNote,
  decisionError,
  isPending,
  onClose,
  onConfirm,
}: ApprovalDecisionModalProps) {
  if (!data) return null;

  return (
    <Modal
      isOpen={!!data}
      onClose={onClose}
      title={
        data.action === 'approved'
          ? 'Setujui Permohonan'
          : 'Tolak Permohonan'
      }
      description={`Pengajuan dari ${data.request.employee?.full_name} (${data.request.request_type?.name})`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {decisionError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{decisionError}</span>
          </div>
        )}

        <p className="text-slate-300">
          {data.action === 'approved'
            ? 'Anda akan menyetujui permohonan ini. Jika approver lainnya juga telah menyetujui, permohonan akan resmi dinyatakan disetujui sepenuhnya.'
            : 'Anda akan menolak permohonan ini. Penolakan dari salah satu approver akan langsung membatalkan seluruh permohonan.'}
        </p>

        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1">
            Catatan / Alasan {data.action === 'rejected' && <span className="text-rose-400">*</span>}
          </label>
          <textarea
            rows={3}
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder={
              data.action === 'approved'
                ? 'Catatan persetujuan (opsional)...'
                : 'Wajib sebutkan alasan penolakan permohonan...'
            }
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
            className={`px-4 py-2 rounded-xl font-semibold text-white shadow-lg transition cursor-pointer disabled:opacity-50 ${
              data.action === 'approved'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
            }`}
          >
            {isPending
              ? 'Menyimpan...'
              : data.action === 'approved'
              ? 'Konfirmasi Setuju'
              : 'Konfirmasi Tolak'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
