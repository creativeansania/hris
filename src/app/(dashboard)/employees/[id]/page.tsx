'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  User,
  Plus,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertCircle,
  Award,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Badge, RoleBadge, StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
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
} from '@/types/database';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [isPending, startTransition] = useTransition();

  // Data states
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [positions, setPositions] = useState<EmployeePosition[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState({
    presentDays: 0,
    lateMinutes: 0,
    excusedLateCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    'personal' | 'contracts' | 'positions' | 'attendance'
  >('personal');

  // Modal States
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractType, setContractType] = useState<ContractType>('pkwt');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractBaseSalary, setContractBaseSalary] = useState<string>('5000000');
  const [contractNotes, setContractNotes] = useState('');
  const [contractError, setContractError] = useState<string | null>(null);

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

  // Calculate tenure (masa kerja)
  const calculateTenure = () => {
    if (!employee?.join_date) return 'Baru Bergabung';
    const start = new Date(employee.join_date);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0 && months === 0) return '< 1 Bulan';
    if (years === 0) return `${months} Bulan`;
    return `${years} Thn ${months} Bln`;
  };

  // Find latest active contract
  const latestContract = contracts.length > 0 ? contracts[0] : null;

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
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <Link
            href="/employees"
            className="text-slate-400 hover:text-white transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Data Karyawan
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-semibold">{employee.full_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setContractType('pkwt');
              setContractStartDate(new Date().toISOString().split('T')[0]);
              setContractEndDate('');
              setContractBaseSalary(
                latestContract?.base_salary ? String(latestContract.base_salary) : '5000000'
              );
              setContractError(null);
              setIsContractModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah / Perpanjang Kontrak
          </button>
        </div>
      </div>

      {/* Executive Header Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 shadow-inner">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  {employee.full_name}
                </h1>
                <RoleBadge role={employee.role} />
                <StatusBadge status={employee.status} />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  {employee.division?.name || 'Belum Ditentukan Divisi'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {employee.email}
                </span>
                {employee.phone_number && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {employee.phone_number}
                  </span>
                )}
                {employee.join_date && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Bergabung: {employee.join_date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Supervisor pill */}
          {employee.spv && (
            <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl min-w-[200px] text-xs space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Atasan Langsung (SPV)
              </span>
              <span className="font-bold text-white block">{employee.spv.full_name}</span>
              <span className="text-[10px] text-slate-400">{employee.spv.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gaji Pokok Terakhir */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Gaji Pokok Aktif
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-white font-mono">
              Rp {(latestContract?.base_salary || 0).toLocaleString('id-ID')}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {latestContract
              ? `Kontrak ${latestContract.contract_type.toUpperCase()}`
              : 'Belum ada data kontrak'}
          </p>
        </div>

        {/* Status Kontrak & Reminder */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status Kontrak
            </span>
            <span
              className={`p-2 rounded-lg ${
                latestContract?.status_urgency === 'critical'
                  ? 'bg-rose-500/10 text-rose-400'
                  : latestContract?.status_urgency === 'warning'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold uppercase font-mono text-white">
              {latestContract?.contract_type || 'N/A'}
            </span>
            {latestContract?.contract_type === 'pkwt' &&
              typeof latestContract.days_remaining === 'number' && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    latestContract.status_urgency === 'critical'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : latestContract.status_urgency === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {latestContract.days_remaining < 0
                    ? 'Kedaluwarsa'
                    : `Sisa ${latestContract.days_remaining} Hari`}
                </span>
              )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {latestContract?.contract_type === 'pkwtt'
              ? 'Karyawan Tetap (PKWTT)'
              : latestContract?.end_date
              ? `Berakhir: ${latestContract.end_date}`
              : 'Belum terikat kontrak'}
          </p>
        </div>

        {/* Masa Kerja */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Masa Kerja
            </span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-white font-mono">
              {calculateTenure()}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Sejak {employee.join_date || 'awal bergabung'}
          </p>
        </div>

        {/* Sisa Cuti */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sisa Saldo Cuti {new Date().getFullYear()}
            </span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-400 font-mono">
              {leaveBalance?.remaining ?? 12}
            </span>
            <span className="text-xs text-slate-400">
              hari / {leaveBalance?.quota ?? 12} hak
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Terpakai: {leaveBalance?.used ?? 0} hari
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Presensi & Saldo Cuti
        </button>
      </div>

      {/* Tab 1: Data Pribadi & Identitas */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identitas KTP & Pajak */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Identitas KTP & Pajak
            </h3>

            <div className="space-y-3 text-xs divide-y divide-slate-800/60">
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">NIK (KTP):</span>
                <span className="font-mono text-white font-semibold">
                  {employee.nik || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">NPWP:</span>
                <span className="font-mono text-white font-semibold">
                  {employee.npwp || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Jenis Kelamin:</span>
                <span className="text-white capitalize">
                  {employee.gender ? employee.gender.replace('_', ' ') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Tempat & Tanggal Lahir:</span>
                <span className="text-white">
                  {employee.place_of_birth ? `${employee.place_of_birth}, ` : ''}
                  {employee.birth_date || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Agama:</span>
                <span className="text-white capitalize">{employee.religion || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Status Perkawinan & PTKP:</span>
                <span className="text-white capitalize font-mono">
                  {employee.marital_status ? employee.marital_status.replace('_', ' ') : '-'}{' '}
                  (Tanggungan: {employee.dependents_count || 0})
                </span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Alamat Domisili / KTP:</span>
                <p className="text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 leading-relaxed">
                  {employee.address || 'Alamat belum diinput'}
                </p>
              </div>
            </div>
          </div>

          {/* Kontak Darurat & Perbankan */}
          <div className="space-y-6">
            {/* Kontak Darurat */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <Phone className="w-4 h-4 text-emerald-400" />
                Kontak Darurat
              </h3>
              <div className="space-y-3 text-xs divide-y divide-slate-800/60">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">Nama Kontak Darurat:</span>
                  <span className="font-semibold text-white">
                    {employee.emergency_contact_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">Nomor Telepon Darurat:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {employee.emergency_contact_phone || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Informasi Bank Payroll */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Informasi Bank (Transfer Gaji)
              </h3>
              <div className="space-y-3 text-xs divide-y divide-slate-800/60">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">Nama Bank:</span>
                  <span className="font-bold text-white uppercase">
                    {employee.bank_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">Nomor Rekening:</span>
                  <span className="font-mono text-amber-400 font-extrabold text-sm">
                    {employee.bank_account_no || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">Atas Nama Rekening:</span>
                  <span className="text-white font-semibold">
                    {employee.bank_account_name || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Riwayat Kontrak Kerja (Histori Non-Overwrite) */}
      {activeTab === 'contracts' && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Riwayat Kontrak Kerja Karyawan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pencatatan riwayat kontrak PKWT dan PKWTT secara permanen (histori lengkap, bukan overwrite).
              </p>
            </div>
            <button
              onClick={() => {
                setContractType('pkwt');
                setContractStartDate(new Date().toISOString().split('T')[0]);
                setContractEndDate('');
                setContractBaseSalary(
                  latestContract?.base_salary ? String(latestContract.base_salary) : '5000000'
                );
                setContractError(null);
                setIsContractModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Kontrak Baru
            </button>
          </div>

          {contracts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-500" />
              <p className="text-xs">Belum ada data kontrak kerja yang tercatat.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Tipe Kontrak</th>
                    <th className="px-4 py-3">Periode Mulai</th>
                    <th className="px-4 py-3">Periode Berakhir</th>
                    <th className="px-4 py-3">Gaji Pokok</th>
                    <th className="px-4 py-3 text-center">Status / Urgensi</th>
                    <th className="px-4 py-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {contracts.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-900/40 transition font-sans">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold uppercase text-white font-mono">
                            {c.contract_type}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                              Aktif Terkini
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">{c.start_date}</td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {c.end_date || 'Permanen (PKWTT)'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        Rp {c.base_salary.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.contract_type === 'pkwtt' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Karyawan Tetap
                          </span>
                        ) : c.status_urgency === 'critical' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            H-7 Kritis ({c.days_remaining} Hari)
                          </span>
                        ) : c.status_urgency === 'warning' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            H-30 Peringatan ({c.days_remaining} Hari)
                          </span>
                        ) : c.status_urgency === 'expired' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400">
                            Kedaluwarsa
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400">
                            Aktif Aman
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 italic text-[11px]">
                        {c.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Riwayat Jabatan & Mutasi */}
      {activeTab === 'positions' && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                Riwayat Jabatan & Mutasi Divisi
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Histori perjalanan karier, mutasi antar divisi, dan promosi jabatan karyawan.
              </p>
            </div>
            <button
              onClick={() => {
                setMutationDivisionId(employee.division_id || '');
                setMutationTitle('');
                setMutationStartDate(new Date().toISOString().split('T')[0]);
                setMutationError(null);
                setIsPositionModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Catat Mutasi Jabatan
            </button>
          </div>

          {positions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-500" />
              <p className="text-xs">
                Belum ada data mutasi yang dicatat. Divisi saat ini:{' '}
                <strong>{employee.division?.name || 'N/A'}</strong>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Divisi</th>
                    <th className="px-4 py-3">Judul Jabatan</th>
                    <th className="px-4 py-3">Mulai Menjabat</th>
                    <th className="px-4 py-3">Selesai Menjabat</th>
                    <th className="px-4 py-3">Dicatat Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {positions.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-4 py-3 font-semibold text-white">
                        {p.division?.name || '-'}
                        {idx === 0 && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Posisi Terkini
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-400">
                        {p.position_title || 'Staff'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">{p.start_date}</td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {p.end_date || 'Sekarang (Aktif)'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.created_by_user?.full_name || 'HR Admin'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Presensi & Saldo Cuti */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm md:col-span-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Clock className="w-4 h-4 text-blue-400" />
              Kehadiran Bulan Berjalan
            </h3>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Hari Masuk Kerja:</span>
                <span className="font-bold text-white text-base">
                  {attendanceSummary.presentDays} hari
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Total Terlambat:</span>
                <span className="font-bold text-rose-400 text-base">
                  {attendanceSummary.lateMinutes} menit
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Izin Telat (Excused):</span>
                <span className="font-bold text-emerald-400 text-base">
                  {attendanceSummary.excusedLateCount} hari
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Calendar className="w-4 h-4 text-purple-400" />
              Rincian Saldo Cuti {new Date().getFullYear()}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Hak Kuota</span>
                <span className="text-xl font-bold font-mono text-white">
                  {leaveBalance?.quota ?? 12}
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Carry Over</span>
                <span className="text-xl font-bold font-mono text-slate-300">
                  {leaveBalance?.carry_over ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Terpakai</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {leaveBalance?.used ?? 0}
                </span>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <span className="text-[10px] text-blue-300 block uppercase font-bold">
                  Sisa Saldo
                </span>
                <span className="text-xl font-extrabold font-mono text-blue-400">
                  {leaveBalance?.remaining ?? 12}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Kontrak Baru */}
      <Modal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        title="Catat Kontrak Kerja Baru"
        description={`Karyawan: ${employee.full_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleAddContract} className="space-y-4 text-xs">
          {contractError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{contractError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Jenis Perjanjian Kerja <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContractType('pkwt')}
                className={`p-3 rounded-xl border font-semibold text-center transition cursor-pointer ${
                  contractType === 'pkwt'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                PKWT (Waktu Tertentu)
              </button>
              <button
                type="button"
                onClick={() => setContractType('pkwtt')}
                className={`p-3 rounded-xl border font-semibold text-center transition cursor-pointer ${
                  contractType === 'pkwtt'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                PKWTT (Tetap)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Tanggal Mulai <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            {contractType === 'pkwt' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tanggal Berakhir <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={contractEndDate}
                  min={contractStartDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Gaji Pokok (Base Salary) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={contractBaseSalary}
              onChange={(e) => setContractBaseSalary(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Format: Rp {Number(contractBaseSalary || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Catatan Kontrak (Opsional)
            </label>
            <textarea
              rows={2}
              value={contractNotes}
              onChange={(e) => setContractNotes(e.target.value)}
              placeholder="Contoh: Perpanjangan PKWT II masa 1 tahun, penyesuaian gaji pokok evaluasi tahunan..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsContractModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Kontrak'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Catat Mutasi Jabatan */}
      <Modal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        title="Catat Mutasi / Promosi Jabatan"
        description={`Karyawan: ${employee.full_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleAddPositionMutation} className="space-y-4 text-xs">
          {mutationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mutationError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Divisi Tujuan <span className="text-rose-400">*</span>
            </label>
            <select
              value={mutationDivisionId}
              onChange={(e) => setMutationDivisionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">-- Pilih Divisi --</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Judul Jabatan / Posisi Baru <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={mutationTitle}
              onChange={(e) => setMutationTitle(e.target.value)}
              placeholder="Contoh: Senior Frontend Engineer, SPV Gudang"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Tanggal Efektif Mutasi <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={mutationStartDate}
              onChange={(e) => setMutationStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsPositionModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Mutasi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
