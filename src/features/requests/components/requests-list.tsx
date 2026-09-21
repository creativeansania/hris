import React from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { RequestItem } from '@/types/database';

interface RequestsListProps {
  loading: boolean;
  requests: RequestItem[];
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  onOpenCreateModal: () => void;
  onSelectDetails: (req: RequestItem) => void;
  onInitiateCancel: (id: string) => void;
}

export function RequestsList({
  loading,
  requests,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  onOpenCreateModal,
  onSelectDetails,
  onInitiateCancel,
}: RequestsListProps) {
  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex items-center justify-end gap-2 py-1">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="all">Semua Kategori</option>
          <option value="cuti">Khusus Cuti</option>
          <option value="izin">Khusus Izin</option>
        </select>

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

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Memuat daftar pengajuan...</p>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum Ada Pengajuan"
          description="Anda belum memiliki riwayat permohonan cuti, izin, atau sakit. Buat permohonan baru untuk diproses oleh atasan & HR."
          actionLabel="Buat Pengajuan Baru"
          onAction={onOpenCreateModal}
        />
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
                    onClick={() => onSelectDetails(req)}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                  </button>

                  {isPendingReq && (
                    <button
                      onClick={() => onInitiateCancel(req.id)}
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
  );
}
