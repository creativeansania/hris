'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import {
  parseAndPreviewFingerprint,
  confirmAttendanceImport,
  getAttendanceManagement,
  getAttendanceBatches,
  ImportPreviewResult,
  AttendanceRecordItem,
} from '@/app/actions/attendance';
import {
  getPendingGpsAttendanceList,
  reviewGpsAttendance,
} from '@/app/actions/gps-attendance';
import {
  getPendingIzinTelatList,
  decideIzinTelat,
  getLateAccumulationsSummary,
  recalculateAllLateAccumulations,
  createAttendanceCorrection,
  getAttendanceCorrections,
} from '@/app/actions/late-attendance';
import { getDivisions } from '@/app/actions/divisions';
import { getEmployees } from '@/app/actions/employees';
import { Division, Employee } from '@/types/database';
import {
  AttendanceMetrics,
  AttendanceFilterBar,
  AttendanceRecordsTable,
  GpsReviewList,
  IzinTelatList,
  LateAccumulationsTable,
  AttendanceCorrectionModal,
  AttendanceImportModal,
  BatchHistoryModal,
} from '@/features/attendance';
import {
  Fingerprint,
  Clock,
  Smartphone,
  AlertTriangle,
  History,
  Upload,
  RefreshCw,
  Users,
} from 'lucide-react';

