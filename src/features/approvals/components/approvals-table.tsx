import React from 'react';
import {
  CalendarDays,
  Clock,
  FileText,
  Eye,
  User,
  Download,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Badge, RoleBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { RequestItem } from '@/types/database';

interface ApprovalsTableProps {
  loading: boolean;
  requests: RequestItem[];
  activeTab: 'pending-my' | 'all' | 'history' | 'balances';
  currentUserId: string | null;
  isHrOrAdmin: boolean;
  onSelectDetails: (req: RequestItem) => void;
  onOpenDecision: (req: RequestItem, action: 'approved' | 'rejected') => void;
}

export function ApprovalsTable({
  loading,
  requests,
  activeTab,
  currentUserId,
  isHrOrAdmin,
  onSelectDetails,
  onOpenDecision,
}: ApprovalsTableProps) {
  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Memuat daftar permohonan...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => {
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
                onClick={() => onSelectDetails(req)}
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Rincian Lengkap
              </button>

              {canDecide ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenDecision(req, 'rejected')}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Tolak
                  </button>
                  <button
                    onClick={() => onOpenDecision(req, 'approved')}
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
  );
}
