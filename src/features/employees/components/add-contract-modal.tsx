'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { ContractType } from '@/types/database';

interface AddContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  contractType: ContractType;
  setContractType: (t: ContractType) => void;
  contractStartDate: string;
  setContractStartDate: (d: string) => void;
  contractEndDate: string;
  setContractEndDate: (d: string) => void;
  contractBaseSalary: string;
  setContractBaseSalary: (s: string) => void;
  contractNotes: string;
  setContractNotes: (n: string) => void;
  contractError: string | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddContractModal({
  isOpen,
  onClose,
  employeeName,
  contractType,
  setContractType,
  contractStartDate,
  setContractStartDate,
  contractEndDate,
  setContractEndDate,
  contractBaseSalary,
  setContractBaseSalary,
  contractNotes,
  setContractNotes,
  contractError,
  isPending,
  onSubmit,
}: AddContractModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Kontrak Kerja Baru"
      description={`Karyawan: ${employeeName}`}
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        {contractError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{contractError}</span>
          </div>
        )}

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Jenis Perjanjian Kerja <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setContractType('pkwt')}
              className={`p-3 rounded-xl border font-semibold text-center transition cursor-pointer ${
                contractType === 'pkwt'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              PKWT (Waktu Tertentu)
            </button>
            <button
              type="button"
              onClick={() => setContractType('pkwtt')}
              className={`p-3 rounded-xl border font-semibold text-center transition cursor-pointer ${
                contractType === 'pkwtt'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              PKWTT (Tetap)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Tanggal Mulai <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          {contractType === 'pkwt' && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Tanggal Berakhir <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={contractEndDate}
                min={contractStartDate}
                onChange={(e) => setContractEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Gaji Pokok (Base Salary) <span className="text-rose-400">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={contractBaseSalary}
            onChange={(e) => setContractBaseSalary(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
            required
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            Format: Rp {Number(contractBaseSalary || 0).toLocaleString('id-ID')}
          </span>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Catatan Kontrak (Opsional)
          </label>
          <textarea
            rows={2}
            value={contractNotes}
            onChange={(e) => setContractNotes(e.target.value)}
            placeholder="Contoh: Perpanjangan PKWT II masa 1 tahun, penyesuaian gaji pokok evaluasi tahunan..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
            {isPending ? 'Menyimpan...' : 'Simpan Kontrak'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
