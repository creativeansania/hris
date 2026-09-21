import React, { useState, useEffect, useTransition } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  X,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { RequestType, LeaveBalance } from '@/types/database';
import { createLeaveOrPermitRequest, calculateWorkingDays } from '@/app/actions/requests';
import { saveOfflineRequest } from '@/lib/offline-db';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
  requestTypes: RequestType[];
  leaveBalance: LeaveBalance | null;
  onSuccess: () => void;
}

export function CreateRequestModal({
  isOpen,
  onClose,
  currentUserEmail,
  requestTypes,
  leaveBalance,
  onSuccess,
}: CreateRequestModalProps) {
  const [isPending, startTransition] = useTransition();

  // Form States
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(1);
  const [calculatingDays, setCalculatingDays] = useState(false);

  const resetForm = () => {
    setSelectedTypeId('');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setIsHalfDay(false);
    setReason('');
    setFiles([]);
    setFormError(null);
    setFormSuccess(null);
  };

  // Recalculate working days dynamically when dates change
  useEffect(() => {
    if (!startDate) {
      setCalculatedDays(1);
      return;
    }

    if (isHalfDay) {
      setCalculatedDays(0.5);
      return;
    }

    let isMounted = true;
    const compute = async () => {
      setCalculatingDays(true);
      const days = await calculateWorkingDays(startDate, endDate || startDate);
      if (isMounted) {
        setCalculatedDays(days);
        setCalculatingDays(false);
      }
    };
    compute();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, isHalfDay]);

  const selectedType = requestTypes.find((t) => t.id === selectedTypeId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    const validFiles: File[] = [];

    for (const f of newFiles) {
      if (f.size > 5 * 1024 * 1024) {
        setFormError(`File ${f.name} melebihi batas ukuran 5MB`);
        continue;
      }
      if (!allowedMimes.includes(f.type)) {
        setFormError(`Format ${f.name} tidak valid. Gunakan format JPG, PNG, atau PDF.`);
        continue;
      }
      validFiles.push(f);
    }

    setFiles((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > 3) {
        setFormError('Maksimal 3 file lampiran.');
        return combined.slice(0, 3);
      }
      return combined;
    });

    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedTypeId) {
      setFormError('Pilih jenis pengajuan terlebih dahulu.');
      return;
    }

    if (!startDate) {
      setFormError('Pilih tanggal pengajuan.');
      return;
    }

    if (!reason.trim()) {
      setFormError('Keterangan / alasan pengajuan wajib diisi.');
      return;
    }

    if (selectedType?.requires_attachment && files.length === 0) {
      setFormError(
        `Pengajuan '${selectedType.name}' mewajibkan minimal 1 dokumen pendukung (Surat Sakit / Bukti Resmi).`
      );
      return;
    }

    // Quota check
    if (selectedType?.deducts_leave_quota) {
      const remaining = leaveBalance?.remaining ?? 0;
      if (calculatedDays > remaining) {
        setFormError(
          `Sisa kuota cuti tahunan tidak mencukupi (Tersisa: ${remaining} hari, Dibutuhkan: ${calculatedDays} hari).`
        );
        return;
      }
    }

    const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Offline submission fallback
    if (!isDeviceOnline) {
      try {
        const filePayloads = await Promise.all(
          files.map(async (file) => {
            return new Promise<{ name: string; type: string; size: number; base64: string }>(
              (resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    base64: reader.result as string,
                  });
                };
                reader.readAsDataURL(file);
              }
            );
          })
        );

        await saveOfflineRequest({
          employeeEmail: currentUserEmail,
          requestTypeId: selectedTypeId,
          requestTypeName: selectedType?.name,
          startDate,
          endDate: endDate || startDate,
          startTime,
          endTime,
          isHalfDay,
          reason: reason.trim(),
          files: filePayloads,
        });

        setFormSuccess(
          'Pengajuan berhasil disimpan di Antrean Offline (IndexedDB). Akan dikirim otomatis saat koneksi internet kembali aktif.'
        );
        window.dispatchEvent(new CustomEvent('hris-queue-changed'));
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1500);
        return;
      } catch {
        setFormError('Gagal menyimpan formulir pengajuan ke penyimpanan lokal perangkat.');
        return;
      }
    }

    const formData = new FormData();
    formData.append('employeeEmail', currentUserEmail);
    formData.append('request_type_id', selectedTypeId);
    formData.append('start_date', startDate);
    formData.append('end_date', endDate || startDate);
    if (startTime) formData.append('start_time', startTime);
    if (endTime) formData.append('end_time', endTime);
    formData.append('is_half_day', isHalfDay ? 'true' : 'false');
    formData.append('reason', reason.trim());

    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    startTransition(async () => {
      try {
        const res = await createLeaveOrPermitRequest(formData);
        if (!res.success) {
          setFormError(res.error || 'Terjadi kesalahan saat mengajukan.');
        } else {
          setFormSuccess('Permohonan berhasil diajukan dan sedang menunggu persetujuan.');
          setTimeout(() => {
            onClose();
            resetForm();
            onSuccess();
          }, 1200);
        }
      } catch {
        // Fallback to offline queue on unexpected network failure
        try {
          await saveOfflineRequest({
            employeeEmail: currentUserEmail,
            requestTypeId: selectedTypeId,
            requestTypeName: selectedType?.name,
            startDate,
            endDate: endDate || startDate,
            startTime,
            endTime,
            isHalfDay,
            reason: reason.trim(),
          });
          setFormSuccess('Koneksi terputus saat submit. Pengajuan otomatis dialihkan ke Antrean Offline lokal.');
          window.dispatchEvent(new CustomEvent('hris-queue-changed'));
          setTimeout(() => {
            onClose();
            resetForm();
          }, 1500);
        } catch {
          setFormError('Terjadi kesalahan sistem saat memproses pengajuan.');
        }
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Form Pengajuan Cuti / Izin"
      description="Pilih jenis permohonan, tentukan tanggal, dan unggah dokumen pendukung jika disyaratkan."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmitRequest} className="space-y-4">
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

        {/* 1. Request Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Jenis Pengajuan <span className="text-rose-400">*</span>
          </label>
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">-- Pilih Jenis Pengajuan --</option>
            <optgroup label="Cuti">
              {requestTypes
                .filter((t) => t.category === 'cuti')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.default_duration_days ? `(${t.default_duration_days} hari)` : ''}
                    {t.deducts_leave_quota ? ' [Memotong Kuota Cuti]' : ' [Cuti Khusus]'}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Izin">
              {requestTypes
                .filter((t) => t.category === 'izin')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </optgroup>
          </select>

          {/* Selected type hints */}
          {selectedType && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  selectedType.deducts_leave_quota
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {selectedType.deducts_leave_quota
                  ? 'Memotong Saldo Cuti'
                  : 'Tidak Memotong Saldo Cuti'}
              </span>

              {selectedType.requires_attachment && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Wajib Dokumen Pendukung
                </span>
              )}
              {selectedType.default_duration_days && (
                <span className="text-slate-400">
                  Durasi standar: {selectedType.default_duration_days} hari
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2. Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tanggal Mulai <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate || endDate < e.target.value) {
                  setEndDate(e.target.value);
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tanggal Selesai
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Half Day Option */}
        {startDate && (!endDate || startDate === endDate) && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_half_day"
              checked={isHalfDay}
              onChange={(e) => setIsHalfDay(e.target.checked)}
              className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="is_half_day"
              className="text-xs text-slate-300 cursor-pointer font-medium"
            >
              Pengajuan Setengah Hari (0.5 hari kerja)
            </label>
          </div>
        )}

        {/* Working Days Computation Result */}
        {startDate && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-blue-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>
                Hari Kerja Efektif: <strong>{calculatedDays} hari</strong> (hari libur/Minggu
                dikecualikan)
              </span>
            </div>
            {calculatingDays && <span className="text-[10px] text-slate-400">Menghitung...</span>}
          </div>
        )}

        {/* Time Picker for Izin Jam (Opsional) */}
        {selectedType?.category === 'izin' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jam Mulai (Opsional)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jam Selesai (Opsional)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* 3. Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Alasan / Keterangan Lengkap <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan keperluan permohonan izin/cuti secara jelas..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* 4. Multi-File Upload Dropzone */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Dokumen Lampiran (Maksimal 3 file, maks 5MB per file)
              {selectedType?.requires_attachment && <span className="text-rose-400"> *</span>}
            </label>
            <span className="text-[11px] text-slate-400">{files.length} / 3 file</span>
          </div>

          <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/60 rounded-2xl p-5 text-center transition bg-slate-900/40">
            <input
              type="file"
              id="file_upload"
              multiple
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={files.length >= 3}
            />
            <label
              htmlFor="file_upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-400 hover:underline">
                  Klik untuk memilih file
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Format: JPG, PNG, atau PDF</p>
              </div>
            </label>
          </div>

          {/* Uploaded Files Chips */}
          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-200"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            {isPending ? 'Mengunggah & Menyimpan...' : 'Kirim Permohonan'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
