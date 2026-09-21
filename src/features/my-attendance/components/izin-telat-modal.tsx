import React, { useState } from 'react';
import {
  FilePlus,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Send,
} from 'lucide-react';
import { submitIzinTelat } from '@/app/actions/late-attendance';
import { IzinTelatCheckResult } from '@/types/database';

interface IzinTelatModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeEmail?: string;
  izinTelatCheck: IzinTelatCheckResult | null;
  onSuccess: () => Promise<void>;
}

export function IzinTelatModal({
  isOpen,
  onClose,
  employeeEmail,
  izinTelatCheck,
  onSuccess,
}: IzinTelatModalProps) {
  const [estimatedArrival, setEstimatedArrival] = useState('08:30');
  const [izinTelatReason, setIzinTelatReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!izinTelatReason.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await submitIzinTelat({
        employeeEmail,
        estimatedArrival,
        reason: izinTelatReason.trim(),
      });

      setIsSubmitting(false);

      if (res.success) {
        setFeedback({
          success: true,
          message: 'Permohonan Izin Telat berhasil dikirim! Menunggu persetujuan atasan/HR.',
        });
        setIzinTelatReason('');
        await onSuccess();
      } else {
        setFeedback({
          success: false,
          message: res.error || 'Gagal mengajukan Izin Telat',
        });
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setFeedback({
        success: false,
        message: err?.message || 'Terjadi kesalahan sistem',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-amber-400" />
              Pengajuan Izin Telat (Sebelum Masuk Kerja)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Jalur B: Memberitahu atasan & HR sebelum jam masuk agar keterlambatan berstatus Excused.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Schedule time notice banner */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Jadwal Masuk Hari Ini</span>
              <p className="font-semibold text-white mt-0.5">
                {izinTelatCheck?.scheduledStartTime || '08:00'} WIB
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] uppercase">Status Waktu</span>
              <p
                className={`font-semibold mt-0.5 ${
                  izinTelatCheck?.canApply ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {izinTelatCheck?.canApply ? 'Sebelum Jam Masuk' : 'Melewati Jam Masuk'}
              </p>
            </div>
          </div>

          {/* Notice if time already passed */}
          {!izinTelatCheck?.canApply && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                Informasi Ketentuan Izin Telat:
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Izin Telat wajib diajukan sebelum jam masuk kerja. Karena jam masuk sudah terlewat, pengajuan Anda akan ditandai sebagai klarifikasi telat dan memerlukan persetujuan khusus dari HR.
              </p>
            </div>
          )}

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                feedback.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Estimated Arrival Time */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Estimasi Jam Tiba di Kantor (WIB):
            </label>
            <input
              type="time"
              required
              value={estimatedArrival}
              onChange={(e) => setEstimatedArrival(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Alasan Keterlambatan:
            </label>
            <textarea
              rows={3}
              required
              value={izinTelatReason}
              onChange={(e) => setIzinTelatReason(e.target.value)}
              placeholder="Jelaskan alasan keterlambatan Anda secara singkat dan jelas..."
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="submit"
              disabled={!izinTelatReason.trim() || isSubmitting}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Izin Telat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
