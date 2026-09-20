'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/ui/pagination';
import { Users, UserPlus } from 'lucide-react';
import {
  EmployeeMetrics,
  ContractAlertBox,
  EmployeeFilterToolbar,
  EmployeeTable,
  EmployeeFormModal,
  EmployeeDetailModal,
} from '@/features/employees';
import {
  getEmployees,
  setEmployeeStatus,
} from '@/app/actions/employees';
import { getDivisions } from '@/app/actions/divisions';
import { getScheduleGroups } from '@/app/actions/schedules';
import { getExpiringContracts } from '@/app/actions/contracts';
import {
  Employee,
  Division,
  WorkScheduleGroup,
  EmployeeRole,
  EmployeeStatus,
} from '@/types/database';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  const [selectedDivision, setSelectedDivision] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus | 'all'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Contract warnings
  const [expiringContracts, setExpiringContracts] = useState<any[]>([]);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [warningCount, setWarningCount] = useState<number>(0);

  const loadAllData = async (page: number = currentPage) => {
    setIsLoading(true);
    setError(null);

    const [empRes, divRes, schedRes, expRes] = await Promise.all([
      getEmployees({
        search: searchTerm,
        role: selectedRole,
        divisionId: selectedDivision,
        status: selectedStatus,
        page,
        pageSize,
      }),
      getDivisions(),
      getScheduleGroups(),
      getExpiringContracts(30),
    ]);

    if (empRes.error) {
      setError(empRes.error);
    } else {
      setEmployees(empRes.data);
      setTotalCount(empRes.total);
      setTotalPages(empRes.totalPages);
    }

    if (divRes.data) setDivisions(divRes.data);
    if (schedRes.data) setSchedules(schedRes.data);
    if (expRes.data) {
      setExpiringContracts(expRes.data);
      setCriticalCount(expRes.criticalCount);
      setWarningCount(expRes.warningCount);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setCurrentPage(1);
    loadAllData(1);
  }, [selectedRole, selectedDivision, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      loadAllData(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsFormModalOpen(true);
  };

  const openDetailModal = (emp: Employee) => {
    setViewingEmployee(emp);
    setIsDetailModalOpen(true);
  };

  const handleToggleStatus = async (emp: Employee) => {
    const newStatus: EmployeeStatus = emp.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'mengaktifkan kembali' : 'menonaktifkan';

    if (confirm(`Apakah Anda yakin ingin ${actionText} akun ${emp.full_name}?`)) {
      try {
        const res = await setEmployeeStatus(emp.id, newStatus);
        if (res.error) {
          alert(`Gagal: ${res.error}`);
        } else {
          loadAllData();
        }
      } catch {
        alert('Terjadi kesalahan sistem saat mengubah status karyawan.');
      }
    }
  };

  // Metrics count
  const totalEmployees = totalCount > 0 ? totalCount : employees.length;
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const pendingCount = employees.filter((e) => e.status === 'pending_claim').length;
  const inactiveCount = employees.filter((e) => e.status === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Direktori Karyawan
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">Database SDM Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Data Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola profil lengkap, penempatan divisi, atasan langsung, nomor rekening, dan jadwal kerja.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 self-start sm:self-auto shadow-lg shadow-blue-600/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Karyawan Baru</span>
        </Button>
      </div>

      {/* 2. Top Metrics Overview */}
      <EmployeeMetrics
        total={totalEmployees}
        active={activeCount}
        pendingClaim={pendingCount}
        inactive={inactiveCount}
      />

      {/* 3. PKWT Expiration Alert Banner */}
      <ContractAlertBox
        expiringContracts={expiringContracts}
        criticalCount={criticalCount}
        warningCount={warningCount}
      />

      {/* 4. Main Table Card */}
      <Card>
        <EmployeeFilterToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          selectedDivision={selectedDivision}
          onDivisionChange={setSelectedDivision}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          divisions={divisions}
        />

        {error && (
          <div className="my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Employee Table */}
        <EmployeeTable
          employees={employees}
          isLoading={isLoading}
          onOpenDetail={openDetailModal}
          onOpenEdit={openEditModal}
          onToggleStatus={handleToggleStatus}
        />

        {/* Pagination Controls */}
        {!isLoading && totalEmployees > 0 && (
          <div className="border-t border-slate-800/80 px-2 sm:px-4 mt-2">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalEmployees}
              pageSize={pageSize}
              onPageChange={(p) => {
                setCurrentPage(p);
                loadAllData(p);
              }}
              isLoading={isLoading}
            />
          </div>
        )}
      </Card>

      {/* Modal 1: Form Add / Edit */}
      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingEmployee={editingEmployee}
        divisions={divisions}
        schedules={schedules}
        allEmployees={employees}
        onSuccess={loadAllData}
      />

      {/* Modal 2: Detail Profile */}
      <EmployeeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        employee={viewingEmployee}
      />
    </div>
  );
}
