'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Sliders,
  Sparkles,
  Search,
} from 'lucide-react';
import { RoleBadge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { RequestItem, LeaveBalance, EmployeeRole } from '@/types/database';
import {
  getPendingApprovalsForUser,
  submitApprovalDecision,
} from '@/app/actions/approvals';
import {
  getAllLeaveBalances,
  adjustEmployeeLeaveBalance,
} from '@/app/actions/leave-balances';
import { ApprovalsTable } from './approvals-table';
import { ApprovalDecisionModal } from './approval-decision-modal';
import { LeaveAdjustmentModal } from './leave-adjustment-modal';
import { LeaveBalancesTable } from './leave-balances-table';
import { RequestDetailModal } from '@/features/requests';

export function ApprovalsClient() {
  const [isPending, startTransition] = useTransition();

  // User state from Auth Hook
  const { email: hookEmail, role: hookRole } = useCurrentUser();
  const currentUserRole: EmployeeRole = hookRole || 'staff';
  const currentUserEmail = hookEmail || '';
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

    const email = currentUserEmail;
    const role = currentUserRole;

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
  }, [activeTab, currentUserEmail, currentUserRole]);

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
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
        <ApprovalsTable
          loading={loading}
          requests={filteredRequests}
          activeTab={activeTab}
          currentUserId={currentUserId}
          isHrOrAdmin={isHrOrAdmin}
          onSelectDetails={(req) => setSelectedRequestDetails(req)}
          onOpenDecision={(req, action) => {
            setDecisionModalData({ request: req, action });
            setDecisionNote('');
            setDecisionError(null);
          }}
        />
      ) : (
        <LeaveBalancesTable
          leaveBalances={leaveBalances}
          onOpenAdjust={(b) => {
            setAdjustingBalance(b);
            setAdjustDays(1);
            setAdjustType('add');
            setAdjustReason('');
            setAdjustError(null);
          }}
        />
      )}

      {/* MODAL: Approve or Reject Decision */}
      <ApprovalDecisionModal
        data={decisionModalData}
        decisionNote={decisionNote}
        setDecisionNote={setDecisionNote}
        decisionError={decisionError}
        isPending={isPending}
        onClose={() => setDecisionModalData(null)}
        onConfirm={handleConfirmDecision}
      />

      {/* MODAL: HR Leave Balance Adjustment */}
      <LeaveAdjustmentModal
        adjustingBalance={adjustingBalance}
        adjustDays={adjustDays}
        setAdjustDays={setAdjustDays}
        adjustType={adjustType}
        setAdjustType={setAdjustType}
        adjustReason={adjustReason}
        setAdjustReason={setAdjustReason}
        adjustError={adjustError}
        isPending={isPending}
        onClose={() => setAdjustingBalance(null)}
        onConfirm={handleConfirmAdjustment}
      />

      {/* MODAL: Full Request Details */}
      <RequestDetailModal
        request={selectedRequestDetails}
        onClose={() => setSelectedRequestDetails(null)}
      />
    </div>
  );
}
