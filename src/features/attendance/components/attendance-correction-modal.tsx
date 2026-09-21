'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttendanceRecordItem } from '@/app/actions/attendance';
import { AttendanceCorrectionItem } from '@/types/database';
import { Clock, History, AlertCircle } from 'lucide-react';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecordItem | null;
  pastCorrections: AttendanceCorrectionItem[];
  onSubmit: (attendanceId: string, clockIn: string, clockOut: string, reason: string) => Promise<void>;
  isSaving: boolean;
  feedback: string | null;
}

export function AttendanceCorrectionModal({
  isOpen,
  onClose,
  record,
  pastCorrections,
  onSubmit,
  isSaving,
  feedback,
}: AttendanceCorrectionModalProps) {
  if (!record) return null;

  const [clockIn, setClockIn] = useState(record.clock_in ? record.clock_in.slice(0, 5) : '08:00');
  const [clockOut, setClockOut] = useState(record.clock_out ? record.clock_out.slice(0, 5) : '17:00');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onSubmit(record.id, clockIn, clockOut, reason);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Koreksi Manual Jam Presensi"
      description={`Karyawan: ${record.employee?.full_name} (${record.attendance_date})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {feedback && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Jam Masuk (Clock In)
            </label>
            <Input
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              required
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Jam Pulang (Clock Out)
            </label>
            <Input
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Alasan Koreksi Manual <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="Contoh: Mesin fingerprint error saat jam masuk shift pagi..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Audit Trail of Past Corrections */}
        {pastCorrections.length > 0 && (
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-2">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Riwayat Koreksi Sebelumnya:</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {pastCorrections.map((c) => (
                <div key={c.id} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Oleh: <strong className="text-slate-200">{c.modifier?.full_name || 'Admin'}</strong></span>
                    <span className="font-mono">{new Date(c.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <p className="text-slate-300 mt-0.5">&ldquo;{c.reason}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="border-slate-700 text-slate-300"
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSaving || !reason.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Koreksi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
