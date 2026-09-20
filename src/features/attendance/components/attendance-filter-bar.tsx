import React from 'react';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Division } from '@/types/database';

interface AttendanceFilterBarProps {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedDivision: string;
  onDivisionChange: (divisionId: string) => void;
  divisions: Division[];
  statusFilter: 'all' | 'present' | 'late' | 'absent';
  onStatusFilterChange: (status: 'all' | 'present' | 'late' | 'absent') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function AttendanceFilterBar({
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  selectedDivision,
  onDivisionChange,
  divisions,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
}: AttendanceFilterBarProps) {
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

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="bg-[#111827]/70 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm text-xs">
      {/* Left Selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Filter:</span>
        </div>

        {/* Month */}
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Division */}
        <select
          value={selectedDivision}
          onChange={(e) => onDivisionChange(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 max-w-[170px]"
        >
          <option value="all">Semua Divisi</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as 'all' | 'present' | 'late' | 'absent')
          }
          className="bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="present">Hadir Tepat Waktu</option>
          <option value="late">Terlambat</option>
          <option value="absent">Alpa / Absen</option>
        </select>
      </div>

      {/* Right Search Bar */}
      <div className="relative min-w-[200px] sm:min-w-[260px]">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Cari nama karyawan / email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 bg-slate-900 border-slate-700 text-xs text-slate-200 h-8"
        />
      </div>
    </div>
  );
}
