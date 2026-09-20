import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ImportPreviewResult, PreviewRow } from '@/app/actions/attendance';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AttendanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyzeFile: (file: File) => Promise<void>;
  onConfirmImport: (duplicateHandling: 'skip' | 'overwrite') => Promise<void>;
  previewResult: ImportPreviewResult | null;
  isAnalyzing: boolean;
  isSaving: boolean;
  feedback: { success: boolean; message: string; inserted?: number; skipped?: number } | null;
}

export function AttendanceImportModal({
  isOpen,
  onClose,
  onAnalyzeFile,
  onConfirmImport,
  previewResult,
  isAnalyzing,
  isSaving,
  feedback,
}: AttendanceImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'overwrite'>('skip');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onAnalyzeFile(file);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Log Presensi Mesin Fingerprint"
      description="Unggah file ekspor fingerprint (.xlsx / .csv) untuk rekonsiliasi presensi otomatis."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 ${
              feedback.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* File Dropzone */}
        {!previewResult && (
          <div className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/60 rounded-2xl p-6 sm:p-8 text-center bg-slate-900/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-200">
              Pilih file ekspor fingerprint (.xlsx / .csv)
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Sistem akan mencocokkan PIN/NIK karyawan dan menghitung jam masuk serta keterlambatan secara otomatis.
            </p>

            <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer shadow-md shadow-blue-500/20">
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Menganalisis File...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Pilih File
                </>
              )}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isAnalyzing}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Preview Results & Actions */}
        {previewResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-slate-400 text-[11px]">Total Baris:</span>
                <p className="text-base font-bold text-white font-mono">{previewResult.total_rows}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Karyawan Cocok:</span>
                <p className="text-base font-bold text-emerald-400 font-mono">
                  {previewResult.matched_count}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Duplikat / Skip:</span>
                <p className="text-base font-bold text-amber-400 font-mono">
                  {previewResult.duplicate_count}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1322] border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-medium">
                Strategi Penanganan Data Duplikat:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="dup"
                    value="skip"
                    checked={duplicateHandling === 'skip'}
                    onChange={() => setDuplicateHandling('skip')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>Lewati baris yang sudah ada (Aman)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="dup"
                    value="overwrite"
                    checked={duplicateHandling === 'overwrite'}
                    onChange={() => setDuplicateHandling('overwrite')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>Timpa data presensi lama</span>
                </label>
              </div>
            </div>

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
                type="button"
                size="sm"
                onClick={() => onConfirmImport(duplicateHandling)}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {isSaving ? 'Menyimpan Presensi...' : 'Konfirmasi & Simpan Impor'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
