'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Briefcase,
  User,
  Plus,
  Search,
  AlertCircle,
  X,
} from 'lucide-react';
import { RoleBadge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { RequestItem, Employee, EmployeeRole } from '@/types/database';
import {
  getAssignableSubordinates,
  getMyOvertimeList,
  getAssignedOvertimeList,
  cancelOvertimeAssignment,
} from '@/app/actions/overtime';
import { OvertimeMetrics } from './overtime-metrics';
import { OvertimeTable } from './overtime-table';
import { OvertimeAssignModal } from './overtime-assign-modal';
import { OvertimeDetailModal } from './overtime-detail-modal';
import { OvertimeCancelModal } from './overtime-cancel-modal';

export function OvertimeClient() {
  const [isPending, startTransition] = useTransition();

  // User state from Auth Hook
  const { email: hookEmail, role: hookRole } = useCurrentUser();
  const currentUserRole: EmployeeRole = hookRole || 'staff';
  const currentUserEmail = hookEmail || '';

  // Data states
  const [myOvertimes, setMyOvertimes] = useState<RequestItem[]>([]);
  const [teamOvertimes, setTeamOvertimes] = useState<RequestItem[]>([]);
  const [subordinates, setSubordinates] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'my-overtime' | 'team-overtime'>('my-overtime');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<RequestItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);

    const email = currentUserEmail;
    const role = currentUserRole;

    // Parallel fetch
    const [myRes, teamRes, subsRes] = await Promise.all([
      getMyOvertimeList(email),
      role !== 'staff'
        ? getAssignedOvertimeList(email)
        : Promise.resolve({ data: [], error: null }),
      role !== 'staff'
        ? getAssignableSubordinates(email)
        : Promise.resolve({ data: [], supervisorRole: 'staff', error: null }),
    ]);

    if (myRes.data) setMyOvertimes(myRes.data);
    if (teamRes.data) {
      setTeamOvertimes(teamRes.data);
      if (role !== 'staff' && activeTab === 'my-overtime' && teamRes.data.length > 0) {
        setActiveTab('team-overtime');
      }
    }
    if (subsRes.data) setSubordinates(subsRes.data);

    setLoading(false);
  }, [activeTab, currentUserEmail, currentUserRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle cancel
  const handleConfirmCancel = async () => {
    if (!cancelModalId) return;

    startTransition(async () => {
      const res = await cancelOvertimeAssignment(cancelModalId, currentUserEmail);
      if (!res.success) {
        setActionError(res.error || 'Gagal membatalkan lembur');
      } else {
        setActionError(null);
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
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tugaskan Lembur
            </button>
          )}
        </div>
      </div>

      {/* Error Alert Banner */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-200 p-1 rounded-lg transition"
            title="Tutup pesan error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <OvertimeMetrics
        totalApprovedHours={totalApprovedHours}
        pendingHrCount={pendingHrList.length}
        approvedCount={approvedList.length}
        isSupervisorOrAbove={isSupervisorOrAbove}
        subordinates={subordinates}
        myOvertimes={myOvertimes}
      />

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isSupervisorOrAbove && (
            <button
              onClick={() => setActiveTab('team-overtime')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
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
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
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
      <OvertimeTable
        loading={loading}
        displayedList={displayedList}
        activeTab={activeTab}
        isSupervisorOrAbove={isSupervisorOrAbove}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
        onSelectDetail={(req) => setSelectedDetail(req)}
        onInitiateCancel={(id) => setCancelModalId(id)}
      />

      {/* MODAL: Tugaskan Lembur (Atasan View) */}
      <OvertimeAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        subordinates={subordinates}
        currentUserEmail={currentUserEmail}
        onSuccess={loadData}
      />

      {/* MODAL: Cancel Overtime */}
      <OvertimeCancelModal
        isOpen={!!cancelModalId}
        onClose={() => setCancelModalId(null)}
        onConfirm={handleConfirmCancel}
        isPending={isPending}
      />

      {/* MODAL: Request Details */}
      <OvertimeDetailModal
        request={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
}
