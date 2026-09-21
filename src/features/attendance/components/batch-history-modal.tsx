import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { History, FileSpreadsheet } from 'lucide-react';
import { AttendanceImportBatchItem } from '@/types/database';

interface BatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: AttendanceImportBatchItem[];
}

export function BatchHistoryModal({ isOpen, onClose, batches }: BatchHistoryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Riwayat Batch Import Fingerprint"
      description="Daftar berkas absensi mesin yang telah diunggah dan direkonsiliasi ke sistem."
      maxWidth="md"
    >
      <div className="space-y-3 text-xs">
        {batches.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum Ada Riwayat Batch"
            description="Riwayat pengunggahan file mesin fingerprint akan tercatat otomatis di sini."
          />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {batches.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-[#0d1322] border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-slate-200">{b.file_name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(b.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>
                    Oleh: <strong className="text-slate-300">{b.uploaded_by_user?.full_name || 'Admin'}</strong>
                  </span>
                  <span>
                    Sukses: <strong className="text-emerald-400">{b.inserted_count || 0}</strong> &bull; Skip:{' '}
                    <strong className="text-amber-400">{b.skipped_count || 0}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-700 text-slate-300"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}
