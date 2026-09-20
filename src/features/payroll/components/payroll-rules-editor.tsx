import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { PayrollRule } from '@/types/database';
import { Sliders, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PayrollRulesEditorProps {
  rules: PayrollRule[];
  onUpdateRule: (id: string, value: string) => Promise<void>;
  isPending: boolean;
}

export function PayrollRulesEditor({
  rules,
  onUpdateRule,
  isPending,
}: PayrollRulesEditorProps) {
  const [editingRule, setEditingRule] = useState<PayrollRule | null>(null);
  const [ruleValue, setRuleValue] = useState('');

  const handleStartEdit = (rule: PayrollRule) => {
    setEditingRule(rule);
    setRuleValue(rule.rule_value);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    await onUpdateRule(editingRule.id, ruleValue);
    setEditingRule(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Parameter & Aturan Penggajian</h3>
          <p className="text-xs text-slate-400">
            Tarif persentase BPJS, batas upah maksimal, dan koefisien lembur sesuai regulasi resmi.
          </p>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          PP 58/2023 & BPJS 2024
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <Card
            key={rule.id}
            className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200 font-mono">
                    {rule.rule_key}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">{rule.description}</p>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                  {rule.value_type}
                </span>
              </div>

              <div className="my-3 py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-base font-bold text-emerald-400">
                {rule.rule_value}
                {rule.value_type === 'percentage' && '%'}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartEdit(rule)}
                className="border-slate-700 text-slate-300 hover:text-white text-xs"
              >
                <Sliders className="w-3.5 h-3.5 mr-1" />
                Ubah Nilai
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRule(null)}
          title={`Ubah Aturan: ${editingRule.rule_key}`}
          description={editingRule.description || 'Masukkan nilai parameter baru'}
          maxWidth="sm"
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Nilai ({editingRule.value_type})
              </label>
              <Input
                type="text"
                value={ruleValue}
                onChange={(e) => setRuleValue(e.target.value)}
                required
                className="bg-slate-900 border-slate-700 text-slate-200 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingRule(null)}
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
                {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
