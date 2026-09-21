'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  RotateCcw,
  Search,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Send,
} from 'lucide-react';
import { OdooSyncOutboxItem } from '@/types/database';

interface OdooOutboxTableProps {
  items: OdooSyncOutboxItem[];
  loading: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  activeTab: 'pending' | 'history';
  setActiveTab: (tab: 'pending' | 'history') => void;
  entityFilter: string;
  setEntityFilter: (f: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  syncingId: string | null;
  isPending: boolean;
  onPreviewPayload: (item: OdooSyncOutboxItem) => void;
  onSyncSingle: (id: string) => void;
  onRetry: (id: string) => void;
  onCollectData: () => void;
}

export function OdooOutboxTable({
  items,
  loading,
  pendingCount,
  syncedCount,
  failedCount,
  activeTab,
  setActiveTab,
  entityFilter,
  setEntityFilter,
  searchQuery,
  setSearchQuery,
  syncingId,
  isPending,
  onPreviewPayload,
  onSyncSingle,
  onRetry,
  onCollectData,
}: OdooOutboxTableProps) {
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
    <Card>
      {/* Tab & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
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
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
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
                onClick={onCollectData}
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
                          onClick={() => onPreviewPayload(item)}
                          className="h-7 px-2 text-[11px] border-slate-800 text-slate-400 hover:text-white"
                        >
                          <FileCode className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Payload
                        </Button>

                        {/* Sync / Retry Button */}
                        {activeTab === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => onSyncSingle(item.id)}
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
                            onClick={() => onRetry(item.id)}
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
  );
}
