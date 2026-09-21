'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Copy, Check, CheckCircle2 } from 'lucide-react';
import { OdooSyncOutboxItem } from '@/types/database';

interface OdooPayloadModalProps {
  previewItem: OdooSyncOutboxItem | null;
  onClose: () => void;
}

export function OdooPayloadModal({
  previewItem,
  onClose,
}: OdooPayloadModalProps) {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Copy JSON to clipboard
  const handleCopyJSON = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={Boolean(previewItem)}
      onClose={onClose}
      title="Inspeksi Payload JSON Model Odoo"
      description={`Model: ${previewItem?.odoo_model || 'hr.attendance'} • Entitas: ${previewItem?.entity_type}`}
      maxWidth="2xl"
    >
      {previewItem && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-purple-400 font-semibold">
                {previewItem.odoo_model}
              </span>
              <span>&bull;</span>
              <span>ID: {previewItem.id.slice(0, 8)}...</span>
            </div>
            <button
              onClick={() => handleCopyJSON(previewItem.payload_json)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salin JSON</span>
                </>
              )}
            </button>
          </div>

          {/* JSON Code Block */}
          <div className="relative rounded-lg bg-slate-950 p-4 border border-slate-800 overflow-x-auto max-h-72">
            <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
              {JSON.stringify(previewItem.payload_json, null, 2)}
            </pre>
          </div>

          {/* Response Section (If synced or failed) */}
          {previewItem.odoo_response_json && (
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Respon Pengakuan Odoo:</span>
              </div>
              <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto max-h-40">
                {JSON.stringify(previewItem.odoo_response_json, null, 2)}
              </pre>
            </div>
          )}

          {previewItem.error_message && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              <strong>Pesan Kegagalan:</strong> {previewItem.error_message}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 text-slate-300"
            >
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
