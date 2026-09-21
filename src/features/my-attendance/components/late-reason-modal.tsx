import React, { useState } from 'react';
import { FileText, X, RefreshCw, Send } from 'lucide-react';
import { AttendanceRecordItem, fillLateReason } from '@/app/actions/attendance';

interface LateReasonModalProps {
  record: AttendanceRecordItem | null;
  onClose: () => void;
  onSuccess: (updatedId: string, newReason: string) => void;
}

export function LateReasonModal({
  record,
  onClose,
  onSuccess,
}: LateReasonModalProps) {
  const [reasonInput, setReasonInput] = useState(record?.late_reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!record) return null;

  const reasonPresets = [
    'Macet lalu lintas ekstrem di jalan utama',
    'Kendala kendaraan / mogok di perjalanan',
    'Keperluan keluarga mendesak di pagi hari',
    'Cuaca buruk / hujan lebat & banjir',
    'Kunjungan dinas luar sebelum ke kantor',
  ];

  const handleSubmit = async () => {
    if (!reasonInput.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fillLateReason(record.id, reasonInput.trim());
      setIsSubmitting(false);

      if (res.success) {
        onSuccess(record.id, reasonInput.trim());
        onClose();
      } else {
        setFeedback(res.error || 'Gagal menyimpan alasan keterlambatan');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setFeedback(err?.message || 'Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Klarifikasi Keterlambatan Aktual
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Jalur A: Dokumentasi alasan kedatangan melebihi batas jam kerja (tanpa approval).
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Tanggal</span>
              <p className="font-semibold text-white mt-0.5">
                {record.attendance_date}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Jam Masuk</span>
              <p className="font-semibold text-amber-400 mt-0.5">
                {record.clock_in}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] uppercase">Keterlambatan</span>
              <p className="font-semibold text-rose-400 mt-0.5">
                +{record.late_minutes} Menit
              </p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
              Pilih Cepat Alasan Umum:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {reasonPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReasonInput(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-left cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Uraian Alasan / Klarifikasi:
            </label>
            <textarea
              rows={4}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Tuliskan keterangan detail alasan keterlambatan Anda..."
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {feedback && (
            <p className="text-xs text-rose-400 font-medium">{feedback}</p>
          )}
        </div>

        <div className="p-5 border-t border-slate-800 bg-[#090d16] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!reasonInput.trim() || isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Simpan Klarifikasi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
