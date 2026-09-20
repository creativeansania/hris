import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface CreatePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (start: string, end: string, notes?: string) => Promise<void>;
  isPending: boolean;
}

export function CreatePeriodModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: CreatePeriodModalProps) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) return;
    await onSubmit(periodStart, periodEnd, notes);
    setNotes('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buka Periode Payroll Baru"
      description="Tentukan rentang tanggal cut-off presensi dan perhitungan gaji."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Tanggal Mulai Cut-off
            </label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Tanggal Akhir Cut-off
            </label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Catatan Periode (Opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Misal: Payroll Reguler Akhir Bulan, sudah termasuk penyesuaian lembur..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="border-slate-700 text-slate-300"
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            {isPending ? 'Menyimpan...' : 'Buka Periode'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
