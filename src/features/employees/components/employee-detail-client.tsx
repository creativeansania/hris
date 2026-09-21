'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  User,
  FileText,
  Briefcase,
  Clock,
} from 'lucide-react';
import {
  getEmployeeFullProfile,
  addEmployeeContract,
  addEmployeePositionMutation,
} from '@/app/actions/contracts';
import { getDivisions } from '@/app/actions/divisions';
import {
  Employee,
  EmployeeContract,
  EmployeePosition,
  Division,
  ContractType,
  LeaveBalance,
} from '@/types/database';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EmployeeProfileHeader } from './employee-profile-header';
import { EmployeeStatsBanner } from './employee-stats-banner';
import { EmployeePersonalTab } from './employee-personal-tab';
import { EmployeeContractsTab } from './employee-contracts-tab';
import { EmployeePositionsTab } from './employee-positions-tab';
import { EmployeeAttendanceTab } from './employee-attendance-tab';
import { AddContractModal } from './add-contract-modal';
import { AddPositionModal } from './add-position-modal';
import { DeleteEmployeeModal } from './delete-employee-modal';

interface EmployeeDetailClientProps {
  employeeId: string;
}

export function EmployeeDetailClient({ employeeId }: EmployeeDetailClientProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [positions, setPositions] = useState<EmployeePosition[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState({
    presentDays: 0,
    lateMinutes: 0,
    excusedLateCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Tabs: personal, contracts, positions, attendance
  const [activeTab, setActiveTab] = useState<
    'personal' | 'contracts' | 'positions' | 'attendance'
  >('personal');

  // Modal States: Contract & Delete
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contractType, setContractType] = useState<ContractType>('pkwt');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractBaseSalary, setContractBaseSalary] = useState<string>('5000000');
  const [contractNotes, setContractNotes] = useState('');
  const [contractError, setContractError] = useState<string | null>(null);

  // Modal States: Position Mutation
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [mutationDivisionId, setMutationDivisionId] = useState('');
  const [mutationTitle, setMutationTitle] = useState('');
  const [mutationStartDate, setMutationStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Load Profile
  const loadProfile = useCallback(async () => {
    setLoading(true);
    const [profileRes, divRes] = await Promise.all([
      getEmployeeFullProfile(employeeId),
      getDivisions(),
    ]);

    if (profileRes.employee) {
      setEmployee(profileRes.employee);
      setContracts(profileRes.contracts);
      setPositions(profileRes.positions);
      setLeaveBalance(profileRes.leaveBalance);
      setAttendanceSummary(profileRes.attendanceSummary);
    }
    if (divRes.data) {
      setDivisions(divRes.data);
    }
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      loadProfile();
    }
  }, [employeeId, loadProfile]);

  const latestContract = contracts.length > 0 ? contracts[0] : null;

  const openAddContractModal = () => {
    setContractType('pkwt');
    setContractStartDate(new Date().toISOString().split('T')[0]);
    setContractEndDate('');
    setContractBaseSalary(
      latestContract?.base_salary ? String(latestContract.base_salary) : '5000000'
    );
    setContractError(null);
    setIsContractModalOpen(true);
  };

  const openAddPositionModal = () => {
    setMutationDivisionId(employee?.division_id || '');
    setMutationTitle('');
    setMutationStartDate(new Date().toISOString().split('T')[0]);
    setMutationError(null);
    setIsPositionModalOpen(true);
  };

  // Handle Add Contract
  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setContractError(null);

    const salary = Number(contractBaseSalary);
    if (!salary || salary <= 0) {
      setContractError('Gaji pokok harus bernilai angka positif.');
      return;
    }

    if (contractType === 'pkwt' && !contractEndDate) {
      setContractError('Kontrak PKWT wajib mencantumkan tanggal berakhir.');
      return;
    }

    startTransition(async () => {
      const res = await addEmployeeContract({
        employeeId,
        contractType,
        startDate: contractStartDate,
        endDate: contractType === 'pkwtt' ? null : contractEndDate,
        baseSalary: salary,
        notes: contractNotes.trim(),
      });

      if (!res.success) {
        setContractError(res.error || 'Gagal menyimpan kontrak.');
      } else {
        setIsContractModalOpen(false);
        setContractNotes('');
        loadProfile();
      }
    });
  };

  // Handle Add Position Mutation
  const handleAddPositionMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    setMutationError(null);

    if (!mutationDivisionId || !mutationTitle.trim() || !mutationStartDate) {
      setMutationError('Semua field wajib diisi.');
      return;
    }

    startTransition(async () => {
      const res = await addEmployeePositionMutation({
        employeeId,
        divisionId: mutationDivisionId,
        positionTitle: mutationTitle.trim(),
        startDate: mutationStartDate,
      });

      if (!res.success) {
        setMutationError(res.error || 'Gagal menyimpan mutasi.');
      } else {
        setIsPositionModalOpen(false);
        setMutationTitle('');
        loadProfile();
      }
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Memuat profil lengkap karyawan...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Karyawan Tidak Ditemukan</h3>
        <p className="text-xs text-slate-400 mt-1">
          Data karyawan dengan ID tersebut tidak tersedia di sistem.
        </p>
        <Link
          href="/employees"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar Karyawan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Profile & Breadcrumb */}
      <EmployeeProfileHeader
        employee={employee}
        onOpenAddContract={openAddContractModal}
        onOpenDelete={() => setIsDeleteModalOpen(true)}
      />

      {/* Quick Metrics Cards */}
      <EmployeeStatsBanner
        latestContract={latestContract}
        joinDate={employee.join_date}
        leaveBalance={leaveBalance}
      />

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'personal'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          Data Pribadi & Identitas
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'contracts'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Riwayat Kontrak ({contracts.length})
        </button>

        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'positions'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Riwayat Jabatan & Mutasi ({positions.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Presensi & Saldo Cuti
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'personal' && <EmployeePersonalTab employee={employee} />}

      {activeTab === 'contracts' && (
        <EmployeeContractsTab
          contracts={contracts}
          onOpenAddContract={openAddContractModal}
        />
      )}

      {activeTab === 'positions' && (
        <EmployeePositionsTab
          positions={positions}
          currentDivisionName={employee.division?.name}
          onOpenAddPosition={openAddPositionModal}
        />
      )}

      {activeTab === 'attendance' && (
        <EmployeeAttendanceTab
          attendanceSummary={attendanceSummary}
          leaveBalance={leaveBalance}
        />
      )}

      {/* Modals */}
      <AddContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        employeeName={employee.full_name}
        contractType={contractType}
        setContractType={setContractType}
        contractStartDate={contractStartDate}
        setContractStartDate={setContractStartDate}
        contractEndDate={contractEndDate}
        setContractEndDate={setContractEndDate}
        contractBaseSalary={contractBaseSalary}
        setContractBaseSalary={setContractBaseSalary}
        contractNotes={contractNotes}
        setContractNotes={setContractNotes}
        contractError={contractError}
        isPending={isPending}
        onSubmit={handleAddContract}
      />

      <AddPositionModal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        employeeName={employee.full_name}
        divisions={divisions}
        mutationDivisionId={mutationDivisionId}
        setMutationDivisionId={setMutationDivisionId}
        mutationTitle={mutationTitle}
        setMutationTitle={setMutationTitle}
        mutationStartDate={mutationStartDate}
        setMutationStartDate={setMutationStartDate}
        mutationError={mutationError}
        isPending={isPending}
        onSubmit={handleAddPositionMutation}
      />

      {/* Delete / Reset Claim Modal */}
      <DeleteEmployeeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => {
          router.push('/employees');
          router.refresh();
        }}
        employee={employee}
        currentEmployeeId={currentUser?.employeeId}
      />
    </div>
  );
}
