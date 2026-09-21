import React from 'react';
import { Modal } from '@/components/ui/modal';
import { RequestItem } from '@/types/database';

interface OvertimeDetailModalProps {
  request: RequestItem | null;
  onClose: () => void;
}

export function OvertimeDetailModal({ request, onClose }: OvertimeDetailModalProps) {
  if (!request) return null;

  return (
    <Modal
      isOpen={!!request}
      onClose={onClose}
      title="Rincian Surat Tugas Lembur"
      description={`ID: ${request.id}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 text-[11px] block">Karyawan</span>
            <span className="font-bold text-white text-sm">
              {request.employee?.full_name}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {request.employee?.division?.name}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Ditugaskan Oleh</span>
            <span className="font-bold text-blue-400 text-sm">
              {request.created_by_user?.full_name || 'Atasan'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Tanggal Lembur</span>
            <span className="font-mono text-slate-200">{request.start_date}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Jam & Durasi</span>
            <span className="font-mono text-white">
              {request.start_time?.slice(0, 5)} - {request.end_time?.slice(0, 5)}{' '}
              ({request.total_days} Jam)
            </span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[11px] block mb-1 font-semibold">
            Uraian Tugas Lembur:
          </span>
          <p className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
            {request.reason}
          </p>
        </div>

        <div>
          <span className="text-slate-400 text-[11px] block mb-2 font-semibold uppercase">
            Status Persetujuan:
          </span>
          <div className="space-y-2">
            {request.approvals?.map((appr) => (
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
  );
}
