'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/reports/export-button';
import {
  getReportingMetrics,
  ReportingMetricsResult,
  ReportFilterPayload,
} from '@/app/actions/reports';
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  Layers,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  DollarSign,
  PieChart,
  BarChart3,
  Flame,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ReportingDashboardPage() {
  const [isPending, startTransition] = useTransition();

  // Filter States
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  // Active Perspective: 'hr' (Operasional SDM) or 'management' (Executive & Biaya)
  const [activeTab, setActiveTab] = useState<'hr' | 'management'>('hr');

  // Metrics State
  const [metrics, setMetrics] = useState<ReportingMetricsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Month Names for Picker
  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  // Initial user session
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  // Fetch report data
  const loadMetrics = (
    m: number = selectedMonth,
    y: number = selectedYear,
    divId: string = selectedDivision,
    email: string = userEmail
  ) => {
    setLoading(true);
    setErrorMsg(null);

    startTransition(async () => {
      const payload: ReportFilterPayload = {
        month: m,
        year: y,
        divisionId: divId,
        userEmail: email,
      };

      const res = await getReportingMetrics(payload);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setMetrics(res);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadMetrics(selectedMonth, selectedYear, selectedDivision, userEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedDivision, userEmail]);

  // Format IDR Currency
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filtered employee rows for search query
  const filteredEmployeeRows = (metrics?.employeeRows || []).filter((row) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.fullName.toLowerCase().includes(q) ||
      (row.nik && row.nik.toLowerCase().includes(q)) ||
      row.divisionName.toLowerCase().includes(q)
    );
  });

  const selectedDivisionObj = metrics?.divisionsList.find(
    (d) => d.id === selectedDivision
  );
  const divisionLabel = selectedDivisionObj ? selectedDivisionObj.name : 'Semua Divisi';

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SPRINT 8 — REPORTING DASHBOARD
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">
              {metrics?.filterPeriod.label || 'Memuat periode...'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Reporting & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Rekapitulasi kehadiran, analisis keterlambatan, jam lembur, kuota cuti, dan proyeksi biaya payroll SDM.
          </p>
        </div>

        {/* Global Action & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMetrics()}
            disabled={loading}
            className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            Segarkan
          </Button>

          {metrics && (
            <ExportButton
              data={metrics.employeeRows}
              periodLabel={metrics.filterPeriod.label}
              divisionLabel={divisionLabel}
            />
          )}
        </div>
      </div>

      {/* 2. Interactive Filter Controls Strip */}
      <div className="bg-[#111827]/70 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filter Data:</span>
          </div>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Division Selector */}
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 max-w-[200px]"
          >
            <option value="all">Semua Divisi</option>
            {metrics?.divisionsList.map((div) => (
              <option key={div.id} value={div.id}>
                {div.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dual-Perspective Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('hr')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'hr'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Operasional SDM (HR)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('management')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'management'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Executive & Biaya (Management)</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !metrics && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-xs text-slate-400 font-mono">Memuat dan menghitung metrik pelaporan...</p>
        </div>
      )}

      {metrics && (
        <>
          {/* ========================================================================= */}
          {/* PERSPECTIVE 1: OPERASIONAL SDM (HR VIEW)                                  */}
          {/* ========================================================================= */}
          {activeTab === 'hr' && (
            <div className="space-y-6">
              {/* HR Top Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* On-Time Rate */}
                <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Tingkat Tepat Waktu</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
                      {metrics.overall.onTimeRate}
                      <span className="text-sm font-normal text-slate-400">%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {metrics.overall.totalPresentDays} hari tepat waktu dari {metrics.overall.totalPresentDays + metrics.overall.totalLateDays} presensi
                    </p>
                  </div>
                </Card>

                {/* Late Count & Minutes */}
                <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Total Keterlambatan</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono text-amber-400 flex items-baseline gap-1">
                      {metrics.overall.totalLateMinutes}
                      <span className="text-sm font-normal text-slate-400">menit</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {metrics.overall.totalLateDays} kejadian ({metrics.overall.totalExcusedLateDays} izin telat sah)
                    </p>
                  </div>
                </Card>

                {/* Approved Overtime Hours */}
                <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Jam Lembur Disetujui</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono text-purple-300 flex items-baseline gap-1">
                      {metrics.overall.totalOvertimeHours.toFixed(1)}
                      <span className="text-sm font-normal text-slate-400">jam</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Disetujui atasan & lolos verifikasi HR
                    </p>
                  </div>
                </Card>

                {/* Leave Days */}
                <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Cuti & Izin Diambil</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono text-blue-400 flex items-baseline gap-1">
                      {metrics.overall.totalLeaveDays}
                      <span className="text-sm font-normal text-slate-400">hari</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Cuti tahunan, izin sakit, dan izin resmi
                    </p>
                  </div>
                </Card>
              </div>

              {/* Visual Breakdown Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Division Breakdown (2 Cols) */}
                <Card className="lg:col-span-2">
                  <CardHeader
                    title="Performa Presensi per Divisi"
                    subtitle="Komparasi tingkat disiplin tepat waktu dan akumulasi menit telat"
                  />

                  {metrics.divisionBreakdowns.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      Belum ada data presensi untuk divisi dalam periode ini.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {metrics.divisionBreakdowns.map((div) => (
                        <div key={div.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-xs font-semibold text-slate-200">
                                {div.name}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-2">
                                ({div.employeeCount} karyawan)
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {div.onTimeRate}% Tepat Waktu
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${div.onTimeRate}%` }}
                            />
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>Hadir: {div.presentDays} hari</span>
                            <span className="text-amber-400/90">Telat: {div.lateDays}x ({div.totalLateMinutes} mnt)</span>
                            <span className="text-purple-400/90">Lembur: {div.overtimeHours.toFixed(1)} jam</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Top Late Employees (1 Col) */}
                <Card>
                  <CardHeader
                    title="Top 5 Keterlambatan"
                    subtitle="Karyawan dengan akumulasi menit telat terbanyak"
                  />

                  {metrics.topLateEmployees.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      Tidak ada catatan keterlambatan pada periode ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.topLateEmployees.map((emp, idx) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                              #{idx + 1}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-medium text-slate-200 truncate">
                                {emp.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {emp.divisionName}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono">
                            <span className="text-xs font-bold text-rose-400">
                              {emp.value} mnt
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {emp.frequency}x telat
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PERSPECTIVE 2: EXECUTIVE & BIAYA (MANAGEMENT VIEW)                         */}
          {/* ========================================================================= */}
          {activeTab === 'management' && (
            <div className="space-y-6">
              {/* Executive Cost Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Base Salary */}
                <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Total Gaji Pokok (Kontrak)</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-bold font-mono text-white">
                      {formatIDR(metrics.managementCost.totalBaseSalary)}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Berdasarkan kontrak kerja aktif PKWT/PKWTT
                    </p>
                  </div>
                </Card>

                {/* Overtime Pay Cost */}
                <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Estimasi Upah Lembur</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-bold font-mono text-purple-300">
                      {formatIDR(metrics.managementCost.totalOvertimeCost)}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Formula Depnaker (1/173 × Gaji Pokok × 1.5)
                    </p>
                  </div>
                </Card>

                {/* Late Deductions */}
                <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Estimasi Potongan Telat</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {formatIDR(metrics.managementCost.estimatedLateDeductions)}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Potongan keterlambatan tanpa izin sah
                    </p>
                  </div>
                </Card>

                {/* Net Estimated Cost */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-purple-950/30 border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-300">Estimasi Beban Kompensasi</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <PieChart className="w-4 h-4 text-purple-300" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {formatIDR(metrics.managementCost.estimatedTotalPayroll)}
                    </div>
                    <p className="text-[11px] text-purple-300/80 mt-1">
                      Rata-rata {formatIDR(metrics.managementCost.averageCostPerEmployee)} / orang
                    </p>
                  </div>
                </Card>
              </div>

              {/* Division Cost Comparison & Top Overtime */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Division Cost Allocation (2 Cols) */}
                <Card className="lg:col-span-2">
                  <CardHeader
                    title="Alokasi Beban Gaji & Lembur per Divisi"
                    subtitle="Proyeksi pengeluaran kompensasi bulanan per unit kerja"
                  />

                  {metrics.divisionBreakdowns.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      Belum ada data biaya untuk divisi dalam periode ini.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {metrics.divisionBreakdowns.map((div) => {
                        // Rough proportion
                        const divProportion =
                          metrics.managementCost.totalBaseSalary > 0
                            ? Math.round((div.totalBaseSalary / metrics.managementCost.totalBaseSalary) * 100)
                            : 0;

                        return (
                          <div key={div.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-slate-200">
                                {div.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-white">
                                {formatIDR(div.totalBaseSalary)}
                              </span>
                            </div>

                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${divProportion}%` }}
                              />
                            </div>

                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                              <span>{div.employeeCount} karyawan ({divProportion}% dari total)</span>
                              <span className="text-purple-400">Total Lembur: {div.overtimeHours.toFixed(1)} jam</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Top 5 Overtime Contributors (1 Col) */}
                <Card>
                  <CardHeader
                    title="Top 5 Jam Lembur Terbanyak"
                    subtitle="Staf dengan jam kerja lembur tertinggi"
                  />

                  {metrics.topOvertimeEmployees.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      Tidak ada data lembur pada periode ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.topOvertimeEmployees.map((emp, idx) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                              #{idx + 1}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-medium text-slate-200 truncate">
                                {emp.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {emp.divisionName}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono">
                            <span className="text-xs font-bold text-purple-300">
                              {emp.value.toFixed(1)} jam
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: REKAPITULASI DETAIL PRESENSI KARYAWAN (UNIVERSAL TABLE)         */}
          {/* ========================================================================= */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Roster Rekapitulasi Presensi & Lembur Karyawan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Menampilkan seluruh karyawan aktif dalam periode {metrics.filterPeriod.label}
                </p>
              </div>

              {/* Search filter input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, NIK, divisi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {filteredEmployeeRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Tidak ada karyawan yang sesuai dengan kriteria pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Karyawan</th>
                      <th className="px-4 py-3">Divisi</th>
                      <th className="px-4 py-3 text-center">Tepat Waktu</th>
                      <th className="px-4 py-3 text-center">Keterlambatan</th>
                      <th className="px-4 py-3 text-center">Jam Lembur</th>
                      <th className="px-4 py-3 text-center">Cuti / Izin</th>
                      {activeTab === 'management' && (
                        <th className="px-4 py-3 text-right">Gaji Pokok</th>
                      )}
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredEmployeeRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                        {/* Employee Name & NIK */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-100">{row.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {row.nik || '-'} &bull; <span className="uppercase text-[10px] text-slate-500">{row.role}</span>
                          </div>
                        </td>

                        {/* Division */}
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700/60">
                            {row.divisionName}
                          </span>
                        </td>

                        {/* Present Days */}
                        <td className="px-4 py-3 text-center font-mono">
                          <span className="text-emerald-400 font-semibold">{row.presentDays}</span> hari
                        </td>

                        {/* Late Days & Minutes */}
                        <td className="px-4 py-3 text-center font-mono">
                          {row.lateDays > 0 ? (
                            <div>
                              <span className="text-amber-400 font-semibold">{row.lateDays}x</span> ({row.totalLateMinutes} mnt)
                              {row.excusedLateDays > 0 && (
                                <span className="block text-[10px] text-emerald-400/90">
                                  {row.excusedLateDays} izin sah
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>

                        {/* Overtime Hours */}
                        <td className="px-4 py-3 text-center font-mono">
                          {row.overtimeHours > 0 ? (
                            <span className="text-purple-400 font-semibold">
                              {row.overtimeHours.toFixed(1)} jam
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>

                        {/* Leave Days */}
                        <td className="px-4 py-3 text-center font-mono">
                          {row.leaveDays > 0 ? (
                            <span className="text-blue-400 font-semibold">{row.leaveDays} hari</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>

                        {/* Base Salary (Management Tab) */}
                        {activeTab === 'management' && (
                          <td className="px-4 py-3 text-right font-mono text-slate-200">
                            {row.baseSalary > 0 ? formatIDR(row.baseSalary) : '-'}
                          </td>
                        )}

                        {/* Action Link */}
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/employees/${row.id}`}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            <span>Profil</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
