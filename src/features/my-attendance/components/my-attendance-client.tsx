'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, FilePlus } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  getMyAttendanceHistory,
  AttendanceRecordItem,
} from '@/app/actions/attendance';
import {
  checkCanApplyIzinTelat,
  getMyIzinTelatHistory,
  getMyLateAccumulation,
} from '@/app/actions/late-attendance';
import {
  LateAccumulationItem,
  IzinTelatItem,
  IzinTelatCheckResult,
} from '@/types/database';
import { AttendanceSummaryCards } from './attendance-summary-cards';
import { LateDisciplineCard } from './late-discipline-card';
import { AttendanceHistoryTable } from './attendance-history-table';
import { IzinTelatModal } from './izin-telat-modal';
import { LateReasonModal } from './late-reason-modal';

export function MyAttendanceClient() {
  const { email: currentUserEmail } = useCurrentUser();
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [summary, setSummary] = useState<{
    presentDays: number;
    onTimeDays: number;
    lateDays: number;
    totalLateMinutes: number;
    absentDays: number;
  } | null>(null);
  const [lateAccumulation, setLateAccumulation] = useState<LateAccumulationItem | null>(null);
  const [, setIzinTelatHistory] = useState<unknown[]>([]);
  const [employeeInfo, setEmployeeInfo] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Modal States
  const [activeRecordForReason, setActiveRecordForReason] = useState<AttendanceRecordItem | null>(null);
  const [isIzinTelatModalOpen, setIsIzinTelatModalOpen] = useState(false);
  const [izinTelatCheck, setIzinTelatCheck] = useState<IzinTelatCheckResult | null>(null);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const email = currentUserEmail || 'itkantiss@gmail.com';

      const [attRes, accumRes, izinRes, checkRes] = await Promise.all([
        getMyAttendanceHistory(email, selectedMonth, selectedYear),
        getMyLateAccumulation(email, selectedYear, selectedMonth),
        getMyIzinTelatHistory(email),
        checkCanApplyIzinTelat(email),
      ]);

      if (attRes.data) setRecords(attRes.data);
      if (attRes.summary) setSummary(attRes.summary);
      if (attRes.employee) setEmployeeInfo(attRes.employee);
      if (accumRes.data) setLateAccumulation(accumRes.data);
      if (izinRes.data) setIzinTelatHistory(izinRes.data);
      if (checkRes) setIzinTelatCheck(checkRes as IzinTelatCheckResult);
    } catch (err) {
      console.error('Error fetching my attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, currentUserEmail]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleReasonSuccess = (updatedId: string, newReason: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === updatedId
          ? {
              ...r,
              late_reason: newReason,
              late_reason_filled_at: new Date().toISOString(),
            }
          : r
      )
    );
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
            Rekapitulasi kehadiran harian, ketepatan waktu, pengajuan izin telat, dan monitoring sanksi.
            {employeeInfo && (
              <span className="text-slate-300 font-medium ml-1">
                ({employeeInfo.full_name})
              </span>
            )}
          </p>
        </div>

        {/* Actions & Month Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsIzinTelatModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-amber-600/15 border border-amber-500/30 text-amber-300 hover:bg-amber-600/25 text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/10 active:scale-[0.98] cursor-pointer"
          >
            <FilePlus className="w-4 h-4 text-amber-400" />
            <span>Ajukan Izin Telat</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
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
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Segarkan data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <AttendanceSummaryCards summary={summary} />

      {/* Discipline & Late Accumulation Breakdown Card */}
      <LateDisciplineCard lateAccumulation={lateAccumulation} />

      {/* Attendance History Table */}
      <AttendanceHistoryTable
        loading={loading}
        records={records}
        onOpenReasonModal={(rec) => setActiveRecordForReason(rec)}
      />

      {/* Modal Form Pengajuan Izin Telat */}
      <IzinTelatModal
        isOpen={isIzinTelatModalOpen}
        onClose={() => setIsIzinTelatModalOpen(false)}
        employeeEmail={employeeInfo?.email}
        izinTelatCheck={izinTelatCheck}
        onSuccess={fetchAttendance}
      />

      {/* Modal Alasan Keterlambatan Aktual */}
      <LateReasonModal
        record={activeRecordForReason}
        onClose={() => setActiveRecordForReason(null)}
        onSuccess={handleReasonSuccess}
      />
    </div>
  );
}
