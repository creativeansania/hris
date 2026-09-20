'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Division, EmployeeRole, EmployeeStatus } from '@/types/database';
import { ROLE_LABELS } from '@/lib/constants';

interface EmployeeFilterToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedRole: EmployeeRole | 'all';
  onRoleChange: (val: EmployeeRole | 'all') => void;
  selectedDivision: string | 'all';
  onDivisionChange: (val: string | 'all') => void;
  selectedStatus: EmployeeStatus | 'all';
  onStatusChange: (val: EmployeeStatus | 'all') => void;
  divisions: Division[];
}

export function EmployeeFilterToolbar({
  searchTerm,
  onSearchChange,
  selectedRole,
  onRoleChange,
  selectedDivision,
  onDivisionChange,
  selectedStatus,
  onStatusChange,
  divisions,
}: EmployeeFilterToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, email Google, atau NIK..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value as EmployeeRole | 'all')}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Semua Role</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={selectedDivision}
          onChange={(e) => onDivisionChange(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Semua Divisi</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as EmployeeStatus | 'all')}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="pending_claim">Menunggu Klaim</option>
          <option value="inactive">Non-Aktif</option>
        </select>
      </div>
    </div>
  );
}
