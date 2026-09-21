'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/ui/pagination';
import { UserPlus } from 'lucide-react';
import {
  EmployeeMetrics,
  ContractAlertBox,
  EmployeeFilterToolbar,
  EmployeeTable,
  EmployeeFormModal,
  EmployeeDetailModal,
  DeleteEmployeeModal,
} from '@/features/employees';
import { useCurrentUser } from '@/hooks/use-current-user';
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
  ExpiringContractItem,
} from '@/types/database';

interface EmployeesClientProps {
  initialEmployees?: Employee[];
  initialTotalCount?: number;
  initialTotalPages?: number;
  initialDivisions?: Division[];
  initialSchedules?: WorkScheduleGroup[];
  initialExpiringContracts?: ExpiringContractItem[];
  initialCriticalCount?: number;
  initialWarningCount?: number;
  initialError?: string | null;
}

export function EmployeesClient({
  initialEmployees = [],
  initialTotalCount = 0,
  initialTotalPages = 1,
  initialDivisions = [],
  initialSchedules = [],
  initialExpiringContracts = [],
  initialCriticalCount = 0,
  initialWarningCount = 0,
  initialError = null,
}: EmployeesClientProps = {}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions);
  const [schedules, setSchedules] = useState<WorkScheduleGroup[]>(initialSchedules);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  const [selectedDivision, setSelectedDivision] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus | 'all'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);

  const currentUser = useCurrentUser();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  // Contract warnings
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContractItem[]>(initialExpiringContracts);
  const [criticalCount, setCriticalCount] = useState<number>(initialCriticalCount);
  const [warningCount, setWarningCount] = useState<number>(initialWarningCount);

  const [isMounted, setIsMounted] = useState(false);

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

  const loadEmployeesData = async (page: number = currentPage) => {
    setIsLoading(true);
    setError(null);

    const empRes = await getEmployees({
      search: searchTerm,
      role: selectedRole,
      divisionId: selectedDivision,
      status: selectedStatus,
      page,
      pageSize,
    });

    if (empRes.error) {
      setError(empRes.error);
    } else {
      setEmployees(empRes.data);
      setTotalCount(empRes.total);
      setTotalPages(empRes.totalPages);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (initialEmployees.length === 0) {
      loadAllData(1);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
      return;
    }
    setCurrentPage(1);
    loadEmployeesData(1);
  }, [selectedRole, selectedDivision, selectedStatus]);

  // Debounced search
  useEffect(() => {
    if (!isMounted) return;
    const handler = setTimeout(() => {
      setCurrentPage(1);
      loadEmployeesData(1);
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

  const openDeleteModal = (emp: Employee) => {
    setDeletingEmployee(emp);
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = async (emp: Employee) => {
    const newStatus: EmployeeStatus = emp.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'mengaktifkan kembali' : 'menonaktifkan';

    if (confirm(`Apakah Anda yakin ingin ${actionText} akun ${emp.full_name}?`)) {
      try {
        const res = await setEmployeeStatus(emp.id, newStatus);
        if (res.error) {
          setError(`Gagal mengubah status karyawan: ${res.error}`);
        } else {
          setError(null);
          loadEmployeesData();
        }
      } catch {
        setError('Terjadi kesalahan sistem saat mengubah status karyawan.');
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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Data Karyawan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola data induk SDM, struktur jabatan, perpanjangan kontrak, serta integrasi SSO &amp; biometric fingerprint.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Karyawan Baru</span>
          </Button>
        </div>
      </div>

      {/* 2. Metrics & Warning Banners */}
      <EmployeeMetrics
        total={totalEmployees}
        active={activeCount}
        pendingClaim={pendingCount}
        inactive={inactiveCount}
      />

      <ContractAlertBox
        expiringContracts={expiringContracts}
        criticalCount={criticalCount}
        warningCount={warningCount}
      />

      {/* 3. Filters Toolbar */}
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

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* 4. Table */}
      <EmployeeTable
        employees={employees}
        isLoading={isLoading}
        onOpenDetail={openDetailModal}
        onOpenEdit={openEditModal}
        onToggleStatus={handleToggleStatus}
        onOpenDelete={openDeleteModal}
      />

      {/* 5. Pagination Controls */}
      {!isLoading && employees.length > 0 && totalPages > 1 && (
        <div className="pt-2">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={(page) => {
              setCurrentPage(page);
              loadEmployeesData(page);
            }}
          />
        </div>
      )}

      {/* 6. Form Modal (Create / Edit) */}
      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => loadEmployeesData()}
        editingEmployee={editingEmployee}
        divisions={divisions}
        schedules={schedules}
        allEmployees={employees}
      />

      {/* 7. Detail Modal */}
      <EmployeeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        employee={viewingEmployee}
        onOpenDelete={openDeleteModal}
      />

      {/* 8. Delete / Reset Claim Modal */}
      <DeleteEmployeeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => loadEmployeesData()}
        employee={deletingEmployee}
        currentEmployeeId={currentUser?.employeeId}
      />
    </div>
  );
}
