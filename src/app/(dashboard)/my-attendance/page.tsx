'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  X,
  RefreshCw,
  UserCheck,
  ChevronRight,
  Sparkles,
  Info,
  Timer,
  CalendarDays,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getMyAttendanceHistory,
  fillLateReason,
  AttendanceRecordItem,
} from '@/app/actions/attendance';

export default function MyAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [summary, setSummary] = useState<{
    presentDays: number;
    onTimeDays: number;
    lateDays: number;
    totalLateMinutes: number;
    absentDays: number;
  } | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Late reason modal state
  const [activeRecordForReason, setActiveRecordForReason] = useState<AttendanceRecordItem | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);
  const [reasonFeedback, setReasonFeedback] = useState<string | null>(null);

  // Quick reason presets
  const reasonPresets = [
    'Macet lalu lintas ekstrem di jalan utama',
    'Kendala kendaraan / mogok di perjalanan',
    'Keperluan keluarga mendesak di pagi hari',
    'Cuaca buruk / hujan lebat & banjir',
    'Kunjungan dinas luar sebelum ke kantor',
  ];

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = user?.email || 'itkantiss@gmail.com';

      const res = await getMyAttendanceHistory(email, selectedMonth, selectedYear);
      if (res.data) {
        setRecords(res.data);
      }
      if (res.summary) {
        setSummary(res.summary);
      }
      if (res.employee) {
        setEmployeeInfo(res.employee);
      }
    } catch (err) {
      console.error('Error fetching my attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedYear]);

  const handleOpenReasonModal = (rec: AttendanceRecordItem) => {
    setActiveRecordForReason(rec);
    setReasonInput(rec.late_reason || '');
    setReasonFeedback(null);
  };

  const handleSubmitReason = async () => {
    if (!activeRecordForReason || !reasonInput.trim()) return;

    setIsSubmittingReason(true);
    setReasonFeedback(null);

    try {
      const res = await fillLateReason(activeRecordForReason.id, reasonInput.trim());
      setIsSubmittingReason(false);

      if (res.success) {
        // Update state locally
        setRecords((prev) =>
          prev.map((r) =>
            r.id === activeRecordForReason.id
              ? {
                  ...r,
                  late_reason: reasonInput.trim(),
                  late_reason_filled_at: new Date().toISOString(),
                }
              : r
          )
        );
        setActiveRecordForReason(null);
      } else {
        setReasonFeedback(res.error || 'Gagal menyimpan alasan keterlambatan');
      }
    } catch (err: any) {
      setIsSubmittingReason(false);
      setReasonFeedback(err?.message || 'Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-blue-400" />
              Presensi Saya
            </h1>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Personal View
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Rekapitulasi catatan kehadiran harian, ketepatan waktu, dan pengisian alasan keterlambatan.
            {employeeInfo && (
              <span className="text-slate-300 font-medium ml-1">
                ({employeeInfo.full_name})
              </span>
            )}
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs text-slate-200 px-2 py-1 focus:outline-none"
            >
              {[
                { m: 1, label: 'Januari' },
                { m: 2, label: 'Februari' },
                { m: 3, label: 'Maret' },
                { m: 4, label: 'April' },
                { m: 5, label: 'Mei' },
                { m: 6, label: 'Juni' },
                { m: 7, label: 'Juli' },
                { m: 8, label: 'Agustus' },
                { m: 9, label: 'September' },
                { m: 10, label: 'Oktober' },
                { m: 11, label: 'November' },
                { m: 12, label: 'Desember' },
              ].map((m) => (
                <option key={m.m} value={m.m} className="bg-[#0b1120]">
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono text-slate-300 px-2">{selectedYear}</span>
          </div>

          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Segarkan data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Kehadiran Bulan Ini</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {summary?.presentDays || 0}
            </span>
            <span className="text-xs text-slate-500">Hari Kerja</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Tepat Waktu</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {summary?.onTimeDays || 0}
            </span>
            <span className="text-xs text-slate-500">Hari</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Hari Terlambat</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">
              {summary?.lateDays || 0}
            </span>
            <span className="text-xs text-slate-500">Hari</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Akumulasi Menit Telat</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 font-mono">
              {summary?.totalLateMinutes || 0}
            </span>
            <span className="text-xs text-slate-500">Menit</span>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden backdrop-blur-sm">
        <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              Catatan Presensi Harian
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {records.length} Hari Tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-5 py-3 font-semibold">Tanggal</th>
                <th className="px-5 py-3 font-semibold">Sumber Presensi</th>
                <th className="px-5 py-3 font-semibold">Jam Masuk</th>
                <th className="px-5 py-3 font-semibold">Jam Pulang</th>
                <th className="px-5 py-3 font-semibold">Durasi Kerja</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Alasan Keterlambatan</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat riwayat presensi...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">Belum ada riwayat presensi untuk bulan ini</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Data akan tampil setelah HR mengimpor log mesin presensi atau melakukan clock-in.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const isLate = rec.late_minutes > 0;
                  const isAbsent = rec.is_absent || (!rec.clock_in && !rec.clock_out);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Date */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-mono font-medium text-white">{rec.attendance_date}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(rec.attendance_date).toLocaleDateString('id-ID', {
                            weekday: 'long',
                          })}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-5 py-3 whitespace-nowrap font-mono text-[11px]">
                        {rec.source === 'fingerprint' ? (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            Mesin Fingerprint
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-400">
                            Mobile GPS
                          </span>
                        )}
                      </td>

                      {/* Clock In */}
                      <td className="px-5 py-3 whitespace-nowrap font-mono">
                        {rec.clock_in ? (
                          <span className={`font-semibold ${isLate ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {rec.clock_in}
                          </span>
                        ) : (
                          <span className="text-slate-600">--:--</span>
                        )}
                      </td>

                      {/* Clock Out */}
                      <td className="px-5 py-3 whitespace-nowrap font-mono">
                        {rec.clock_out ? (
                          <span className="font-semibold text-blue-400">{rec.clock_out}</span>
                        ) : (
                          <span className="text-slate-600">--:--</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-3 whitespace-nowrap font-mono text-slate-400">
                        {rec.work_minutes > 0 ? (
                          `${Math.floor(rec.work_minutes / 60)}j ${rec.work_minutes % 60}m`
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {isAbsent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Alpa / Tidak Hadir
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                            Telat {rec.late_minutes}m
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            Tepat Waktu
                          </span>
                        )}
                      </td>

                      {/* Late Reason */}
                      <td className="px-5 py-3 max-w-xs">
                        {isLate ? (
                          rec.late_reason ? (
                            <div>
                              <p className="text-slate-300 text-xs line-clamp-1" title={rec.late_reason}>
                                {rec.late_reason}
                              </p>
                              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Teralasankan
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Wajib diisi
                            </span>
                          )
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        {isLate && (
                          <button
                            onClick={() => handleOpenReasonModal(rec)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              rec.late_reason
                                ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                                : 'bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                            }`}
                          >
                            {rec.late_reason ? 'Ubah Alasan' : 'Isi Alasan'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Late Reason Modal Dialog */}
      {activeRecordForReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Alasan Keterlambatan Presensi
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Berikan klarifikasi alasan kedatangan melebihi batas jam kerja.
                </p>
              </div>

              <button
                onClick={() => setActiveRecordForReason(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Record Context Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Tanggal</span>
                  <p className="font-semibold text-white font-mono mt-0.5">
                    {activeRecordForReason.attendance_date}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Jam Masuk</span>
                  <p className="font-semibold text-amber-400 font-mono mt-0.5">
                    {activeRecordForReason.clock_in}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-mono text-[10px] uppercase">Keterlambatan</span>
                  <p className="font-semibold text-rose-400 font-mono mt-0.5">
                    +{activeRecordForReason.late_minutes} Menit
                  </p>
                </div>
              </div>

              {/* Presets Chips */}
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
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
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

              {reasonFeedback && (
                <p className="text-xs text-rose-400 font-medium">{reasonFeedback}</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 bg-[#090d16] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveRecordForReason(null)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={!reasonInput.trim() || isSubmittingReason}
                onClick={handleSubmitReason}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
              >
                {isSubmittingReason ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Alasan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
