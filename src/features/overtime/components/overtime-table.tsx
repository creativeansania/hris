import React from 'react';
import {
  CalendarDays,
  Clock,
  Briefcase,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RequestItem } from '@/types/database';

interface OvertimeTableProps {
  loading: boolean;
  displayedList: RequestItem[];
  activeTab: 'my-overtime' | 'team-overtime';
  isSupervisorOrAbove: boolean;
  onOpenAssignModal: () => void;
  onSelectDetail: (req: RequestItem) => void;
  onInitiateCancel: (id: string) => void;
}

export function OvertimeTable({
  loading,
  displayedList,
  activeTab,
  isSupervisorOrAbove,
  onOpenAssignModal,
  onSelectDetail,
  onInitiateCancel,
}: OvertimeTableProps) {
  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Memuat data penugasan lembur...</p>
      </div>
    );
  }

  if (displayedList.length === 0) {
    return (
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
            onClick={onOpenAssignModal}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tugaskan Lembur Sekarang
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedList.map((req) => {
        const hrAppr = req.approvals?.find((a) =>
          ['hr', 'admin'].includes(a.approver_role)
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
                onClick={() => onSelectDetail(req)}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition cursor-pointer"
              >
                Detail
              </button>

              {/* Supervisor cancel option if still pending */}
              {isSupervisorOrAbove && isPendingReq && (
                <button
                  onClick={() => onInitiateCancel(req.id)}
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
  );
}