export default function AttendanceManagementPage() {
  const [isPending, startTransition] = useTransition();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<
    'all' | 'izin-telat' | 'late-accumulations' | 'gps-review'
  >('all');

  // Main data states
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [gpsRecords, setGpsRecords] = useState<any[]>([]);
  const [izinTelatList, setIzinTelatList] = useState<any[]>([]);
  const [lateAccumulations, setLateAccumulations] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [activeCorrectionRecord, setActiveCorrectionRecord] = useState<AttendanceRecordItem | null>(null);
  const [pastCorrections, setPastCorrections] = useState<any[]>([]);
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  // Import wizard state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [currentImportFile, setCurrentImportFile] = useState<File | null>(null);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    success: boolean;
    message: string;
    inserted?: number;
    skipped?: number;
  } | null>(null);

  // Action states
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [decidingIzinId, setDecidingIzinId] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Load all attendance data
  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, divRes, batchRes, gpsRes, izinRes, accumRes] = await Promise.all([
        getAttendanceManagement({
          month: selectedMonth,
          year: selectedYear,
          divisionId: selectedDivision,
        }),
        getDivisions(),
        getAttendanceBatches(),
        getPendingGpsAttendanceList(),
        getPendingIzinTelatList(),
        getLateAccumulationsSummary(selectedYear, selectedMonth, selectedDivision),
      ]);

      if (attRes.data) setRecords(attRes.data);
      if (divRes.data) setDivisions(divRes.data);
      if (batchRes.data) setBatches(batchRes.data);
      if (gpsRes.data) setGpsRecords(gpsRes.data);
      if (izinRes.data) setIzinTelatList(izinRes.data);
      if (accumRes.data) setLateAccumulations(accumRes.data);
    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, selectedDivision]);

  // Filtered attendance records
  const filteredRecords = records.filter((rec) => {
    const nameMatch =
      !searchQuery ||
      rec.employee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.employee?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    let statusMatch = true;
    if (statusFilter === 'present') {
      statusMatch = !!rec.clock_in && rec.late_minutes === 0 && !rec.is_absent;
    } else if (statusFilter === 'late') {
      statusMatch = rec.late_minutes > 0;
    } else if (statusFilter === 'absent') {
      statusMatch = rec.is_absent || (!rec.clock_in && !rec.clock_out);
    }

    return nameMatch && statusMatch;
  });

  // Filtered GPS records
  const filteredGpsRecords = gpsRecords.filter((g) => {
    if (!searchQuery) return true;
    const name = g.employee?.full_name?.toLowerCase() || '';
    const email = g.employee?.email?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  // GPS Review action
  const handleReviewGps = async (attendanceId: string, decision: 'approved' | 'rejected') => {
    setReviewingId(attendanceId);
    try {
      const res = await reviewGpsAttendance(attendanceId, decision);
      if (res.success) {
        await loadData();
      }
    } finally {
      setReviewingId(null);
    }
  };

  // Izin Telat decision action
  const handleDecideIzin = async (requestId: string, decision: 'approved' | 'rejected') => {
    setDecidingIzinId(requestId);
    try {
      const res = await decideIzinTelat(requestId, decision);
      if (res.success) {
        await loadData();
      }
    } finally {
      setDecidingIzinId(null);
    }
  };

  // Recalculate late accumulations
  const handleRecalculateAccumulations = async () => {
    setIsRecalculating(true);
    try {
      await recalculateAllLateAccumulations(selectedYear, selectedMonth);
      await loadData();
    } finally {
      setIsRecalculating(false);
    }
  };

  // Open correction modal
  const handleOpenCorrection = async (rec: AttendanceRecordItem) => {
    setActiveCorrectionRecord(rec);
    setCorrectionFeedback(null);
    setIsCorrectionModalOpen(true);
    const past = await getAttendanceCorrections(rec.id);
    if (past.data) {
      setPastCorrections(past.data);
    }
  };

  // Submit attendance correction
  const handleSubmitCorrection = async (
    attendanceId: string,
    clockIn: string,
    clockOut: string,
    reason: string
  ) => {
    setIsSavingCorrection(true);
    try {
      const res = await createAttendanceCorrection({
        attendanceId,
        correctedClockIn: clockIn,
        correctedClockOut: clockOut,
        reason,
      });
      if (res.error) {
        setCorrectionFeedback(`Gagal: ${res.error}`);
      } else {
        setCorrectionFeedback('Koreksi jam presensi berhasil disimpan.');
        await loadData();
        setTimeout(() => setIsCorrectionModalOpen(false), 1200);
      }
    } finally {
      setIsSavingCorrection(false);
    }
  };

  // File import analyze
  const handleAnalyzeFile = async (file: File) => {
    setCurrentImportFile(file);
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        const res = await parseAndPreviewFingerprint(base64, file.name);
        setPreviewResult(res);
        setIsAnalyzing(false);
      };
      reader.onerror = () => {
        setImportFeedback({ success: false, message: 'Gagal membaca berkas' });
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setImportFeedback({ success: false, message: err.message || 'Gagal membaca berkas' });
      setIsAnalyzing(false);
    }
  };

  // File import confirm
  const handleConfirmImport = async (duplicateHandling: 'skip' | 'overwrite') => {
    if (!previewResult || !currentImportFile) return;
    setIsSavingImport(true);
    try {
      const res = await confirmAttendanceImport({
        fileName: currentImportFile.name,
        period_start: previewResult.period_start,
        period_end: previewResult.period_end,
        rows: previewResult.rows,
        duplicateHandling,
      });

      if (res.success) {
        setImportFeedback({
          success: true,
          message: `Berhasil import presensi: ${res.inserted_count || 0} ditambahkan, ${res.skipped_count || 0} dilewati.`,
          inserted: res.inserted_count,
          skipped: res.skipped_count,
        });
        await loadData();
        setTimeout(() => {
          setIsImportModalOpen(false);
          setPreviewResult(null);
          setCurrentImportFile(null);
          setImportFeedback(null);
        }, 1500);
      } else {
        setImportFeedback({ success: false, message: res.error || 'Gagal menyimpan impor' });
      }
    } finally {
      setIsSavingImport(false);
    }
  };

  const pendingGpsCount = gpsRecords.filter((g) => g.review_status === 'pending_review').length;
  const pendingIzinCount = izinTelatList.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        title="Manajemen Presensi"
        description="Rekapitulasi log fingerprint, verifikasi presensi GPS mobile, dispensasi keterlambatan, dan koreksi data."
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Operasional Kehadiran
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">Fingerprint & Mobile GPS</span>
          </div>
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="border-slate-800 text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          Segarkan
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsHistoryModalOpen(true)}
          className="border-slate-800 text-slate-300 hover:text-white"
        >
          <History className="w-4 h-4 mr-1.5 text-slate-400" />
          Riwayat Impor
        </Button>

        <Button
          size="sm"
          onClick={() => {
            setPreviewResult(null);
            setCurrentImportFile(null);
            setImportFeedback(null);
            setIsImportModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
        >
          <Upload className="w-4 h-4 mr-1.5" />
          Import Fingerprint
        </Button>
      </PageHeader>

      {/* 2. Top Metric Cards */}
      <AttendanceMetrics records={records} />

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>Semua Rekap Presensi ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gps-review')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'gps-review'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Verifikasi GPS</span>
          {pendingGpsCount > 0 && (
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30">
              {pendingGpsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('izin-telat')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'izin-telat'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Dispensasi Telat</span>
          {pendingIzinCount > 0 && (
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30">
              {pendingIzinCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('late-accumulations')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'late-accumulations'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Akumulasi & Sanksi Keterlambatan</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <AttendanceFilterBar
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            selectedDivision={selectedDivision}
            onDivisionChange={setSelectedDivision}
            divisions={divisions}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <AttendanceRecordsTable
            records={filteredRecords}
            onEditRecord={handleOpenCorrection}
          />
        </div>
      )}

      {activeTab === 'gps-review' && (
        <GpsReviewList
          records={filteredGpsRecords}
          onReview={handleReviewGps}
          reviewingId={reviewingId}
        />
      )}

      {activeTab === 'izin-telat' && (
        <IzinTelatList
          requests={izinTelatList}
          onDecide={handleDecideIzin}
          decidingId={decidingIzinId}
        />
      )}

      {activeTab === 'late-accumulations' && (
        <LateAccumulationsTable
          accumulations={lateAccumulations}
          onRecalculate={handleRecalculateAccumulations}
          isRecalculating={isRecalculating}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}

      {/* 5. Modals */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        record={activeCorrectionRecord}
        pastCorrections={pastCorrections}
        onSubmit={handleSubmitCorrection}
        isSaving={isSavingCorrection}
        feedback={correctionFeedback}
      />

      <AttendanceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onAnalyzeFile={handleAnalyzeFile}
        onConfirmImport={handleConfirmImport}
        previewResult={previewResult}
        isAnalyzing={isAnalyzing}
        isSaving={isSavingImport}
        feedback={importFeedback}
      />

      <BatchHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        batches={batches}
      />
    </div>
  );
}
