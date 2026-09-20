'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  CalendarDays,
  Plus,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  X,
  Layers,
} from 'lucide-react';
import { Badge, RoleBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { createClient } from '@/lib/supabase/client';
import { RequestItem, Employee, EmployeeRole } from '@/types/database';
import {
  getAssignableSubordinates,
  createOvertimeAssignment,
  getMyOvertimeList,
  getAssignedOvertimeList,
  cancelOvertimeAssignment,
} from '@/app/actions/overtime';

export default function OvertimePage() {
  const [isPending, startTransition] = useTransition();

  // User state
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<EmployeeRole>('staff');

  // Data states
  const [myOvertimes, setMyOvertimes] = useState<RequestItem[]>([]);
  const [teamOvertimes, setTeamOvertimes] = useState<RequestItem[]>([]);
  const [subordinates, setSubordinates] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'my-overtime' | 'team-overtime'>('my-overtime');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSubordinateIds, setSelectedSubordinateIds] = useState<string[]>([]);
  const [overtimeDate, setOvertimeDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>('17:00');
  const [endTime, setEndTime] = useState<string>('20:00');
  const [taskReason, setTaskReason] = useState<string>('');
  const [subordinateSearch, setSubordinateSearch] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Cancel Modal State
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);

  // Detail Modal State
  const [selectedDetail, setSelectedDetail] = useState<RequestItem | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = user?.email || '';
    setCurrentUserEmail(email);

    // Fetch user info
    let role: EmployeeRole = 'admin';
    if (email) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, role, email')
        .ilike('email', email)
        .maybeSingle();

      if (emp) {
        role = emp.role as EmployeeRole;
      }
    } else {
      const { data: fallbackEmp } = await supabase
        .from('employees')
        .select('id, role, email')
        .in('role', ['admin', 'hr', 'spv'])
        .limit(1)
        .maybeSingle();

      if (fallbackEmp) {
        role = fallbackEmp.role as EmployeeRole;
        setCurrentUserEmail(fallbackEmp.email);
      }
    }

    setCurrentUserRole(role);

    // If supervisor, set default activeTab to 'team-overtime'
    if (role !== 'staff' && activeTab === 'my-overtime' && teamOvertimes.length === 0) {
      setActiveTab('team-overtime');
    }

    // Parallel fetch
    const [myRes, teamRes, subsRes] = await Promise.all([
      getMyOvertimeList(email),
      role !== 'staff' ? getAssignedOvertimeList(email) : Promise.resolve({ data: [], error: null }),
      role !== 'staff' ? getAssignableSubordinates(email) : Promise.resolve({ data: [], supervisorRole: 'staff', error: null }),
    ]);

    if (myRes.data) setMyOvertimes(myRes.data);
    if (teamRes.data) setTeamOvertimes(teamRes.data);
    if (subsRes.data) setSubordinates(subsRes.data);

    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate duration in hours
  const calculateDurationHours = () => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff <= 0) diff += 24 * 60;
    return Number((diff / 60).toFixed(1));
  };

  const durationHours = calculateDurationHours();

  // Handle select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedSubordinateIds.length === filteredSubordinates.length) {
      setSelectedSubordinateIds([]);
    } else {
      setSelectedSubordinateIds(filteredSubordinates.map((s) => s.id));
    }
  };

  const handleToggleSubordinate = (id: string) => {
    setSelectedSubordinateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Submit assignment
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (selectedSubordinateIds.length === 0) {
      setFormError('Pilih minimal satu karyawan untuk ditugaskan lembur.');
      return;
    }

    if (!overtimeDate || !startTime || !endTime) {
      setFormError('Tanggal dan rentang jam lembur wajib diisi.');
      return;
    }

    if (!taskReason.trim()) {
      setFormError('Uraian tugas lembur wajib diisi secara jelas.');
      return;
    }

    startTransition(async () => {
      const res = await createOvertimeAssignment({
        employeeIds: selectedSubordinateIds,
        date: overtimeDate,
        startTime,
        endTime,
        reason: taskReason.trim(),
        supervisorEmail: currentUserEmail,
      });

      if (!res.success) {
        setFormError(res.error || 'Gagal menerbitkan penugasan lembur.');
      } else {
        setFormSuccess(res.message || 'Penugasan lembur berhasil diterbitkan.');
        setTimeout(() => {
          setIsAssignModalOpen(false);
          setSelectedSubordinateIds([]);
          setTaskReason('');
          loadData();
        }, 1200);
      }
    });
  };

  // Handle cancel
  const handleConfirmCancel = async () => {
    if (!cancelModalId) return;

    startTransition(async () => {
      const res = await cancelOvertimeAssignment(cancelModalId, currentUserEmail);
      if (!res.success) {
        alert(res.error || 'Gagal membatalkan lembur');
      } else {
        setCancelModalId(null);
        loadData();
      }
    });
  };

  const isSupervisorOrAbove = currentUserRole !== 'staff';

  // Metrics
  const relevantList = activeTab === 'team-overtime' ? teamOvertimes : myOvertimes;
  const approvedList = relevantList.filter((r) => r.status === 'approved');
  const pendingHrList = relevantList.filter((r) => r.status === 'pending');
  const totalApprovedHours = approvedList.reduce(
    (acc, curr) => acc + (Number(curr.total_days) || 0),
    0
  );

  const filteredSubordinates = subordinates.filter((s) => {
    if (!subordinateSearch.trim()) return true;
    const q = subordinateSearch.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.division?.name?.toLowerCase().includes(q);
  });

  const displayedList = (activeTab === 'team-overtime' ? teamOvertimes : myOvertimes).filter(
    (r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName = r.employee?.full_name?.toLowerCase() || '';
        const creatorName = r.created_by_user?.full_name?.toLowerCase() || '';
        const rsn = r.reason?.toLowerCase() || '';
        return empName.includes(q) || creatorName.includes(q) || rsn.includes(q);
      }
      return true;
    }
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-blue-400" />
            Manajemen Lembur
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Penerbitan surat perintah lembur oleh atasan (top-down), tracking jam kerja tambahan, dan persetujuan HR.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">Role:</span>
            <RoleBadge role={currentUserRole} />
          </div>

          {/* Action button: Only visible for supervisors & above */}
          {isSupervisorOrAbove && (
            <button
              onClick={() => {
                setFormError(null);
                setFormSuccess(null);
                setIsAssignModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tugaskan Lembur
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jam Disetujui */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Jam Lembur Disetujui
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              {totalApprovedHours.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">Jam Kerja</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Siap dikalkulasi ke payroll</p>
        </div>

        {/* Menunggu HR */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Menunggu Persetujuan HR
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">
              {pendingHrList.length}
            </span>
            <span className="text-xs text-slate-400">surat perintah</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Atasan auto-approved, menunggu HR</p>
        </div>

        {/* Penugasan Disetujui */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Selesai Disetujui
            </span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {approvedList.length}
            </span>
            <span className="text-xs text-slate-400">penugasan</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Disetujui lengkap Atasan & HR</p>
        </div>

        {/* Anggota Tim / Bawahan */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isSupervisorOrAbove ? 'Bawahan Dapat Ditugaskan' : 'Status Lembur'}
            </span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {isSupervisorOrAbove ? subordinates.length : myOvertimes.length}
            </span>
            <span className="text-xs text-slate-400">
              {isSupervisorOrAbove ? 'staf di hierarki' : 'penugasan tercatat'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {isSupervisorOrAbove ? 'Khusus bawahan langsung / divisi' : 'Surat perintah resmi'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isSupervisorOrAbove && (
            <button
              onClick={() => setActiveTab('team-overtime')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'team-overtime'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Penugasan Lembur Tim ({teamOvertimes.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('my-overtime')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'my-overtime'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Lembur Saya ({myOvertimes.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 py-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu HR</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="cancelled">Dibatalkan</option>
          </select>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Memuat data penugasan lembur...</p>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">
            {activeTab === 'team-overtime'
              ? 'Belum Ada Penugasan Lembur Tim'
              : 'Belum Ada Penugasan Lembur Untuk Anda'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {activeTab === 'team-overtime'
              ? 'Terbitkan surat perintah lembur untuk bawahan dengan mengklik tombol Tugaskan Lembur.'
              : 'Anda belum memiliki riwayat penugasan lembur dari atasan.'}
          </p>
          {isSupervisorOrAbove && activeTab === 'team-overtime' && (
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tugaskan Lembur Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((req) => {
            const hrAppr = req.approvals?.find((a) =>
              ['hr', 'admin'].includes(a.approver_role)
            );
            const creatorAppr = req.approvals?.find((a) =>
              ['spv', 'kepala_divisi', 'management'].includes(a.approver_role)
            );

            const isPendingReq = req.status === 'pending';
            const isApprovedReq = req.status === 'approved';
            const isRejectedReq = req.status === 'rejected';

            return (
              <div
                key={req.id}
                className="bg-[#111827] border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm"
              >
                {/* Left: Employee & Task Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Person Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {req.employee?.full_name?.charAt(0) || 'K'}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {req.employee?.full_name}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400">
                      ({req.employee?.division?.name || 'Divisi'})
                    </span>

                    {/* Status Badge */}
                    {isPendingReq && (
                      <Badge variant="warning" dot>
                        Menunggu HR
                      </Badge>
                    )}
                    {isApprovedReq && (
                      <Badge variant="success" dot>
                        Disetujui HR
                      </Badge>
                    )}
                    {isRejectedReq && (
                      <Badge variant="danger" dot>
                        Ditolak HR
                      </Badge>
                    )}
                    {req.status === 'cancelled' && (
                      <Badge variant="neutral" dot>
                        Dibatalkan
                      </Badge>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1.5 font-mono text-slate-200">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                      {req.start_date}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {req.start_time?.slice(0, 5)} - {req.end_time?.slice(0, 5)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold font-mono">
                      {req.total_days} Jam Lembur
                    </span>
                    <span className="text-slate-400">
                      Ditugaskan oleh:{' '}
                      <strong className="text-slate-200">
                        {req.created_by_user?.full_name || 'Atasan'}
                      </strong>
                    </span>
                  </div>

                  {/* Reason / Task */}
                  <p className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
                    <strong className="text-slate-400 text-[11px] block">Instruksi Tugas:</strong>
                    {req.reason}
                  </p>
                </div>

                {/* Middle: Parallel Status Stepper */}
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 min-w-[240px] space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Status Verifikasi</span>
                    <span className="text-[10px] text-blue-400 font-medium">Alur Standar</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Approver 1: Atasan (Auto-Skip) */}
                    <div className="bg-[#111827] p-2 rounded-lg border border-slate-800/60 space-y-1">
                      <span className="text-[10px] text-slate-400 block truncate">
                        Atasan (Pembuat)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Auto-Approved
                      </span>
                    </div>

                    {/* Approver 2: HR */}
                    <div className="bg-[#111827] p-2 rounded-lg border border-slate-800/60 space-y-1">
                      <span className="text-[10px] text-slate-400 block truncate">Verifikasi HR</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          hrAppr?.decision === 'approved'
                            ? 'text-emerald-400'
                            : hrAppr?.decision === 'rejected'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {hrAppr?.decision === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {hrAppr?.decision === 'rejected' && <XCircle className="w-3 h-3" />}
                        {hrAppr?.decision === 'pending' && <Clock className="w-3 h-3" />}
                        {hrAppr?.decision === 'approved'
                          ? 'Disetujui'
                          : hrAppr?.decision === 'rejected'
                          ? 'Ditolak'
                          : 'Menunggu HR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setSelectedDetail(req)}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition cursor-pointer"
                  >
                    Detail
                  </button>

                  {/* Supervisor cancel option if still pending */}
                  {isSupervisorOrAbove && isPendingReq && (
                    <button
                      onClick={() => setCancelModalId(req.id)}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition cursor-pointer"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Tugaskan Lembur (Atasan View) */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Penerbitan Surat Tugas Lembur"
        description="Pilih staf bawahan yang ditugaskan lembur, tentukan rentang waktu, dan cantumkan deskripsi pekerjaan."
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitAssignment} className="space-y-4">
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

          {/* 1. Subordinate Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Pilih Karyawan yang Dilemburkan <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] text-blue-400 hover:underline font-semibold"
              >
                {selectedSubordinateIds.length === filteredSubordinates.length
                  ? 'Batal Pilih Semua'
                  : 'Pilih Semua'}
              </button>
            </div>

            {/* Filter Subordinate Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={subordinateSearch}
                onChange={(e) => setSubordinateSearch(e.target.value)}
                placeholder="Cari nama bawahan..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* List of Subordinates (Checkbox cards) */}
            <div className="max-h-44 overflow-y-auto border border-slate-800 rounded-xl p-2 space-y-1.5 bg-slate-900/40">
              {filteredSubordinates.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Tidak ada bawahan aktif yang ditemukan di hierarki Anda.
                </p>
              ) : (
                filteredSubordinates.map((sub) => {
                  const isChecked = selectedSubordinateIds.includes(sub.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleToggleSubordinate(sub.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-500/10 border-blue-500/40 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold block">{sub.full_name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {sub.division?.name || 'Divisi'} • {sub.email}
                          </span>
                        </div>
                      </div>
                      <RoleBadge role={sub.role} />
                    </div>
                  );
                })
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Terpilih: <strong>{selectedSubordinateIds.length}</strong> karyawan
            </div>
          </div>

          {/* 2. Date & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tanggal Lembur <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={overtimeDate}
                onChange={(e) => setOvertimeDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jam Mulai <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jam Selesai <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Duration Preview */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-blue-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-4 h-4 text-blue-400" />
              Durasi Kerja Lembur: {durationHours} Jam
            </span>
            <span className="text-[11px] text-slate-400">
              Kompensasi lembur akan dihitung per jam
            </span>
          </div>

          {/* 3. Reason / Task Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Uraian Pekerjaan / Tugas Lembur <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={taskReason}
              onChange={(e) => setTaskReason(e.target.value)}
              placeholder="Jelaskan target atau pekerjaan spesifik yang wajib diselesaikan..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Auto-Skip Notice */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Aturan Auto-Skip Approval:</strong> Karena Anda bertindak sebagai atasan
              pembuat penugasan, status approval level atasan langsung otomatis tercatat{' '}
              <strong className="text-emerald-400">Approved</strong>. Surat tugas ini akan diteruskan
              ke <strong>HR</strong> untuk approval final.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || selectedSubordinateIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              {isPending ? 'Menerbitkan...' : `Terbitkan untuk ${selectedSubordinateIds.length} Karyawan`}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Cancel Overtime */}
      {cancelModalId && (
        <Modal
          isOpen={!!cancelModalId}
          onClose={() => setCancelModalId(null)}
          title="Batalkan Surat Perintah Lembur"
          description="Pembatalan penugasan ini akan mencabut instruksi lembur karyawan bersangkutan."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Apakah Anda yakin ingin membatalkan perintah lembur ini? Tindakan ini tidak dapat
              dibatalkan.
            </p>
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

      {/* MODAL: Request Details */}
      {selectedDetail && (
        <Modal
          isOpen={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
          title="Rincian Surat Tugas Lembur"
          description={`ID: ${selectedDetail.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">Karyawan</span>
                <span className="font-bold text-white text-sm">
                  {selectedDetail.employee?.full_name}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {selectedDetail.employee?.division?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Ditugaskan Oleh</span>
                <span className="font-bold text-blue-400 text-sm">
                  {selectedDetail.created_by_user?.full_name || 'Atasan'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Tanggal Lembur</span>
                <span className="font-mono text-slate-200">{selectedDetail.start_date}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Jam & Durasi</span>
                <span className="font-mono text-white">
                  {selectedDetail.start_time?.slice(0, 5)} - {selectedDetail.end_time?.slice(0, 5)}{' '}
                  ({selectedDetail.total_days} Jam)
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block mb-1 font-semibold">
                Uraian Tugas Lembur:
              </span>
              <p className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
                {selectedDetail.reason}
              </p>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block mb-2 font-semibold uppercase">
                Status Persetujuan:
              </span>
              <div className="space-y-2">
                {selectedDetail.approvals?.map((appr) => (
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
                          &ldquo;{appr.note}&rdquo;
                        </p>
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
          </div>
        </Modal>
      )}
    </div>
  );
}
