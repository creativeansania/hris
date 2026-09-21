import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  LogIn,
  LogOut,
} from 'lucide-react';
import { OfficeLocationGeo } from '@/lib/geo/haversine';
import { TodayGpsAttendanceState } from '@/types/database';

interface ClockActionCardProps {
  attendance: TodayGpsAttendanceState | null;
  closestOfficeInfo: {
    office: OfficeLocationGeo | null;
    distanceMeters: number;
    isWithinRadius: boolean;
  } | null;
  notes: string;
  setNotes: (notes: string) => void;
  presetReasons: string[];
  isSubmitting: boolean;
  isLocating: boolean;
  geoCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  feedback: {
    type: 'success' | 'error';
    message: string;
  } | null;
  onClockIn: () => void;
  onClockOut: () => void;
}

export function ClockActionCard({
  attendance,
  closestOfficeInfo,
  notes,
  setNotes,
  presetReasons,
  isSubmitting,
  isLocating,
  geoCoords,
  feedback,
  onClockIn,
  onClockOut,
}: ClockActionCardProps) {
  const hasClockedIn = !!attendance?.clock_in;
  const hasClockedOut = !!attendance?.clock_out;

  return (
    <div className="space-y-4">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <div>
            <p className="font-semibold text-sm">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Main Action Box */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-6">
        {/* If outside radius and not clocked in, show required reason notes */}
        {!hasClockedIn && closestOfficeInfo && !closestOfficeInfo.isWithinRadius && (
          <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Catatan Penugasan / Dinas Luar (Wajib):
            </div>
            <p className="text-xs text-slate-400">
              Karena Anda berada di luar radius kantor ({closestOfficeInfo.distanceMeters}m), tuliskan keterangan singkat agenda kerja Anda hari ini.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {presetReasons.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNotes(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kunjungan klien ke PT Maju Terus di Senayan..."
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Buttons State */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {hasClockedOut ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Presensi harian Anda telah lengkap untuk hari ini.
              </span>
            ) : hasClockedIn ? (
              <span>
                Anda sudah Clock In jam <strong className="text-white font-mono">{attendance.clock_in}</strong>. Klik tombol untuk mengakhiri jam kerja.
              </span>
            ) : (
              <span>
                Pastikan posisi GPS sudah akurat sebelum menekan tombol Clock In.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!hasClockedIn ? (
              <button
                type="button"
                disabled={isSubmitting || isLocating || !geoCoords}
                onClick={onClockIn}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Presensi...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Clock In Sekarang</span>
                  </>
                )}
              </button>
            ) : !hasClockedOut ? (
              <button
                type="button"
                disabled={isSubmitting || isLocating}
                onClick={onClockOut}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-amber-500/25 active:scale-[0.98] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Pulang...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Clock Out (Pulang)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="px-6 py-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-mono font-medium border border-slate-700">
                Presensi Hari Ini Selesai
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
