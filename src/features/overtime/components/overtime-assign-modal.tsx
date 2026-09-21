import React, { useState, useTransition } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { RoleBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Employee } from '@/types/database';
import { createOvertimeAssignment } from '@/app/actions/overtime';

interface OvertimeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  subordinates: Employee[];
  currentUserEmail: string;
  onSuccess: () => void;
}

export function OvertimeAssignModal({
  isOpen,
  onClose,
  subordinates,
  currentUserEmail,
  onSuccess,
}: OvertimeAssignModalProps) {
  const [isPending, startTransition] = useTransition();

  const [selectedSubordinateIds, setSelectedSubordinateIds] = useState<string[]>([]);
  const [overtimeDate, setOvertimeDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>('17:00');
  const [endTime, setEndTime] = useState<string>('20:00');
  const [taskReason, setTaskReason] = useState<string>('');
  const [subordinateSearch, setSubordinateSearch] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Calculate duration in hours
  const calculateDurationHours = () => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff <= 0) diff += 24 * 60;
    return Number((diff / 60).toFixed(1));
  };

  const durationHours = calculateDurationHours();

  const filteredSubordinates = subordinates.filter((s) => {
    if (!subordinateSearch.trim()) return true;
    const q = subordinateSearch.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.division?.name?.toLowerCase().includes(q);
  });

  const handleToggleSelectAll = () => {
    if (selectedSubordinateIds.length === filteredSubordinates.length) {
      setSelectedSubordinateIds([]);
    } else {
      setSelectedSubordinateIds(filteredSubordinates.map((s) => s.id));
    }
  };

  const handleToggleSubordinate = (id: string) => {
    setSelectedSubordinateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (selectedSubordinateIds.length === 0) {
      setFormError('Pilih minimal satu karyawan untuk ditugaskan lembur.');
      return;
    }

    if (!overtimeDate || !startTime || !endTime) {
      setFormError('Tanggal dan rentang jam lembur wajib diisi.');
      return;
    }

    if (!taskReason.trim()) {
      setFormError('Uraian tugas lembur wajib diisi secara jelas.');
      return;
    }

    startTransition(async () => {
      const res = await createOvertimeAssignment({
        employeeIds: selectedSubordinateIds,
        date: overtimeDate,
        startTime,
        endTime,
        reason: taskReason.trim(),
        supervisorEmail: currentUserEmail,
      });

      if (!res.success) {
        setFormError(res.error || 'Gagal menerbitkan penugasan lembur.');
      } else {
        setFormSuccess(res.message || 'Penugasan lembur berhasil diterbitkan.');
        setTimeout(() => {
          onClose();
          setSelectedSubordinateIds([]);
          setTaskReason('');
          onSuccess();
        }, 1200);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penerbitan Surat Tugas Lembur"
      description="Pilih staf bawahan yang ditugaskan lembur, tentukan rentang waktu, dan cantumkan deskripsi pekerjaan."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmitAssignment} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* 1. Subordinate Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              Pilih Karyawan yang Dilemburkan <span className="text-rose-400">*</span>
            </label>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-[11px] text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              {selectedSubordinateIds.length === filteredSubordinates.length
                ? 'Batal Pilih Semua'
                : 'Pilih Semua'}
            </button>
          </div>

          {/* Filter Subordinate Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={subordinateSearch}
              onChange={(e) => setSubordinateSearch(e.target.value)}
              placeholder="Cari nama bawahan..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* List of Subordinates (Checkbox cards) */}
          <div className="max-h-44 overflow-y-auto border border-slate-800 rounded-xl p-2 space-y-1.5 bg-slate-900/40">
            {filteredSubordinates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Tidak ada bawahan aktif yang ditemukan di hierarki Anda.
              </p>
            ) : (
              filteredSubordinates.map((sub) => {
                const isChecked = selectedSubordinateIds.includes(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleToggleSubordinate(sub.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      isChecked
                        ? 'bg-blue-500/10 border-blue-500/40 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold block">{sub.full_name}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {sub.division?.name || 'Divisi'} • {sub.email}
                        </span>
                      </div>
                    </div>
                    <RoleBadge role={sub.role} />
                  </div>
                );
              })
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            Terpilih: <strong>{selectedSubordinateIds.length}</strong> karyawan
          </div>
        </div>

        {/* 2. Date & Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tanggal Lembur <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={overtimeDate}
              onChange={(e) => setOvertimeDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Jam Mulai <span className="text-rose-400">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Jam Selesai <span className="text-rose-400">*</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Duration Preview */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-blue-300">
          <span className="flex items-center gap-1.5 font-semibold">
            <Clock className="w-4 h-4 text-blue-400" />
            Durasi Kerja Lembur: {durationHours} Jam
          </span>
          <span className="text-[11px] text-slate-400">
            Kompensasi lembur akan dihitung per jam
          </span>
        </div>

        {/* 3. Reason / Task Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Uraian Pekerjaan / Tugas Lembur <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            value={taskReason}
            onChange={(e) => setTaskReason(e.target.value)}
            placeholder="Jelaskan target atau pekerjaan spesifik yang wajib diselesaikan..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Auto-Skip Notice */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong>Aturan Auto-Skip Approval:</strong> Karena Anda bertindak sebagai atasan
            pembuat penugasan, status approval level atasan langsung otomatis tercatat{' '}
            <strong className="text-emerald-400">Approved</strong>. Surat tugas ini akan diteruskan
            ke <strong>HR</strong> untuk approval final.
          </p>
        </div>

        {/* Form Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending || selectedSubordinateIds.length === 0}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            {isPending ? 'Menerbitkan...' : `Terbitkan untuk ${selectedSubordinateIds.length} Karyawan`}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
