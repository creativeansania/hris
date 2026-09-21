import React from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { AttendanceRecordItem } from '@/app/actions/attendance';

interface AttendanceHistoryTableProps {
  loading: boolean;
  records: AttendanceRecordItem[];
  onOpenReasonModal: (record: AttendanceRecordItem) => void;
}

export function AttendanceHistoryTable({
  loading,
  records,
  onOpenReasonModal,
}: AttendanceHistoryTableProps) {
  return (
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
              <th className="px-5 py-3 font-semibold">Sumber</th>
              <th className="px-5 py-3 font-semibold">Jam Masuk</th>
              <th className="px-5 py-3 font-semibold">Jam Pulang</th>
              <th className="px-5 py-3 font-semibold">Durasi Kerja</th>
              <th className="px-5 py-3 font-semibold">Status Keterlambatan</th>
              <th className="px-5 py-3 font-semibold">Keterangan / Alasan</th>
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
                  <p className="text-sm font-medium text-slate-400">
                    Belum ada riwayat presensi untuk bulan ini
                  </p>
                </td>
              </tr>
            ) : (
              records.map((rec) => {
                const isLate = rec.late_minutes > 0;
                const isAbsent = rec.is_absent || (!rec.clock_in && !rec.clock_out);
                const isExcused = !!(rec as any).linked_izin_telat_request_id;

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="font-mono font-medium text-white">{rec.attendance_date}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(rec.attendance_date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                        })}
                      </div>
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap font-mono text-[11px]">
                      {rec.source === 'fingerprint' ? (
                        <span className="text-slate-400">Fingerprint</span>
                      ) : (
                        <span className="text-blue-400">Mobile GPS</span>
                      )}
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap font-mono">
                      {rec.clock_in ? (
                        <span
                          className={`font-semibold ${
                            isLate ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {rec.clock_in}
                        </span>
                      ) : (
                        <span className="text-slate-600">--:--</span>
                      )}
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap font-mono">
                      {rec.clock_out ? (
                        <span className="font-semibold text-blue-400">{rec.clock_out}</span>
                      ) : (
                        <span className="text-slate-600">--:--</span>
                      )}
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap font-mono text-slate-400">
                      {rec.work_minutes > 0 ? (
                        `${Math.floor(rec.work_minutes / 60)}j ${rec.work_minutes % 60}m`
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Late Status with Sprint 4 Excused Badge */}
                    <td className="px-5 py-3 whitespace-nowrap">
                      {isAbsent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Alpa
                        </span>
                      ) : isLate ? (
                        isExcused ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            Telat {rec.late_minutes}m (Excused)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                            <AlertTriangle className="w-3 h-3" />
                            Telat {rec.late_minutes}m (Unexcused)
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          Tepat Waktu
                        </span>
                      )}
                    </td>

                    {/* Reason text */}
                    <td className="px-5 py-3 max-w-xs">
                      {isLate ? (
                        rec.late_reason ? (
                          <div>
                            <p
                              className="text-slate-300 text-xs line-clamp-1"
                              title={rec.late_reason}
                            >
                              {rec.late_reason}
                            </p>
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Teralasankan
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Belum isi klarifikasi
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
                          onClick={() => onOpenReasonModal(rec)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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
  );
}
