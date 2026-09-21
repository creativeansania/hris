'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Division } from '@/types/database';

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  divisions: Division[];
  mutationDivisionId: string;
  setMutationDivisionId: (id: string) => void;
  mutationTitle: string;
  setMutationTitle: (t: string) => void;
  mutationStartDate: string;
  setMutationStartDate: (d: string) => void;
  mutationError: string | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddPositionModal({
  isOpen,
  onClose,
  employeeName,
  divisions,
  mutationDivisionId,
  setMutationDivisionId,
  mutationTitle,
  setMutationTitle,
  mutationStartDate,
  setMutationStartDate,
  mutationError,
  isPending,
  onSubmit,
}: AddPositionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Mutasi / Promosi Jabatan"
      description={`Karyawan: ${employeeName}`}
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        {mutationError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mutationError}</span>
          </div>
        )}

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Divisi Tujuan <span className="text-rose-400">*</span>
          </label>
          <select
            value={mutationDivisionId}
            onChange={(e) => setMutationDivisionId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">-- Pilih Divisi --</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Judul Jabatan / Posisi Baru <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={mutationTitle}
            onChange={(e) => setMutationTitle(e.target.value)}
            placeholder="Contoh: Senior Frontend Engineer, SPV Gudang"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Tanggal Efektif Mutasi <span className="text-rose-400">*</span>
          </label>
          <input
            type="date"
            value={mutationStartDate}
            onChange={(e) => setMutationStartDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            {isPending ? 'Menyimpan...' : 'Simpan Mutasi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
