'use client';

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Upload,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ChevronRight,
  ArrowLeft,
  FileCheck,
  History,
  Info,
  Building,
  UserCheck,
  Download,
  X,
  AlertCircle,
  MapPin,
  Check,
  Ban,
  Smartphone,
  FilePlus,
  ShieldCheck,
  Edit2,
  Sliders,
  Sparkles,
  AlertOctagon,
} from 'lucide-react';
import {
  parseAndPreviewFingerprint,
  confirmAttendanceImport,
  getAttendanceManagement,
  getAttendanceBatches,
  ImportPreviewResult,
  PreviewRow,
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

export default function AttendanceManagementPage() {
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');

  // Import Modal & Wizard States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'overwrite'>('skip');
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    success: boolean;
    message: string;
    inserted?: number;
    skipped?: number;
  } | null>(null);

  // Batch History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Review & Decision states
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [decidingIzinId, setDecidingIzinId] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // SPRINT 4: Attendance Correction Modal
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [activeCorrectionRecord, setActiveCorrectionRecord] = useState<AttendanceRecordItem | null>(null);
  const [formClockIn, setFormClockIn] = useState('');
  const [formClockOut, setFormClockOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [pastCorrections, setPastCorrections] = useState<any[]>([]);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, divRes, empRes, batchRes, gpsRes, izinRes, accumRes] = await Promise.all([
        getAttendanceManagement({
          month: selectedMonth,
          year: selectedYear,
          divisionId: selectedDivision,
        }),
        getDivisions(),
        getEmployees(),
        getAttendanceBatches(),
        getPendingGpsAttendanceList(),
        getPendingIzinTelatList(),
        getLateAccumulationsSummary(selectedYear, selectedMonth, selectedDivision),
      ]);

      if (attRes.data) setRecords(attRes.data);
      if (divRes.data) setDivisions(divRes.data);
      if (empRes.data) setEmployees(empRes.data);
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

  // Client-side filtering for search and status
  const filteredRecords = records.filter((rec) => {
    const nameMatch =
      !searchQuery ||
      rec.employee?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.employee?.email.toLowerCase().includes(searchQuery.toLowerCase());

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

  // GPS Review pending records filter
  const pendingGpsCount = gpsRecords.filter((g) => g.review_status === 'pending_review').length;
  const filteredGpsRecords = gpsRecords.filter((g) => {
    if (!searchQuery) return true;
    const name = g.employee?.full_name?.toLowerCase() || '';
    const email = g.employee?.email?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  // Izin Telat pending filter
  const pendingIzinTelatCount = izinTelatList.filter((i) => i.status === 'pending').length;

  // Calculate high-level KPIs
  const totalRecords = records.length;
  const onTimeCount = records.filter((r) => r.clock_in && r.late_minutes === 0 && !r.is_absent).length;
  const lateCount = records.filter((r) => r.late_minutes > 0).length;

  // Review GPS attendance action
  const handleReviewGps = async (attendanceId: string, decision: 'approved' | 'rejected') => {
    setReviewingId(attendanceId);
    try {
      const res = await reviewGpsAttendance(attendanceId, decision);
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Error reviewing GPS attendance:', err);
    } finally {
      setReviewingId(null);
    }
  };

  // Decide Izin Telat action
  const handleDecideIzin = async (requestId: string, decision: 'approved' | 'rejected') => {
    setDecidingIzinId(requestId);
    try {
      const res = await decideIzinTelat(requestId, decision);
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Error deciding Izin Telat:', err);
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
    } catch (err) {
      console.error('Error recalculating accumulations:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Open correction modal
  const handleOpenCorrectionModal = async (rec: AttendanceRecordItem) => {
    setActiveCorrectionRecord(rec);
    setFormClockIn(rec.clock_in || '08:00');
    setFormClockOut(rec.clock_out || '17:00');
    setCorrectionReason('');
    setCorrectionFeedback(null);
    setIsCorrectionModalOpen(true);

    const past = await getAttendanceCorrections(rec.id);
    if (past.data) {
      setPastCorrections(past.data);
    }
  };

  // Submit attendance correction
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCorrectionRecord || !correctionReason.trim()) return;

    setIsSavingCorrection(true);
    setCorrectionFeedback(null);

    try {
      const res = await createAttendanceCorrection({
        attendanceId: activeCorrectionRecord.id,
        correctedClockIn: formClockIn,
        correctedClockOut: formClockOut,
        reason: correctionReason.trim(),
      });

      setIsSavingCorrection(false);

      if (res.success) {
        setIsCorrectionModalOpen(false);
        await loadData();
      } else {
        setCorrectionFeedback(res.error || 'Gagal menyimpan koreksi absensi');
      }
    } catch (err: any) {
      setIsSavingCorrection(false);
      setCorrectionFeedback(err?.message || 'Terjadi kesalahan sistem');
    }
  };

  // File analysis handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportFeedback(null);
    }
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setImportFeedback(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Content = (event.target?.result as string).split(',')[1];
        if (!base64Content) {
          setIsAnalyzing(false);
          setImportFeedback({
            success: false,
            message: 'Gagal membaca isi berkas. Pastikan format berkas valid.',
          });
          return;
        }

        const result = await parseAndPreviewFingerprint(base64Content, selectedFile.name);
        setIsAnalyzing(false);

        if (result.error) {
          setImportFeedback({
            success: false,
            message: result.error,
          });
        } else {
          setPreviewResult(result);
          setImportStep(2);
        }
      };

      reader.onerror = () => {
        setIsAnalyzing(false);
        setImportFeedback({
          success: false,
          message: 'Terjadi kesalahan saat memproses berkas.',
        });
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setIsAnalyzing(false);
      setImportFeedback({
        success: false,
        message: err?.message || 'Gagal memproses berkas',
      });
    }
  };

  // Confirm and Execute Import
  const handleConfirmImport = async () => {
    if (!previewResult) return;

    setIsSavingImport(true);
    try {
      const res = await confirmAttendanceImport({
        fileName: previewResult.fileName,
        period_start: previewResult.period_start,
        period_end: previewResult.period_end,
        rows: previewResult.rows,
        duplicateHandling,
      });

      setIsSavingImport(false);

      if (res.success) {
        setImportFeedback({
          success: true,
          message: `Berhasil mengimpor data absensi!`,
          inserted: res.inserted_count,
          skipped: res.skipped_count,
        });
        loadData();
      } else {
        setImportFeedback({
          success: false,
          message: res.error || 'Gagal menyimpan data absensi',
        });
      }
    } catch (err: any) {
      setIsSavingImport(false);
      setImportFeedback({
        success: false,
        message: err?.message || 'Terjadi kesalahan saat menyimpan import',
      });
    }
  };

  const resetImportModal = () => {
    setIsImportModalOpen(false);
    setImportStep(1);
    setSelectedFile(null);
    setPreviewResult(null);
    setImportFeedback(null);
    setDuplicateHandling('skip');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Fingerprint className="w-6 h-6 text-blue-400" />
              Manajemen Presensi & Keterlambatan
            </h1>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Sprint 2, 3 & 4
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Monitoring kehadiran terpadu, approval izin telat, rekapitulasi sanksi, dan koreksi data absensi oleh HR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Riwayat Berkas</span>
            {batches.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-slate-800 text-slate-400">
                {batches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              resetImportModal();
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" />
            <span>Import Mesin Fingerprint</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Total Kehadiran</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{totalRecords}</span>
            <span className="text-xs text-slate-500">catatan tercatat</span>
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
            <span className="text-2xl font-bold text-emerald-400 font-mono">{onTimeCount}</span>
            <span className="text-xs text-slate-500">
              {totalRecords > 0 ? `(${Math.round((onTimeCount / totalRecords) * 100)}%)` : '-'}
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('izin-telat')}
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Approval Izin Telat</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <FilePlus className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">{pendingIzinTelatCount}</span>
            <span className="text-xs text-slate-500">pengajuan pending</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('gps-review')}
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">GPS Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-400 font-mono">{pendingGpsCount}</span>
            <span className="text-xs text-slate-500">perlu verifikasi HR</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher (4 Tabs) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          <span>Log Presensi Terintegrasi</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono">
            {records.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('izin-telat')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'izin-telat'
              ? 'bg-amber-600/10 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FilePlus className="w-4 h-4" />
          <span>Approval Izin Telat</span>
          {pendingIzinTelatCount > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-[10px] font-mono text-black font-bold">
              {pendingIzinTelatCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('late-accumulations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'late-accumulations'
              ? 'bg-rose-600/10 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Akumulasi & Sanksi Keterlambatan</span>
        </button>

        <button
          onClick={() => setActiveTab('gps-review')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'gps-review'
              ? 'bg-purple-600/10 text-purple-400 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Review Presensi GPS</span>
          {pendingGpsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-purple-500 text-[10px] font-mono text-white font-bold">
              {pendingGpsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL ATTENDANCE LOG + CORRECTION BUTTON */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari nama atau email karyawan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
                    <option key={m.m} value={m.m}>
                      {m.label} {selectedYear}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Semua Divisi</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="present">Tepat Waktu</option>
                  <option value="late">Terlambat</option>
                  <option value="absent">Alpa / Tidak Hadir</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden backdrop-blur-sm">
            <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Daftar Presensi Karyawan ({filteredRecords.length} Baris)
              </span>

              <button
                onClick={loadData}
                disabled={loading}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tanggal</th>
                    <th className="px-4 py-3 font-semibold">Karyawan</th>
                    <th className="px-4 py-3 font-semibold">Sumber</th>
                    <th className="px-4 py-3 font-semibold">Jam Masuk</th>
                    <th className="px-4 py-3 font-semibold">Jam Pulang</th>
                    <th className="px-4 py-3 font-semibold">Durasi</th>
                    <th className="px-4 py-3 font-semibold">Status Keterlambatan</th>
                    <th className="px-4 py-3 font-semibold">Alasan / Izin</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                        Memuat data kehadiran...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        <Fingerprint className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">Belum ada catatan presensi pada periode ini</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => {
                      const hasLate = rec.late_minutes > 0;
                      const isAbsent = rec.is_absent || (!rec.clock_in && !rec.clock_out);
                      const isExcused = !!(rec as any).linked_izin_telat_request_id;

                      return (
                        <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-200">
                            {rec.attendance_date}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{rec.employee?.full_name || 'Karyawan'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{rec.employee?.email}</div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                            {rec.source === 'fingerprint' ? (
                              <span className="text-slate-400">Fingerprint</span>
                            ) : (
                              <span className="text-blue-400">Mobile GPS</span>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap font-mono">
                            {rec.clock_in ? (
                              <span className="text-slate-200 font-medium">{rec.clock_in}</span>
                            ) : (
                              <span className="text-slate-600">--:--</span>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap font-mono">
                            {rec.clock_out ? (
                              <span className="text-slate-200 font-medium">{rec.clock_out}</span>
                            ) : (
                              <span className="text-slate-600">--:--</span>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                            {rec.work_minutes > 0 ? (
                              `${Math.floor(rec.work_minutes / 60)}j ${rec.work_minutes % 60}m`
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>

                          {/* SPRINT 4: Distinct Excused vs Unexcused badge */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isAbsent ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Alpa
                              </span>
                            ) : hasLate ? (
                              isExcused ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Telat {rec.late_minutes}m (Excused)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                                  <Clock className="w-3 h-3" />
                                  Telat {rec.late_minutes}m (Unexcused)
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Tepat Waktu
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {hasLate ? (
                              rec.late_reason ? (
                                <div className="max-w-xs">
                                  <p className="text-slate-300 line-clamp-1 text-xs" title={rec.late_reason}>
                                    {rec.late_reason}
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  Belum diisi
                                </span>
                              )
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>

                          {/* SPRINT 4: HR Non-destructive Correction Action Button */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleOpenCorrectionModal(rec)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              title="Koreksi data absensi"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Koreksi</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVAL IZIN TELAT (PENDING) */}
      {activeTab === 'izin-telat' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
            <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">Approval Pengajuan Izin Telat (Sebelum Masuk Kerja)</p>
              <p className="text-slate-400 mt-0.5">
                Pengajuan yang disetujui (Approved) akan otomatis berstatus <strong>Excused</strong> pada catatan presensi tanggal tersebut, sehingga bebas dari perhitungan sanksi / denda pemotongan.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden backdrop-blur-sm">
            <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Daftar Permohonan Izin Telat ({izinTelatList.length} Pengajuan)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tanggal</th>
                    <th className="px-4 py-3 font-semibold">Karyawan</th>
                    <th className="px-4 py-3 font-semibold">Divisi</th>
                    <th className="px-4 py-3 font-semibold">Estimasi Tiba</th>
                    <th className="px-4 py-3 font-semibold">Alasan Keterlambatan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi Persetujuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
                  {izinTelatList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <FilePlus className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">Belum ada permohonan Izin Telat</p>
                      </td>
                    </tr>
                  ) : (
                    izinTelatList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-200">
                          {item.start_date}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{item.employee?.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.employee?.email}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                            {item.employee?.division?.name || '-'}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono text-amber-400 font-semibold">
                          {item.end_time?.slice(0, 5) || '08:30'} WIB
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-slate-200 line-clamp-2 text-xs">{item.reason}</p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                              Pending
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              Approved (Excused)
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {item.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDecideIzin(item.id, 'approved')}
                                disabled={decidingIzinId === item.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>

                              <button
                                onClick={() => handleDecideIzin(item.id, 'rejected')}
                                disabled={decidingIzinId === item.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-mono">Telah diputuskan</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AKUMULASI & SANKSI KETERLAMBATAN (SPRINT 4) */}
      {activeTab === 'late-accumulations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Rekapitulasi Akumulasi Keterlambatan & Sanksi Karyawan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Berdasarkan ketentuan: Keterlambatan unexcused maksimal 3 kali per bulan. Pelanggaran ke-4 dan seterusnya dikenakan penalti sanksi pemotongan Rp 50.000 / kejadian.
              </p>
            </div>

            <button
              onClick={handleRecalculateAccumulations}
              disabled={isRecalculating}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-blue-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>Hitung Ulang Akumulasi</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden backdrop-blur-sm">
            <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Rekap Kedisiplinan Karyawan Bulan {selectedMonth}/{selectedYear}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {lateAccumulations.length} Karyawan Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama Karyawan</th>
                    <th className="px-4 py-3 font-semibold">Divisi</th>
                    <th className="px-4 py-3 font-semibold">Total Terlambat</th>
                    <th className="px-4 py-3 font-semibold">Excused (Berizin)</th>
                    <th className="px-4 py-3 font-semibold">Unexcused (Sanksi)</th>
                    <th className="px-4 py-3 font-semibold">Akumulasi Menit</th>
                    <th className="px-4 py-3 font-semibold">Denda / Potongan</th>
                    <th className="px-4 py-3 font-semibold text-right">Status Sanksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {lateAccumulations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500 font-sans">
                        <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">Belum ada rekap keterlambatan bulan ini</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Klik tombol "Hitung Ulang Akumulasi" untuk menyinkronkan data presensi bulan ini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    lateAccumulations.map((acc) => {
                      const unexcused = acc.unexcused_count || 0;
                      return (
                        <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-sans">
                            <div className="font-semibold text-white">{acc.employee?.full_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{acc.employee?.email}</div>
                          </td>

                          <td className="px-4 py-3 font-sans">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                              {acc.employee?.division?.name || '-'}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-bold text-white">
                            {acc.late_count}x
                          </td>

                          <td className="px-4 py-3 text-emerald-400 font-semibold">
                            {acc.excused_count}x
                          </td>

                          <td className="px-4 py-3 text-amber-400 font-semibold">
                            {unexcused}x
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            {acc.total_late_minutes} Menit
                          </td>

                          <td className="px-4 py-3 font-bold text-rose-400">
                            Rp {(acc.deduction_amount || 0).toLocaleString('id-ID')}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {unexcused === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Sangat Disiplin
                              </span>
                            ) : unexcused <= 3 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Toleransi ({unexcused}/3)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                                Sanksi Denda ({unexcused}x)
                              </span>
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
        </div>
      )}

      {/* TAB 4: GPS REVIEWS (PENDING APPROVALS) */}
      {activeTab === 'gps-review' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-3">
            <Info className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
            <div>
              <p className="font-semibold">Review Presensi GPS (Dinas Luar / Luar Radius Kantor)</p>
              <p className="text-slate-400 mt-0.5">
                Karyawan yang melakukan Clock In di luar batas radius kantor otomatis berstatus <strong>pending_review</strong>. Tinjau catatan kegiatan di bawah ini untuk menyetujui atau menolak.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden backdrop-blur-sm">
            <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Daftar Pengajuan Presensi GPS ({filteredGpsRecords.length} Data)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tanggal & Jam</th>
                    <th className="px-4 py-3 font-semibold">Karyawan</th>
                    <th className="px-4 py-3 font-semibold">Kantor Terdekat & Jarak</th>
                    <th className="px-4 py-3 font-semibold">Akurasi GPS</th>
                    <th className="px-4 py-3 font-semibold">Catatan Tugas Karyawan</th>
                    <th className="px-4 py-3 font-semibold">Status Review</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredGpsRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">Belum ada pengajuan presensi GPS</p>
                      </td>
                    </tr>
                  ) : (
                    filteredGpsRecords.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          <div className="text-white font-medium">{item.attendance_date}</div>
                          <div className="text-[10px] text-slate-500">
                            Masuk: {item.clock_in} | Pulang: {item.clock_out || '--:--'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{item.employee?.full_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {item.employee?.division?.name || 'Staff'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-slate-200 font-medium">{item.office?.name || 'Kantor'}</div>
                          <div className="text-[10px] font-mono text-amber-400">
                            {item.distance_to_office_meters} meter ({item.distance_to_office_meters > (item.office?.radius_meters || 100) ? 'Luar Radius' : 'Dalam Radius'})
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                          ±{Math.round(item.gps_accuracy_meters || 0)}m
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-slate-200 line-clamp-2 text-xs">
                            {item.late_reason || <span className="text-slate-500 italic">Tanpa catatan</span>}
                          </p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.review_status === 'auto_valid' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Auto-Valid
                            </span>
                          )}
                          {item.review_status === 'pending_review' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending Review
                            </span>
                          )}
                          {item.review_status === 'approved' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Approved
                            </span>
                          )}
                          {item.review_status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {item.review_status === 'pending_review' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReviewGps(item.id, 'approved')}
                                disabled={reviewingId === item.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>

                              <button
                                onClick={() => handleReviewGps(item.id, 'rejected')}
                                disabled={reviewingId === item.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {item.reviewer?.full_name ? `Oleh: ${item.reviewer.full_name}` : 'Telah ditinjau'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SPRINT 4: MODAL KOREKSI DATA PRESENSI (NON-DESTRUCTIVE) */}
      {isCorrectionModalOpen && activeCorrectionRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-400" />
                  Koreksi Data Presensi (HR)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Koreksi non-destructive: Nilai asli tetap tersimpan, perubahan tercatat dalam audit log.
                </p>
              </div>

              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Karyawan</span>
                  <p className="font-semibold text-white mt-0.5 font-sans">
                    {activeCorrectionRecord.employee?.full_name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Tanggal Absensi</span>
                  <p className="font-semibold text-blue-400 mt-0.5">
                    {activeCorrectionRecord.attendance_date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] uppercase">Jam Tercatat</span>
                  <p className="font-semibold text-amber-400 mt-0.5">
                    {activeCorrectionRecord.clock_in || '--:--'} - {activeCorrectionRecord.clock_out || '--:--'}
                  </p>
                </div>
              </div>

              {correctionFeedback && (
                <p className="text-xs text-rose-400 font-medium">{correctionFeedback}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Jam Masuk Koreksi:
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={formClockIn}
                    onChange={(e) => setFormClockIn(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Jam Pulang Koreksi:
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={formClockOut}
                    onChange={(e) => setFormClockOut(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Alasan Koreksi (Wajib Audit Trail):
                </label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Contoh: Karyawan mendampingi klien di lobi sebelum tap masuk..."
                  className="w-full bg-[#090d16] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Past corrections audit history */}
              {pastCorrections.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                    Riwayat Koreksi Sebelumnya:
                  </span>
                  {pastCorrections.map((pc) => (
                    <div key={pc.id} className="text-[11px] text-slate-400 border-b border-slate-800/60 pb-1">
                      <div className="flex justify-between">
                        <span className="text-white font-mono">
                          {pc.corrected_clock_in} - {pc.corrected_clock_out}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(pc.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <p className="text-slate-300 italic">"{pc.reason}"</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={!correctionReason.trim() || isSavingCorrection}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                >
                  {isSavingCorrection ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Koreksi Data</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-Step Fingerprint Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" />
                  Wizard Impor Berkas Mesin Fingerprint
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mendukung format export Excel (.xlsx, .xls) & CSV dari Solution, Fingerspot, ZKTeco, BioFinger.
                </p>
              </div>

              <button
                onClick={resetImportModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-6">
                <div
                  className={`flex items-center gap-2 ${
                    importStep === 1
                      ? 'text-blue-400 font-semibold'
                      : importStep > 1
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border ${
                      importStep === 1
                        ? 'border-blue-500 bg-blue-500/10'
                        : importStep > 1
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    1
                  </span>
                  <span>1. Pilih Berkas</span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-700" />

                <div
                  className={`flex items-center gap-2 ${
                    importStep === 2
                      ? 'text-blue-400 font-semibold'
                      : importStep > 2
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border ${
                      importStep === 2
                        ? 'border-blue-500 bg-blue-500/10'
                        : importStep > 2
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    2
                  </span>
                  <span>2. Validasi & Preview</span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-700" />

                <div
                  className={`flex items-center gap-2 ${
                    importStep === 3
                      ? 'text-blue-400 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border ${
                      importStep === 3
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    3
                  </span>
                  <span>3. Penanganan Duplikat & Simpan</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {importFeedback && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    importFeedback.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {importFeedback.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{importFeedback.message}</p>
                    {importFeedback.inserted !== undefined && (
                      <p className="mt-1 font-mono text-[11px] opacity-90">
                        {importFeedback.inserted} data berhasil disimpan, {importFeedback.skipped} data dilewati.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {importStep === 1 && (
                <div className="space-y-6">
                  <label className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-900/30 hover:bg-slate-900/50 transition-all group">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      Klik untuk memilih berkas atau seret ke sini
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Format: .xlsx, .xls, .csv (Maks. 10MB)
                    </p>

                    {selectedFile && (
                      <div className="mt-4 px-4 py-2 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-300 text-xs font-mono flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-blue-400" />
                        <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </label>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2 text-slate-400">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-300 font-semibold">
                        <Info className="w-4 h-4 text-blue-400" />
                        Pedoman Format Mesin Presensi
                      </div>
                      <a
                        href="/templates/sample_fingerprint.xlsx"
                        download="sample_fingerprint.xlsx"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 text-[11px] font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh Template Contoh (.xlsx)
                      </a>
                    </div>
                    <p className="leading-relaxed">
                      Sistem kami secara otomatis mendeteksi format tabel harian maupun log transaksi mentah. Pastikan nomor PIN/AC-No mesin sudah terdaftar di master data profil masing-masing karyawan pada tab Organisasi.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                      <div>• Header yang dikenali: AC-No, User ID, PIN, Tanggal/Date, Clock In, Clock Out</div>
                      <div>• Penautan otomatis: Berdasarkan Fingerprint AC-No & Nama Karyawan</div>
                    </div>
                  </div>
                </div>
              )}

              {importStep === 2 && previewResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-slate-500">Total Baris</span>
                      <p className="text-xl font-bold font-mono text-white mt-0.5">
                        {previewResult.total_rows}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] uppercase font-mono text-emerald-400">Cocok (Matched)</span>
                      <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                        {previewResult.matched_count}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[10px] uppercase font-mono text-amber-400">Duplikat Terdeteksi</span>
                      <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                        {previewResult.duplicate_count}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <span className="text-[10px] uppercase font-mono text-rose-400">Tidak Cocok</span>
                      <p className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                        {previewResult.unmatched_count}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <div>
                      Periode terdeteksi: <strong className="text-white font-mono">{previewResult.period_start}</strong> s/d{' '}
                      <strong className="text-white font-mono">{previewResult.period_end}</strong>
                    </div>
                    <div>
                      Menampilkan <span className="text-white font-mono">{Math.min(50, previewResult.rows.length)}</span> dari {previewResult.rows.length} baris
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">AC-No</th>
                          <th className="px-4 py-2.5">Nama Berkas</th>
                          <th className="px-4 py-2.5">Cocok Karyawan DB</th>
                          <th className="px-4 py-2.5">Tanggal</th>
                          <th className="px-4 py-2.5">Masuk</th>
                          <th className="px-4 py-2.5">Pulang</th>
                          <th className="px-4 py-2.5">Telat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {previewResult.rows.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="px-4 py-2">
                              {row.match_status === 'matched' && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  🟢 Cocok
                                </span>
                              )}
                              {row.match_status === 'duplicate' && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  🟡 Ada di DB
                                </span>
                              )}
                              {row.match_status === 'unmatched' && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  🔴 Belum Terdaftar
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-400">{row.fingerprint_ac_no}</td>
                            <td className="px-4 py-2 text-slate-300 font-sans">{row.employee_name_raw || '-'}</td>
                            <td className="px-4 py-2 font-sans font-medium text-white">
                              {row.matched_employee_name || (
                                <span className="text-rose-400/80 font-normal">Tidak ditemukan</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-300">{row.attendance_date}</td>
                            <td className="px-4 py-2 text-emerald-400">{row.clock_in || '--:--'}</td>
                            <td className="px-4 py-2 text-blue-400">{row.clock_out || '--:--'}</td>
                            <td className="px-4 py-2">
                              {(row.late_minutes || 0) > 0 ? (
                                <span className="text-amber-400 font-medium">+{row.late_minutes}m</span>
                              ) : (
                                <span className="text-slate-600">0m</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importStep === 3 && previewResult && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                      Pilihan Penanganan Duplikasi ({previewResult.duplicate_count} data terdeteksi sudah ada di database)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label
                        onClick={() => setDuplicateHandling('skip')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          duplicateHandling === 'skip'
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">Lewati Duplikat (Skip)</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              duplicateHandling === 'skip'
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-slate-600'
                            }`}
                          >
                            {duplicateHandling === 'skip' && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Aman. Data yang sudah tercatat di sistem tidak akan diubah. Hanya menambahkan data kehadiran baru yang belum pernah masuk.
                        </p>
                      </label>

                      <label
                        onClick={() => setDuplicateHandling('overwrite')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          duplicateHandling === 'overwrite'
                            ? 'border-amber-500 bg-amber-500/10 text-white'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-amber-300">
                            Timpa Data (Overwrite)
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              duplicateHandling === 'overwrite'
                                ? 'border-amber-500 bg-amber-500'
                                : 'border-slate-600'
                            }`}
                          >
                            {duplicateHandling === 'overwrite' && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Perbarui jam masuk & pulang record yang sudah ada dengan nilai terbaru dari berkas ini.
                        </p>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-2">
                    <p className="font-semibold text-sm text-white">Ringkasan Impor:</p>
                    <ul className="space-y-1 font-mono text-[11px] list-disc list-inside">
                      <li>Total data yang cocok: {previewResult.matched_count + previewResult.duplicate_count} baris</li>
                      <li>
                        Akan diproses:{' '}
                        {duplicateHandling === 'skip'
                          ? previewResult.matched_count
                          : previewResult.matched_count + previewResult.duplicate_count}{' '}
                        baris
                      </li>
                      <li>
                        Dilewati (Unmatched): {previewResult.unmatched_count} baris karyawan tidak ditemukan
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 bg-[#090d16] flex items-center justify-between">
              {importStep === 1 && (
                <>
                  <button
                    onClick={resetImportModal}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAnalyzeFile}
                    disabled={!selectedFile || isAnalyzing}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menganalisis Berkas...</span>
                      </>
                    ) : (
                      <>
                        <span>Lanjut ke Review</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}

              {importStep === 2 && (
                <>
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Pilih Berkas Lain</span>
                  </button>

                  <button
                    onClick={() => setImportStep(3)}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <span>Lanjut ke Opsi Duplikat</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {importStep === 3 && (
                <>
                  <button
                    onClick={() => setImportStep(2)}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Review</span>
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isSavingImport}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    {isSavingImport ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan ke Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Konfirmasi & Simpan Data Absensi</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Import History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Riwayat Impor Berkas Fingerprint
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar batch file yang telah berhasil diunggah ke database HRIS.
                </p>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {batches.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-medium">Belum ada riwayat batch impor</p>
                </div>
              ) : (
                batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold text-white">{batch.file_name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-mono">
                          {batch.status}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1 font-mono text-[11px]">
                        Periode: {batch.period_start} s/d {batch.period_end} • Diunggah oleh:{' '}
                        {batch.uploader?.full_name || 'Admin'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-mono text-emerald-400 font-semibold">
                          {batch.matched_count} cocok
                        </div>
                        <div className="font-mono text-slate-500 text-[10px]">
                          dari {batch.row_count} baris
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(batch.uploaded_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
