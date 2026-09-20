import React from 'react';
import { Filter, Users, DollarSign } from 'lucide-react';

interface DashboardFilterStripProps {
  selectedMonth: number;
  onMonthChange: (m: number) => void;
  selectedYear: number;
  onYearChange: (y: number) => void;
  selectedDivision: string;
  onDivisionChange: (divId: string) => void;
  divisions: { id: string; name: string }[];
  activeTab: 'hr' | 'management';
  onTabChange: (tab: 'hr' | 'management') => void;
}

export function DashboardFilterStrip({
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  selectedDivision,
  onDivisionChange,
  divisions,
  activeTab,
  onTabChange,
}: DashboardFilterStripProps) {
  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const nowYear = new Date().getFullYear();
  const years = [nowYear - 1, nowYear, nowYear + 1];

  return (
    <div className="bg-[#111827]/70 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Filter Data:</span>
        </div>

        {/* Month Selector */}
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Year Selector */}
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Division Selector */}
        <select
          value={selectedDivision}
          onChange={(e) => onDivisionChange(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 max-w-[200px]"
        >
          <option value="all">Semua Divisi</option>
          {divisions.map((div) => (
            <option key={div.id} value={div.id}>
              {div.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dual-Perspective Switcher */}
      <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onTabChange('hr')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'hr'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Operasional SDM (HR)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('management')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'management'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Executive & Biaya</span>
        </button>
      </div>
    </div>
  );
}
