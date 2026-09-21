import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { RequestItem } from '@/types/database';

interface RequestDetailModalProps {
  request: RequestItem | null;
  onClose: () => void;
}

export function RequestDetailModal({ request, onClose }: RequestDetailModalProps) {
  if (!request) return null;

  return (
    <Modal
      isOpen={!!request}
      onClose={onClose}
      title="Rincian Permohonan"
      description={`ID: ${request.id}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 text-[11px] block">Tipe Pengajuan</span>
            <span className="font-bold text-white text-sm">
              {request.request_type?.name}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Status Akhir</span>
            <span className="font-bold uppercase tracking-wider text-blue-400">
              {request.status}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Tanggal</span>
            <span className="font-mono text-slate-200">
              {request.start_date}
              {request.end_date && request.end_date !== request.start_date
                ? ` s/d ${request.end_date}`
                : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Total Durasi</span>
            <span className="font-bold text-white">
              {request.total_days} hari kerja
            </span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[11px] block mb-1">Alasan Pengajuan:</span>
          <p className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
            {request.reason}
          </p>
        </div>

        {/* Stepper Status */}
        <div>
          <span className="text-slate-400 text-[11px] block mb-2 font-semibold uppercase">
            Riwayat Keputusan Approver:
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
                  {appr.decided_at && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Waktu: {new Date(appr.decided_at).toLocaleString('id-ID')}
                    </span>
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

        {/* Attachments Section */}
        {request.attachments && request.attachments.length > 0 && (
          <div>
            <span className="text-slate-400 text-[11px] block mb-2 font-semibold uppercase">
              Dokumen Lampiran ({request.attachments.length}):
            </span>
            <div className="space-y-2">
              {request.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-slate-200 truncate">{att.file_name}</span>
                    {att.file_size_bytes && (
                      <span className="text-[10px] text-slate-400">
                        ({(att.file_size_bytes / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-semibold transition inline-flex items-center gap-1 shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    Lihat / Unduh
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
