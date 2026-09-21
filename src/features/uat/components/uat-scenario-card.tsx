'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Scenario, UatStatus } from '../types';

interface UatScenarioCardProps {
  scenario: Scenario;
  status: UatStatus;
  note: string;
  onUpdateStatus: (id: string, status: UatStatus) => void;
  onUpdateNote: (id: string, note: string) => void;
}

export function UatScenarioCard({
  scenario,
  status,
  note,
  onUpdateStatus,
  onUpdateNote,
}: UatScenarioCardProps) {
  return (
    <div
      className={`rounded-2xl border transition-all p-5 md:p-6 ${
        status === 'passed'
          ? 'bg-emerald-950/10 border-emerald-500/30'
          : status === 'failed'
          ? 'bg-rose-950/10 border-rose-500/30'
          : 'bg-[#0d1322] border-slate-800/80'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {scenario.id}
            </span>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {scenario.role.replace('_', ' ')}
            </span>
            <h3 className="text-base font-semibold text-white tracking-tight">
              {scenario.title}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-slate-300">
              <span className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                Langkah Pengujian
              </span>
              {scenario.steps}
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-slate-300">
              <span className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                Hasil yang Diharapkan
              </span>
              {scenario.expected}
            </div>
          </div>

          {/* Note Input */}
          <div className="pt-1">
            <input
              type="text"
              placeholder="Catatan tester / temuan bug (opsional)..."
              value={note}
              onChange={(e) => onUpdateNote(scenario.id, e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status & Action Buttons */}
        <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 shrink-0 pt-2 lg:pt-0">
          <Link
            href={scenario.targetUrl}
            target="_blank"
            className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <span>{scenario.actionLabel}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onUpdateStatus(scenario.id, 'passed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all ${
                status === 'passed'
                  ? 'bg-emerald-500 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pass</span>
            </button>
            <button
              onClick={() => onUpdateStatus(scenario.id, 'failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all ${
                status === 'failed'
                  ? 'bg-rose-500 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Fail</span>
            </button>
            <button
              onClick={() => onUpdateStatus(scenario.id, 'pending')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all ${
                status === 'pending'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Set to Pending"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
