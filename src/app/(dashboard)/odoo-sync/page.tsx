'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  getOdooSyncOutbox,
  collectPendingSyncData,
  executeOdooSync,
  retryFailedOdooSync,
  getOdooConnectionConfig,
} from '@/app/actions/odoo';
import { OdooSyncOutboxItem, OdooSyncStatus } from '@/types/database';
import {
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Database,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Clock,
  Sparkles,
  Server,
  FileCode,
  Copy,
  Check,
  Calendar,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function OdooSyncPage() {
  const [isPending, startTransition] = useTransition();

  // Outbox Data State
  const [items, setItems] = useState<OdooSyncOutboxItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>('');

  // Connection State
  const [connectionConfig, setConnectionConfig] = useState<{
    isConfigured: boolean;
    mode: 'live' | 'sandbox';
    url: string | null;
  }>({
    isConfigured: false,
    mode: 'sandbox',
    url: null,
  });

  // Filter & Search
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Operation State
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // JSON Preview Modal State
  const [previewItem, setPreviewItem] = useState<OdooSyncOutboxItem | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Syncing specific ID state
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Initial user & config fetch
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);

      const cfg = await getOdooConnectionConfig();
      setConnectionConfig(cfg);
    };
    init();
  }, []);

  // Fetch Outbox
  const loadOutboxData = () => {
    setLoading(true);
    startTransition(async () => {
      const res = await getOdooSyncOutbox();
      if (!res.error) {
        setItems(res.items);
        setPendingCount(res.pendingCount);
        setSyncedCount(res.syncedCount);
        setFailedCount(res.failedCount);
        setTotalCount(res.totalCount);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadOutboxData();
  }, []);

  // Handler: Collect new pending data
  const handleCollectData = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await collectPendingSyncData(userEmail);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  // Handler: Sync all pending
  const handleSyncAllPending = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await executeOdooSync({ executorEmail: userEmail });
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  // Handler: Sync specific item
  const handleSyncSingle = (outboxId: string) => {
    setSyncingId(outboxId);
    setActionMessage(null);
    startTransition(async () => {
      const res = await executeOdooSync({
        outboxIds: [outboxId],
        executorEmail: userEmail,
      });
      setSyncingId(null);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  // Handler: Retry failed item
  const handleRetry = (outboxId: string) => {
    setSyncingId(outboxId);
    setActionMessage(null);
    startTransition(async () => {
      const res = await retryFailedOdooSync(outboxId, userEmail);
      setSyncingId(null);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
        loadOutboxData();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || res.message,
        });
      }
    });
  };

  // Copy JSON to clipboard
  const handleCopyJSON = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filter items by tab, entity, and search
  const filteredItems = items.filter((item) => {
    // Tab filter
    if (activeTab === 'pending') {
      if (item.status !== 'pending') return false;
    } else {
      if (item.status === 'pending') return false;
    }

    // Entity filter
    if (entityFilter !== 'all' && item.entity_type !== entityFilter) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const empName = item.employee?.full_name?.toLowerCase() || '';
      const empNik = item.employee?.nik?.toLowerCase() || '';
      const model = item.odoo_model?.toLowerCase() || '';
      return empName.includes(q) || empNik.includes(q) || model.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Connection Status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              SPRINT 9 — INTEGRASI ODOO ERP
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">Outbox Pattern & Manual Push</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sinkronisasi Odoo
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pengumpulan otomatis data presensi, cuti, izin, dan lembur untuk di-push ke modul Odoo dengan audit trail.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCollectData}
            disabled={isPending}
            className="border-slate-800 text-slate-200 hover:bg-slate-850 hover:text-white"
          >
            <Layers className="w-4 h-4 mr-1.5 text-blue-400" />
            Pindai & Kumpulkan Data
          </Button>

          <Button
            size="sm"
            onClick={handleSyncAllPending}
            disabled={isPending || pendingCount === 0}
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-900/30"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Sync Semua ({pendingCount})
          </Button>
        </div>
      </div>

      {/* Connection Info Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connectionConfig.mode === 'live'
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-300 font-medium">Status Integrasi Odoo:</span>
          {connectionConfig.mode === 'live' ? (
            <span className="text-emerald-400 font-mono">
              Live Connection ({connectionConfig.url})
            </span>
          ) : (
            <span className="text-amber-300/90">
              Sandbox Validation Mode (Simulasi Payload Aktif & Validasi Odoo Model)
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Sinkronisasi bersifat Manual oleh HR (PRD §12) &bull; Max Retry: 3x
        </div>
      </div>

      {/* Alert Banner for Operations */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Sync */}
        <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Menunggu Sinkronisasi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-blue-400">
              {pendingCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Data siap di-push ke server Odoo
            </p>
          </div>
        </Card>

        {/* Synced Successfully */}
        <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Berhasil Terkirim</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {syncedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tercatat & diakui downstream Odoo
            </p>
          </div>
        </Card>

        {/* Failed / Needs Retry */}
        <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Gagal / Perlu Retry</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-400">
              {failedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dapat dicoba ulang hingga 3x
            </p>
          </div>
        </Card>

        {/* Total Outbox Records */}
        <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Antrean Outbox</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-purple-300">
              {totalCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Akumulasi record outbox di database
            </p>
          </div>
        </Card>
      </div>

      {/* 3. Main Data Card with Tabs & Filters */}
      <Card>
        {/* Tab & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Antrean Pending ({pendingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Riwayat & Log Sinkronisasi ({syncedCount + failedCount})</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Entitas</option>
              <option value="attendance">Presensi (hr.attendance)</option>
              <option value="leave">Cuti & Izin (hr.leave)</option>
              <option value="overtime">Lembur (hr.attendance.overtime)</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, NIK, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading && items.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Memuat data outbox Odoo...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            {activeTab === 'pending'
              ? 'Tidak ada antrean data pending yang perlu disinkronkan saat ini.'
              : 'Belum ada riwayat sinkronisasi untuk kriteria filter yang dipilih.'}
            {activeTab === 'pending' && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCollectData}
                  className="text-xs border-slate-700 text-slate-300"
                >
                  Pindai Data Presensi & Pengajuan
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Entitas</th>
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Model Odoo</th>
                  <th className="px-4 py-3">Waktu / Tanggal</th>
                  {activeTab === 'history' && (
                    <>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Percobaan</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => {
                  const p = item.payload_json;
                  const isSyncing = syncingId === item.id;

                  // Entity badge style
                  let entityBadge = {
                    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    label: 'Presensi',
                  };
                  if (item.entity_type === 'leave') {
                    entityBadge = {
                      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      label: 'Cuti / Izin',
                    };
                  } else if (item.entity_type === 'overtime') {
                    entityBadge = {
                      bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                      label: 'Lembur',
                    };
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Entity Type */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border font-medium ${entityBadge.bg}`}
                        >
                          {entityBadge.label}
                        </span>
                      </td>

                      {/* Employee Details */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">
                          {item.employee?.full_name || p?.employee_name || 'Karyawan'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          NIK: {item.employee?.nik || p?.employee_nik || '-'}
                        </div>
                      </td>

                      {/* Odoo Model */}
                      <td className="px-4 py-3">
                        <code className="text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-purple-300 font-mono">
                          {item.odoo_model || 'hr.attendance'}
                        </code>
                      </td>

                      {/* Date / Timestamp */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {p?.check_in || p?.date_from || p?.date || new Date(item.created_at).toLocaleDateString('id-ID')}
                      </td>

                      {/* Status & Retry Count (History Tab) */}
                      {activeTab === 'history' && (
                        <>
                          <td className="px-4 py-3 text-center">
                            {item.status === 'synced' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                <CheckCircle2 className="w-3 h-3" />
                                Synced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                                <AlertTriangle className="w-3 h-3" />
                                Failed
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center font-mono text-[11px]">
                            <span
                              className={
                                item.retry_count >= item.max_retries
                                  ? 'text-rose-400 font-bold'
                                  : 'text-slate-400'
                              }
                            >
                              {item.retry_count} / {item.max_retries}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Preview JSON */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewItem(item)}
                            className="h-7 px-2 text-[11px] border-slate-800 text-slate-400 hover:text-white"
                          >
                            <FileCode className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            Payload
                          </Button>

                          {/* Sync / Retry Button */}
                          {activeTab === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleSyncSingle(item.id)}
                              disabled={isPending || isSyncing}
                              className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium"
                            >
                              {isSyncing ? (
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <Send className="w-3 h-3 mr-1" />
                              )}
                              Sync
                            </Button>
                          )}

                          {activeTab === 'history' && item.status === 'failed' && (
                            <Button
                              size="sm"
                              onClick={() => handleRetry(item.id)}
                              disabled={isPending || isSyncing || item.retry_count >= item.max_retries}
                              className="h-7 px-2.5 text-[11px] bg-rose-600/80 hover:bg-rose-500 text-white font-medium"
                            >
                              {isSyncing ? (
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <RotateCcw className="w-3 h-3 mr-1" />
                              )}
                              Retry
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. JSON Payload Inspector Modal */}
      <Modal
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title="Inspeksi Payload JSON Model Odoo"
        description={`Model: ${previewItem?.odoo_model || 'hr.attendance'} • Entitas: ${previewItem?.entity_type}`}
        maxWidth="2xl"
      >
        {previewItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-purple-400 font-semibold">
                  {previewItem.odoo_model}
                </span>
                <span>&bull;</span>
                <span>ID: {previewItem.id.slice(0, 8)}...</span>
              </div>
              <button
                onClick={() => handleCopyJSON(previewItem.payload_json)}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Salin JSON</span>
                  </>
                )}
              </button>
            </div>

            {/* JSON Code Block */}
            <div className="relative rounded-lg bg-slate-950 p-4 border border-slate-800 overflow-x-auto max-h-72">
              <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                {JSON.stringify(previewItem.payload_json, null, 2)}
              </pre>
            </div>

            {/* Response Section (If synced or failed) */}
            {previewItem.odoo_response_json && (
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Respon Pengakuan Odoo:</span>
                </div>
                <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto max-h-40">
                  {JSON.stringify(previewItem.odoo_response_json, null, 2)}
                </pre>
              </div>
            )}

            {previewItem.error_message && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                <strong>Pesan Kegagalan:</strong> {previewItem.error_message}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewItem(null)}
                className="border-slate-800 text-slate-300"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
