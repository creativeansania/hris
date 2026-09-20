'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Eye,
  User,
  CalendarDays,
  Search,
  Sliders,
  Sparkles,
  Download,
  Check,
  X,
  Plus,
  Minus,
  Briefcase,
} from 'lucide-react';
import { Badge, RoleBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/client';
import { RequestItem, LeaveBalance, EmployeeRole } from '@/types/database';
import {
  getPendingApprovalsForUser,
  submitApprovalDecision,
} from '@/app/actions/approvals';
import {
  getAllLeaveBalances,
  adjustEmployeeLeaveBalance,
} from '@/app/actions/leave-balances';

export default function ApprovalsPage() {
  const [isPending, startTransition] = useTransition();

  // User state
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<EmployeeRole>('staff');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Data states
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'pending-my' | 'all' | 'history' | 'balances'>(
    'pending-my'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Decision Modal State
  const [decisionModalData, setDecisionModalData] = useState<{
    request: RequestItem;
    action: 'approved' | 'rejected';
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<RequestItem | null>(null);

  // Leave Balance Adjustment Modal State (HR/Admin)
  const [adjustingBalance, setAdjustingBalance] = useState<LeaveBalance | null>(null);
  const [adjustDays, setAdjustDays] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = user?.email || '';
    setCurrentUserEmail(email);

    // Fetch user role
    const { data: emp } = await supabase
      .from('employees')
      .select('id, role')
      .ilike('email', email)
      .maybeSingle();

    const role = (emp?.role as EmployeeRole) || 'staff';
    setCurrentUserRole(role);

    // Tab mapping
    let queryTab: 'pending' | 'history' | 'all' = 'pending';
    if (activeTab === 'pending-my') queryTab = 'pending';
    else if (activeTab === 'history') queryTab = 'history';
    else if (activeTab === 'all') queryTab = 'all';

    const apprRes = await getPendingApprovalsForUser({
      userEmail: email,
      tab: queryTab,
    });

    if (apprRes.data) setRequests(apprRes.data);
    if (apprRes.currentUserId) setCurrentUserId(apprRes.currentUserId);

    // If HR/Admin, fetch leave balances
    if (role === 'hr' || role === 'admin') {
      const balRes = await getAllLeaveBalances();
      if (balRes.data) setLeaveBalances(balRes.data);
    }

    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle submit decision
  const handleConfirmDecision = async () => {
    if (!decisionModalData) return;
    setDecisionError(null);

    const { request, action } = decisionModalData;

    if (action === 'rejected' && (!decisionNote || decisionNote.trim().length < 3)) {
      setDecisionError('Alasan penolakan wajib diisi (minimal 3 karakter).');
      return;
    }

    startTransition(async () => {
      const res = await submitApprovalDecision({
        requestId: request.id,
        decision: action,
        note: decisionNote,
        userEmail: currentUserEmail,
      });

      if (!res.success) {
        setDecisionError(res.error || 'Gagal mencatat keputusan.');
      } else {
        setDecisionModalData(null);
        setDecisionNote('');
        loadData();
      }
    });
  };

  // Handle HR Leave Balance Adjustment
  const handleConfirmAdjustment = async () => {
    if (!adjustingBalance) return;
    setAdjustError(null);

    if (!adjustReason || adjustReason.trim().length < 3) {
      setAdjustError('Alasan penyesuaian wajib diisi (minimal 3 karakter).');
      return;
    }

    const finalDays = adjustType === 'add' ? Math.abs(adjustDays) : -Math.abs(adjustDays);

    startTransition(async () => {
      const res = await adjustEmployeeLeaveBalance({
        employeeId: adjustingBalance.employee_id,
        year: adjustingBalance.year,
        adjustmentDays: finalDays,
        reason: adjustReason.trim(),
        adjustedByEmail: currentUserEmail,
      });

      if (!res.success) {
        setAdjustError(res.error || 'Gagal menyimpan penyesuaian.');
      } else {
        setAdjustingBalance(null);
        setAdjustDays(1);
        setAdjustReason('');
        loadData();
      }
    });
  };

  const isHrOrAdmin = currentUserRole === 'hr' || currentUserRole === 'admin';

  // Filter requests by search query
  const filteredRequests = requests.filter((req) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.employee?.full_name?.toLowerCase().includes(q) ||
      req.employee?.division?.name?.toLowerCase().includes(q) ||
      req.request_type?.name?.toLowerCase().includes(q) ||
      req.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-blue-400" />
            Approval Pengajuan
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pusat peninjauan dan persetujuan paralel cuti/izin karyawan bagi Supervisor, Kepala Divisi, Manajemen, dan HR.
          </p>
        </div>

        {/* Role Badge Indicator */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <span className="text-xs text-slate-400">Otoritas Anda:</span>
          <RoleBadge role={currentUserRole} />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending-my')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pending-my'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Menunggu Tindakan Saya
            {requests.length > 0 && activeTab === 'pending-my' && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-mono">
                {requests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Riwayat Selesai
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Semua Pengajuan
          </button>

          {isHrOrAdmin && (
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'balances'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Kelola Saldo Cuti (HR)
            </button>
          )}
        </div>

        {/* Search Bar for Request List */}
        {activeTab !== 'balances' && (
          <div className="relative py-2 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / divisi / jenis..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab !== 'balances' ? (
        <div>
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Memuat daftar permohonan...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={
                activeTab === 'pending-my'
                  ? 'Semua Beres! Tidak Ada Pengajuan Menunggu'
                  : 'Tidak Ada Data Ditemukan'
              }
              description={
                activeTab === 'pending-my'
                  ? 'Semua permohonan cuti, izin, dan lembur yang membutuhkan persetujuan Anda sudah selesai diproses.'
                  : 'Belum ada riwayat permohonan pada kategori atau filter pencarian ini.'
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                // Find my approval record
                const myApproval =
                  req.approvals?.find((a) => a.approver_id === currentUserId) ||
                  (isHrOrAdmin
                    ? req.approvals?.find(
                        (a) => a.approver_role === 'hr' || a.approver_role === 'admin'
                      )
                    : null);

                const canDecide = req.status === 'pending' && myApproval?.decision === 'pending';

                // Stepper approvals
                const spvAppr = req.approvals?.find((a) =>
                  ['spv', 'kepala_divisi', 'management'].includes(a.approver_role)
                );
                const hrAppr = req.approvals?.find((a) =>
                  ['hr', 'admin'].includes(a.approver_role)
                );

                return (
                  <div
                    key={req.id}
                    className="bg-[#111827] border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 transition space-y-4 shadow-sm"
                  >
                    {/* Header Row: Employee Info + Request Type */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm overflow-hidden shrink-0">
                          {req.employee?.photo_url ? (
                            <img
                              src={req.employee.photo_url}
                              alt={req.employee.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {req.employee?.full_name || 'Karyawan'}
                            </span>
                            <RoleBadge role={req.employee?.role || 'staff'} />
                          </div>
                          <span className="text-xs text-slate-400">
                            {req.employee?.division?.name || 'Semua Divisi'} •{' '}
                            {req.employee?.email}
                          </span>
                        </div>
                      </div>

                      {/* Request Type & Status */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                            req.request_type?.category === 'cuti'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          }`}
                        >
                          {req.request_type?.name}
                        </span>

                        {req.status === 'pending' && (
                          <Badge variant="warning" dot>
                            Menunggu Persetujuan
                          </Badge>
                        )}
                        {req.status === 'approved' && (
                          <Badge variant="success" dot>
                            Disetujui
                          </Badge>
                        )}
                        {req.status === 'rejected' && (
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
                    </div>

                    {/* Middle: Details & Parallel Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Left 2 Cols: Details & Reason & Attachments */}
                      <div className="md:col-span-2 space-y-2.5">
                        <div className="flex items-center gap-4 text-slate-300 flex-wrap">
                          <span className="flex items-center gap-1.5 font-mono text-slate-200">
                            <CalendarDays className="w-4 h-4 text-blue-400" />
                            {req.start_date}
                            {req.end_date && req.end_date !== req.start_date
                              ? ` s/d ${req.end_date}`
                              : ''}
                          </span>
                          <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                            {req.total_days ?? 1} hari kerja
                          </span>
                          {req.start_time && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {req.start_time.slice(0, 5)} - {req.end_time?.slice(0, 5) || ''}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                          <strong className="text-slate-400 block mb-1 text-[11px] uppercase">
                            Alasan:
                          </strong>
                          {req.reason}
                        </p>

                        {/* Attachments chips */}
                        {req.attachments && req.attachments.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[11px] text-slate-400 font-semibold">
                              Lampiran ({req.attachments.length}):
                            </span>
                            {req.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/20 transition"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="max-w-[150px] truncate">{att.file_name}</span>
                                <Download className="w-3 h-3 ml-1" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Col: Parallel Approval Stepper */}
                      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <span>Status Persetujuan Paralel</span>
                          <span className="text-blue-400 font-mono text-[10px]">Wajib 2/2</span>
                        </div>

                        {/* Approver Hierarki */}
                        <div className="p-2.5 rounded-lg bg-[#111827] border border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-300 font-medium">
                              Atasan ({spvAppr?.approver_role || 'SPV'})
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                spvAppr?.decision === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : spvAppr?.decision === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {spvAppr?.decision || 'pending'}
                            </span>
                          </div>
                          {spvAppr?.note && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-1">
                              &ldquo;{spvAppr.note}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Approver HR */}
                        <div className="p-2.5 rounded-lg bg-[#111827] border border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-300 font-medium">
                              HR / Kepegawaian
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                hrAppr?.decision === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : hrAppr?.decision === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {hrAppr?.decision || 'pending'}
                            </span>
                          </div>
                          {hrAppr?.note && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-1">
                              &ldquo;{hrAppr.note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                      <button
                        onClick={() => setSelectedRequestDetails(req)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Rincian Lengkap
                      </button>

                      {canDecide ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setDecisionModalData({ request: req, action: 'rejected' });
                              setDecisionNote('');
                              setDecisionError(null);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Tolak
                          </button>
                          <button
                            onClick={() => {
                              setDecisionModalData({ request: req, action: 'approved' });
                              setDecisionNote('');
                              setDecisionError(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Setujui
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {req.status === 'pending'
                            ? 'Anda sudah memberikan keputusan untuk permohonan ini.'
                            : 'Permohonan sudah selesai diproses.'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab HR: Leave Balance Management */
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Rekap Saldo Cuti Karyawan Tahun {new Date().getFullYear()}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                HR dan Admin dapat melihat sisa kuota cuti tahunan dan melakukan penyesuaian manual (+/- hari) beserta alasannya.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Divisi / Role</th>
                  <th className="px-4 py-3 text-center">Hak Kuota</th>
                  <th className="px-4 py-3 text-center">Carry Over</th>
                  <th className="px-4 py-3 text-center">Penyesuaian HR</th>
                  <th className="px-4 py-3 text-center">Terpakai</th>
                  <th className="px-4 py-3 text-center">Sisa Saldo</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {leaveBalances.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/40 transition font-sans">
                    <td className="px-4 py-3 font-semibold text-white">
                      {b.employee?.full_name}
                      <span className="block text-[10px] text-slate-400 font-normal font-mono">
                        {b.employee?.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-300 block">{b.employee?.division?.name || '-'}</span>
                      <RoleBadge role={b.employee?.role || 'staff'} />
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-white">
                      {b.quota}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-400">
                      {b.carry_over}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span
                        className={`font-semibold ${
                          Number(b.adjustment) > 0
                            ? 'text-emerald-400'
                            : Number(b.adjustment) < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {Number(b.adjustment) > 0 ? '+' : ''}
                        {b.adjustment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-rose-400 font-bold">
                      {b.used}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                        {b.remaining} hari
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setAdjustingBalance(b);
                          setAdjustDays(1);
                          setAdjustType('add');
                          setAdjustReason('');
                          setAdjustError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 font-semibold text-xs transition cursor-pointer"
                      >
                        Sesuaikan Kuota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Approve or Reject Decision */}
      {decisionModalData && (
        <Modal
          isOpen={!!decisionModalData}
          onClose={() => setDecisionModalData(null)}
          title={
            decisionModalData.action === 'approved'
              ? 'Setujui Permohonan'
              : 'Tolak Permohonan'
          }
          description={`Pengajuan dari ${decisionModalData.request.employee?.full_name} (${decisionModalData.request.request_type?.name})`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {decisionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{decisionError}</span>
              </div>
            )}

            <p className="text-slate-300">
              {decisionModalData.action === 'approved'
                ? 'Anda akan menyetujui permohonan ini. Jika approver lainnya juga telah menyetujui, permohonan akan resmi dinyatakan disetujui sepenuhnya.'
                : 'Anda akan menolak permohonan ini. Penolakan dari salah satu approver akan langsung membatalkan seluruh permohonan.'}
            </p>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1">
                Catatan / Alasan {decisionModalData.action === 'rejected' && <span className="text-rose-400">*</span>}
              </label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={
                  decisionModalData.action === 'approved'
                    ? 'Catatan persetujuan (opsional)...'
                    : 'Wajib sebutkan alasan penolakan permohonan...'
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDecisionModalData(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={isPending}
                className={`px-4 py-2 rounded-xl font-semibold text-white shadow-lg transition cursor-pointer ${
                  decisionModalData.action === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {isPending
                  ? 'Menyimpan...'
                  : decisionModalData.action === 'approved'
                  ? 'Konfirmasi Setuju'
                  : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: HR Leave Balance Adjustment */}
      {adjustingBalance && (
        <Modal
          isOpen={!!adjustingBalance}
          onClose={() => setAdjustingBalance(null)}
          title="Penyesuaian Saldo Cuti Manual"
          description={`Karyawan: ${adjustingBalance.employee?.full_name} (Tahun ${adjustingBalance.year})`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {adjustError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                className={`p-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  adjustType === 'add'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                Tambah Kuota (+)
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('subtract')}
                className={`p-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  adjustType === 'subtract'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Minus className="w-4 h-4" />
                Kurangi Kuota (-)
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Jumlah Hari Penyesuaian
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={adjustDays}
                onChange={(e) => setAdjustDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Alasan Penyesuaian <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Contoh: Kompensasi lembur akhir pekan, koreksi kesalahan perhitungan masa kerja..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdjustingBalance(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustment}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                {isPending ? 'Menyimpan...' : 'Simpan Penyesuaian'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Full Request Details */}
      {selectedRequestDetails && (
        <Modal
          isOpen={!!selectedRequestDetails}
          onClose={() => setSelectedRequestDetails(null)}
          title="Rincian Permohonan Cuti / Izin"
          description={`ID: ${selectedRequestDetails.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">Pemohon</span>
                <span className="font-bold text-white text-sm">
                  {selectedRequestDetails.employee?.full_name}
                </span>
                <span className="text-slate-400 block text-[10px]">
                  {selectedRequestDetails.employee?.division?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Jenis Pengajuan</span>
                <span className="font-bold text-blue-400 text-sm">
                  {selectedRequestDetails.request_type?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Rentang Tanggal</span>
                <span className="font-mono text-slate-200">
                  {selectedRequestDetails.start_date}
                  {selectedRequestDetails.end_date &&
                  selectedRequestDetails.end_date !== selectedRequestDetails.start_date
                    ? ` s/d ${selectedRequestDetails.end_date}`
                    : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Durasi Kerja</span>
                <span className="font-bold text-white">
                  {selectedRequestDetails.total_days} hari kerja
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block mb-1 font-semibold">
                Alasan Pemohon:
              </span>
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
                    Dokumen Pendukung ({selectedRequestDetails.attachments.length}):
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
    </div>
  );
}
