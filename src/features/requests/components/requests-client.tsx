'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { CalendarDays, Info, Plus, AlertCircle, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { RequestItem, RequestType, LeaveBalance } from '@/types/database';
import {
  getMyRequests,
  cancelMyRequest,
  getEmployeeLeaveBalance,
} from '@/app/actions/requests';
import { getRequestTypes } from '@/app/actions/request-types';
import {
  cacheMasterData,
  getCachedMasterData,
} from '@/lib/offline-db';
import { RequestsMetrics } from './requests-metrics';
import { RequestsList } from './requests-list';
import { LeaveBalanceInfo } from './leave-balance-info';
import { CreateRequestModal } from './create-request-modal';
import { RequestDetailModal } from './request-detail-modal';
import { CancelRequestModal } from './cancel-request-modal';

export function RequestsClient() {
  const [isPending, startTransition] = useTransition();

  // User from auth hook
  const { email: hookEmail, isLoading: isAuthLoading } = useCurrentUser();
  const currentUserEmail = hookEmail || '';

  // Data states
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
  const [actionError, setActionError] = useState<string | null>(null);

  // Load initial data (with offline cache support)
  const loadData = useCallback(async () => {
    setLoading(true);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    try {
      if (isOnline) {
        const email = currentUserEmail;

        // Fetch in parallel
        const [reqsRes, typesRes, balRes] = await Promise.all([
          getMyRequests({
            employeeEmail: email,
            status: statusFilter,
            category: categoryFilter,
          }),
          getRequestTypes(),
          getEmployeeLeaveBalance(undefined, new Date().getFullYear(), email),
        ]);

        if (reqsRes.data) setRequests(reqsRes.data);
        if (typesRes.data) {
          const activeTypes = typesRes.data.filter((t) => t.is_active);
          setRequestTypes(activeTypes);
          await cacheMasterData('request_types', activeTypes);
        }
        if (balRes.data) {
          setLeaveBalance(balRes.data);
          await cacheMasterData('leave_balance', balRes.data);
        }
      } else {
        // Fallback to cached master data for offline forms
        const [cachedTypes, cachedBalance] = await Promise.all([
          getCachedMasterData<RequestType[]>('request_types'),
          getCachedMasterData<LeaveBalance>('leave_balance'),
        ]);

        if (cachedTypes) setRequestTypes(cachedTypes);
        if (cachedBalance) setLeaveBalance(cachedBalance);
      }
    } catch (err) {
      console.warn('Network issue loading requests, reading from cache:', err);
      const [cachedTypes, cachedBalance] = await Promise.all([
        getCachedMasterData<RequestType[]>('request_types'),
        getCachedMasterData<LeaveBalance>('leave_balance'),
      ]);
      if (cachedTypes) setRequestTypes(cachedTypes);
      if (cachedBalance) setLeaveBalance(cachedBalance);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, currentUserEmail]);

  useEffect(() => {
    if (isAuthLoading) return;
    loadData();
  }, [loadData, isAuthLoading]);

  // Handle Cancellation
  const handleConfirmCancel = async (cancelReason: string) => {
    if (!cancelModalId) return;

    startTransition(async () => {
      const res = await cancelMyRequest(cancelModalId, cancelReason, currentUserEmail);
      if (!res.success) {
        setActionError(res.error || 'Gagal membatalkan pengajuan');
      } else {
        setActionError(null);
        setCancelModalId(null);
        loadData();
      }
    });
  };

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
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Ajukan Cuti / Izin
        </button>
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

      {/* Quota & Status Metric Cards */}
      <RequestsMetrics leaveBalance={leaveBalance} requests={requests} />

      {/* Tabs Bar */}
      <div className="border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
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
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'balance-info'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            Ketentuan & Saldo Cuti
          </button>
        </div>
      </div>

      {/* Tab 1 Content: My Requests List */}
      {activeTab === 'my-requests' && (
        <RequestsList
          loading={loading}
          requests={requests}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onSelectDetails={(req) => setSelectedRequestDetails(req)}
          onInitiateCancel={(id) => setCancelModalId(id)}
        />
      )}

      {/* Tab 2 Content: Balance Info & Guidelines */}
      {activeTab === 'balance-info' && (
        <LeaveBalanceInfo leaveBalance={leaveBalance} />
      )}

      {/* Modal: Create Request */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUserEmail={currentUserEmail}
        requestTypes={requestTypes}
        leaveBalance={leaveBalance}
        onSuccess={loadData}
      />

      {/* Modal: Request Details */}
      <RequestDetailModal
        request={selectedRequestDetails}
        onClose={() => setSelectedRequestDetails(null)}
      />

      {/* Modal: Cancel Confirmation */}
      <CancelRequestModal
        isOpen={!!cancelModalId}
        onClose={() => setCancelModalId(null)}
        onConfirm={handleConfirmCancel}
        isPending={isPending}
      />
    </div>
  );
}
