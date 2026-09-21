'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/reports/export-button';
import {
  getReportingMetrics,
  ReportingMetricsResult,
  ReportFilterPayload,
} from '@/app/actions/reports';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { HeroDisciplineCard } from './hero-discipline-card';
import { SecondaryMetricsGrid } from './secondary-metrics-grid';
import { DivisionAttendanceTable } from './division-attendance-table';
import { ExecutiveCostSummary } from './executive-cost-summary';
import { DashboardFilterStrip } from './dashboard-filter-strip';
import { EmployeeRosterTable } from './employee-roster-table';

export function DashboardClient() {
  const [isPending, startTransition] = useTransition();
  const { email: rawUserEmail } = useCurrentUser();
  const userEmail = rawUserEmail || '';

  // Filter States
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedDivision, setSelectedDivision] = useState<string>('all');

  // Active Perspective: 'hr' (Operasional SDM) or 'management' (Executive & Biaya)
  const [activeTab, setActiveTab] = useState<'hr' | 'management'>('hr');

  // Metrics State
  const [metrics, setMetrics] = useState<ReportingMetricsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      const result = await getReportingMetrics(payload);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setMetrics(result);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadMetrics(selectedMonth, selectedYear, selectedDivision, userEmail);
  }, [selectedMonth, selectedYear, selectedDivision, userEmail]);

  const selectedDivisionObj = metrics?.divisionsList.find(
    (d) => d.id === selectedDivision
  );
  const divisionLabel = selectedDivisionObj ? selectedDivisionObj.name : 'Semua Divisi';

  return (
    <div className="space-y-6">
      {/* 1. Header & Filter Bar */}
      <PageHeader
        title="Reporting & Analytics"
        description="Rekapitulasi kehadiran, keterlambatan, lembur, dan proyeksi biaya SDM."
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Sistem Aktif
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">
              {metrics?.filterPeriod.label || 'Memuat periode...'}
            </span>
          </div>
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadMetrics()}
          disabled={loading}
          className="border-slate-800 text-slate-300 hover:text-white"
        >
          <RefreshCw
            className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin text-blue-400' : ''}`}
          />
          Segarkan
        </Button>

        {metrics && (
          <ExportButton
            data={metrics.employeeRows}
            periodLabel={metrics.filterPeriod.label}
            divisionLabel={divisionLabel}
          />
        )}
      </PageHeader>

      {/* 2. Interactive Filter Strip */}
      <DashboardFilterStrip
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedDivision={selectedDivision}
        onDivisionChange={setSelectedDivision}
        divisions={metrics?.divisionsList || []}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
          <p className="text-xs text-slate-400 font-mono">
            Memuat dan menghitung metrik pelaporan...
          </p>
        </div>
      )}

      {metrics && (
        <>
          {/* PERSPECTIVE 1: OPERASIONAL SDM (HR VIEW) */}
          {activeTab === 'hr' && (
            <div className="space-y-6">
              {/* Asymmetric Hero KPI + Secondary Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <HeroDisciplineCard
                  onTimeRate={metrics.overall.onTimeRate}
                  totalPresentDays={metrics.overall.totalPresentDays}
                  totalLateDays={metrics.overall.totalLateDays}
                />

                <SecondaryMetricsGrid
                  totalLateMinutes={metrics.overall.totalLateMinutes}
                  totalExcusedLateDays={metrics.overall.totalExcusedLateDays}
                  totalLateDays={metrics.overall.totalLateDays}
                  totalOvertimeHours={metrics.overall.totalOvertimeHours}
                  totalLeaveDays={metrics.overall.totalLeaveDays}
                />
              </div>

              {/* Division Breakdown Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DivisionAttendanceTable divisions={metrics.divisionBreakdowns} />
              </div>
            </div>
          )}

          {/* PERSPECTIVE 2: EXECUTIVE & BIAYA (MANAGEMENT VIEW) */}
          {activeTab === 'management' && (
            <ExecutiveCostSummary
              cost={metrics.managementCost}
              divisions={metrics.divisionBreakdowns}
              topOvertimeEmployees={metrics.topOvertimeEmployees}
            />
          )}

          {/* SECTION 3: REKAPITULASI DETAIL PRESENSI KARYAWAN (UNIVERSAL TABLE) */}
          <EmployeeRosterTable
            rows={metrics.employeeRows}
            periodLabel={metrics.filterPeriod.label}
            activeTab={activeTab}
          />
        </>
      )}
    </div>
  );
}
