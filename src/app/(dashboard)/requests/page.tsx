'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UploadCloud,
  X,
  Plus,
  ArrowRight,
  ShieldAlert,
  Download,
  Eye,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { createClient } from '@/lib/supabase/client';
import { RequestItem, RequestType, LeaveBalance } from '@/types/database';
import {
  getMyRequests,
  createLeaveOrPermitRequest,
  cancelMyRequest,
  getEmployeeLeaveBalance,
  calculateWorkingDays,
} from '@/app/actions/requests';
import { getRequestTypes } from '@/app/actions/request-types';

export default function RequestsPage() {
  const [isPending, startTransition] = useTransition();

  // Data states
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'my-requests' | 'balance-info'>('my-requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<RequestItem | null>(null);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

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

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = user?.email || '';
    setCurrentUserEmail(email);

    // Fetch in parallel
    const [reqsRes, typesRes, balRes] = await Promise.all([
      getMyRequests({ employeeEmail: email, status: statusFilter, category: categoryFilter }),
      getRequestTypes(),
      getEmployeeLeaveBalance(undefined, new Date().getFullYear(), email),
    ]);

    if (reqsRes.data) setRequests(reqsRes.data);
    if (typesRes.data) {
      // Filter to active types
      setRequestTypes(typesRes.data.filter((t) => t.is_active));
    }
    if (balRes.data) setLeaveBalance(balRes.data);

    setLoading(false);
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Selected request type object
  const selectedType = requestTypes.find((t) => t.id === selectedTypeId);

  // Handle file drop/selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    const validFiles: File[] = [];

    for (const f of newFiles) {
      if (f.size > 5 * 1024 * 1024) {
        alert(`File ${f.name} melebihi 5MB`);
        continue;
      }
      if (!allowedMimes.includes(f.type)) {
        alert(`Format ${f.name} tidak valid. Gunakan JPG, PNG, atau PDF.`);
        continue;
      }
      validFiles.push(f);
    }

    setFiles((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > 3) {
        alert('Maksimal 3 file lampiran.');
        return combined.slice(0, 3);
      }
      return combined;
    });

    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit new request
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
      const res = await createLeaveOrPermitRequest(formData);
      if (!res.success) {
        setFormError(res.error || 'Terjadi kesalahan saat mengajukan.');
      } else {
        setFormSuccess('Permohonan berhasil diajukan dan sedang menunggu persetujuan.');
        setTimeout(() => {
          setIsCreateModalOpen(false);
          resetForm();
          loadData();
        }, 1200);
      }
    });
  };

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

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModalId) return;

    startTransition(async () => {
      const res = await cancelMyRequest(cancelModalId, cancelReason, currentUserEmail);
      if (!res.success) {
        alert(res.error || 'Gagal membatalkan pengajuan');
      } else {
        setCancelModalId(null);
        setCancelReason('');
        loadData();
      }
    });
  };

  // Metric counts
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-blue-400" />
            Pengajuan Cuti & Izin
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Layanan mandiri permohonan cuti tahunan, cuti khusus, izin dinas/sakit, dan pelacakan persetujuan paralel.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Ajukan Cuti / Izin
        </button>
      </div>

      {/* Quota & Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sisa Saldo Cuti */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sisa Cuti Tahunan {new Date().getFullYear()}
            </span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <CalendarDays className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {leaveBalance?.remaining ?? 12}
            </span>
            <span className="text-xs text-slate-400">
              hari / {leaveBalance?.quota ?? 12} kuota
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Terpakai: {leaveBalance?.used ?? 0} hari
            {Number(leaveBalance?.adjustment) !== 0 && (
              <span className="text-blue-400 ml-1">
                (Penyesuaian: {Number(leaveBalance?.adjustment) > 0 ? '+' : ''}
                {leaveBalance?.adjustment})
              </span>
            )}
          </div>
        </div>

        {/* Pengajuan Menunggu */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Menunggu Persetujuan
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">{pendingCount}</span>
            <span className="text-xs text-slate-400">pengajuan aktif</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Proses paralel Atasan & HR</p>
        </div>

        {/* Disetujui */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Disetujui
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              {approvedCount}
            </span>
            <span className="text-xs text-slate-400">selesai diproses</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Semua approval lolos</p>
        </div>

        {/* Total Riwayat */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Riwayat
            </span>
            <span className="p-2 rounded-lg bg-slate-700/40 text-slate-300">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{requests.length}</span>
            <span className="text-xs text-slate-400">permohonan tercatat</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Termasuk cuti & izin dinas</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'my-requests'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Pengajuan Saya ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('balance-info')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'balance-info'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            Ketentuan & Saldo Cuti
          </button>
        </div>

        {activeTab === 'my-requests' && (
          <div className="flex items-center gap-2 py-2">
            {/* Filter Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="cuti">Khusus Cuti</option>
              <option value="izin">Khusus Izin</option>
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1 Content: My Requests List */}
      {activeTab === 'my-requests' && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Memuat daftar pengajuan...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Belum Ada Pengajuan</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Anda belum memiliki riwayat pengajuan cuti atau izin. Klik tombol di bawah untuk membuat permohonan baru.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Pengajuan Baru
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const isPendingReq = req.status === 'pending';
                const isApprovedReq = req.status === 'approved';
                const isRejectedReq = req.status === 'rejected';

                // Categorize approvals
                const spvAppr = req.approvals?.find((a) =>
                  ['spv', 'kepala_divisi', 'management'].includes(a.approver_role)
                );
                const hrAppr = req.approvals?.find((a) =>
                  ['hr', 'admin'].includes(a.approver_role)
                );

                return (
                  <div
                    key={req.id}
                    className="bg-[#111827] border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    {/* Left: Request Title & Metadata */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-white text-base">
                          {req.request_type?.name || 'Pengajuan'}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-semibold ${
                            req.request_type?.category === 'cuti'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          }`}
                        >
                          {req.request_type?.category}
                        </span>

                        {/* Overall Status Badge */}
                        {isPendingReq && (
                          <Badge variant="warning" dot>
                            Menunggu Persetujuan
                          </Badge>
                        )}
                        {isApprovedReq && (
                          <Badge variant="success" dot>
                            Disetujui
                          </Badge>
                        )}
                        {isRejectedReq && (
                          <Badge variant="danger" dot>
                            Ditolak
                          </Badge>
                        )}
                        {req.status === 'cancelled' && (
                          <Badge variant="neutral" dot>
                            Dibatalkan
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1.5 font-mono text-slate-300">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {req.start_date}
                          {req.end_date && req.end_date !== req.start_date
                            ? ` s/d ${req.end_date}`
                            : ''}
                        </span>
                        <span className="font-semibold text-blue-400">
                          {req.total_days ?? 1} hari kerja
                        </span>
                        {req.start_time && (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {req.start_time.slice(0, 5)} - {req.end_time?.slice(0, 5) || ''}
                          </span>
                        )}
                        <span className="text-slate-400">
                          Diajukan: {new Date(req.submitted_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-1 italic bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-800/40">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                    </div>

                    {/* Middle: Parallel Approval Status Stepper */}
                    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 min-w-[240px] space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Persetujuan Paralel</span>
                        <span className="text-[10px] text-blue-400 font-mono">Wajib 2/2</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Approver 1: Hierarki */}
                        <div className="bg-[#111827] p-2 rounded-lg border border-slate-800/60 space-y-1">
                          <span className="text-[10px] text-slate-400 block truncate">
                            Atasan (SPV/Kadiv)
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              spvAppr?.decision === 'approved'
                                ? 'text-emerald-400'
                                : spvAppr?.decision === 'rejected'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {spvAppr?.decision === 'approved' && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {spvAppr?.decision === 'rejected' && <XCircle className="w-3 h-3" />}
                            {spvAppr?.decision === 'pending' && <Clock className="w-3 h-3" />}
                            {spvAppr?.decision === 'approved'
                              ? 'Setuju'
                              : spvAppr?.decision === 'rejected'
                              ? 'Tolak'
                              : 'Pending'}
                          </span>
                        </div>

                        {/* Approver 2: HR */}
                        <div className="bg-[#111827] p-2 rounded-lg border border-slate-800/60 space-y-1">
                          <span className="text-[10px] text-slate-400 block truncate">
                            Human Resources
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              hrAppr?.decision === 'approved'
                                ? 'text-emerald-400'
                                : hrAppr?.decision === 'rejected'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {hrAppr?.decision === 'approved' && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {hrAppr?.decision === 'rejected' && <XCircle className="w-3 h-3" />}
                            {hrAppr?.decision === 'pending' && <Clock className="w-3 h-3" />}
                            {hrAppr?.decision === 'approved'
                              ? 'Setuju'
                              : hrAppr?.decision === 'rejected'
                              ? 'Tolak'
                              : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Attachments preview count */}
                      {req.attachments && req.attachments.length > 0 && (
                        <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span>{req.attachments.length} Dokumen terlampir</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => setSelectedRequestDetails(req)}
                        className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>

                      {isPendingReq && (
                        <button
                          onClick={() => {
                            setCancelModalId(req.id);
                            setCancelReason('');
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2 Content: Balance Info & Guidelines */}
      {activeTab === 'balance-info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Breakdown Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 lg:col-span-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Ringkasan Kuota {new Date().getFullYear()}
            </h3>

            <div className="space-y-3 font-mono text-sm divide-y divide-slate-800/80">
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400 text-xs font-sans">Hak Kuota Tahunan:</span>
                <span className="font-bold text-white">{leaveBalance?.quota ?? 12} hari</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400 text-xs font-sans">Carry Over Tahun Lalu:</span>
                <span className="font-bold text-slate-300">{leaveBalance?.carry_over ?? 0} hari</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400 text-xs font-sans">Penyesuaian Manual HR:</span>
                <span
                  className={`font-bold ${
                    Number(leaveBalance?.adjustment) > 0
                      ? 'text-emerald-400'
                      : Number(leaveBalance?.adjustment) < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {Number(leaveBalance?.adjustment) > 0 ? '+' : ''}
                  {leaveBalance?.adjustment ?? 0} hari
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400 text-xs font-sans">Cuti yang Telah Terpakai:</span>
                <span className="font-bold text-rose-400">{leaveBalance?.used ?? 0} hari</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-blue-500/30">
                <span className="text-white text-xs font-sans font-bold">
                  Sisa Saldo Kuota Cuti:
                </span>
                <span className="text-xl font-extrabold text-blue-400">
                  {leaveBalance?.remaining ?? 12} hari
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
              Setiap cuti tahunan yang disetujui otomatis mengurangi saldo di atas secara realtime.
            </div>
          </div>

          {/* Guidelines & Legal Rules */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 lg:col-span-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Ketentuan Cuti & Izin Berdasarkan UU No. 13/2003
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Cuti Menikah (3 Hari)</h4>
                <p className="text-slate-400">
                  Hak bagi karyawan yang melangsungkan pernikahan resmi. Tidak memotong cuti tahunan. Wajib upload undangan/surat nikah.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Cuti Melahirkan / Istri (2 Hari)</h4>
                <p className="text-slate-400">
                  Hak suami saat istri melahirkan atau keguguran kandungan. Tidak memotong cuti tahunan. Wajib surat keterangan RS/Bidan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Cuti Duka Cita (2 Hari)</h4>
                <p className="text-slate-400">
                  Orang tua, mertua, anak, atau anggota keluarga serumah meninggal dunia. Tidak memotong saldo cuti tahunan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Izin Sakit</h4>
                <p className="text-slate-400">
                  Izin tidak bekerja karena sakit. Wajib melampirkan Surat Keterangan Dokter jika lebih dari 1 hari kerja.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs text-slate-300 space-y-2">
              <span className="font-semibold text-white block">Catatan Approval Paralel:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>
                  Pengajuan karyawan diproses bersamaan oleh <strong>Atasan Langsung</strong> dan{' '}
                  <strong>HR</strong>.
                </li>
                <li>Kedua approver harus memberikan persetujuan agar permohonan resmi disetujui.</li>
                <li>
                  Jika salah satu menolak, pengajuan otomatis berstatus ditolak dengan catatan alasan.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Form Pengajuan Baru */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
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
              onClick={() => setIsCreateModalOpen(false)}
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

      {/* MODAL: Request Details & Attachment Viewer */}
      {selectedRequestDetails && (
        <Modal
          isOpen={!!selectedRequestDetails}
          onClose={() => setSelectedRequestDetails(null)}
          title="Rincian Permohonan"
          description={`ID: ${selectedRequestDetails.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">Tipe Pengajuan</span>
                <span className="font-bold text-white text-sm">
                  {selectedRequestDetails.request_type?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Status Akhir</span>
                <span className="font-bold uppercase tracking-wider text-blue-400">
                  {selectedRequestDetails.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Tanggal</span>
                <span className="font-mono text-slate-200">
                  {selectedRequestDetails.start_date}
                  {selectedRequestDetails.end_date &&
                  selectedRequestDetails.end_date !== selectedRequestDetails.start_date
                    ? ` s/d ${selectedRequestDetails.end_date}`
                    : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Total Durasi</span>
                <span className="font-bold text-white">
                  {selectedRequestDetails.total_days} hari kerja
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block mb-1">Alasan Pengajuan:</span>
              <p className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
                {selectedRequestDetails.reason}
              </p>
            </div>

            {/* Stepper Status */}
            <div>
              <span className="text-slate-400 text-[11px] block mb-2 font-semibold uppercase">
                Riwayat Keputusan Approver:
              </span>
              <div className="space-y-2">
                {selectedRequestDetails.approvals?.map((appr) => (
                  <div
                    key={appr.id}
                    className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {appr.approver?.full_name || `Approver (${appr.approver_role})`}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {appr.approver_role}
                        </span>
                      </div>
                      {appr.note && (
                        <p className="text-[11px] text-slate-300 mt-1 italic">
                          Catatan: &ldquo;{appr.note}&rdquo;
                        </p>
                      )}
                      {appr.decided_at && (
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Waktu: {new Date(appr.decided_at).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
                        appr.decision === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : appr.decision === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {appr.decision}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments Section */}
            {selectedRequestDetails.attachments &&
              selectedRequestDetails.attachments.length > 0 && (
                <div>
                  <span className="text-slate-400 text-[11px] block mb-2 font-semibold uppercase">
                    Dokumen Lampiran ({selectedRequestDetails.attachments.length}):
                  </span>
                  <div className="space-y-2">
                    {selectedRequestDetails.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-slate-200 truncate">{att.file_name}</span>
                          {att.file_size_bytes && (
                            <span className="text-[10px] text-slate-400">
                              ({(att.file_size_bytes / 1024).toFixed(0)} KB)
                            </span>
                          )}
                        </div>
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-semibold transition inline-flex items-center gap-1 shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          Lihat / Unduh
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </Modal>
      )}

      {/* MODAL: Cancel Confirmation */}
      {cancelModalId && (
        <Modal
          isOpen={!!cancelModalId}
          onClose={() => setCancelModalId(null)}
          title="Konfirmasi Pembatalan"
          description="Pengajuan yang dibatalkan tidak dapat diaktifkan kembali."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Apakah Anda yakin ingin membatalkan permohonan cuti / izin ini?
            </p>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">
                Alasan Pembatalan (Opsional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Rencana berubah, jadwal diundur"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setCancelModalId(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
