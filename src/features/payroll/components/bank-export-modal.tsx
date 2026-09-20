import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { CreditCard, Download, Building, ShieldCheck } from 'lucide-react';
import { formatIDR } from '@/lib/formatters';

interface BankExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'bca' | 'mandiri') => void;
  totalEmployees: number;
  totalNetPay: number;
  periodLabel: string;
}

export function BankExportModal({
  isOpen,
  onClose,
  onExport,
  totalEmployees,
  totalNetPay,
  periodLabel,
}: BankExportModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export File Batch Transfer Bank"
      description={`Format CSV terstandardisasi untuk upload langsung ke internet banking korporasi (${periodLabel}).`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Total Karyawan:</span>
            <span className="font-semibold text-white">{totalEmployees} orang</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Total Nominal Transfer:</span>
            <span className="font-mono font-bold text-emerald-400">{formatIDR(totalNetPay)}</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* BCA Option */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d1322] hover:border-blue-500/40 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                BCA
              </div>
              <div>
                <p className="font-semibold text-slate-200">BCA Payroll (KlikBCA Bisnis)</p>
                <p className="text-[11px] text-slate-400">Format CSV Transfer Batch KlikBCA Korporat</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                onExport('bca');
                onClose();
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download CSV
            </Button>
          </div>

          {/* Mandiri Option */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d1322] hover:border-amber-500/40 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                MCM
              </div>
              <div>
                <p className="font-semibold text-slate-200">Mandiri Cash Management (MCM)</p>
                <p className="text-[11px] text-slate-400">Format CSV Payroll Transfer MCM 2.0</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                onExport('mandiri');
                onClose();
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download CSV
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
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
