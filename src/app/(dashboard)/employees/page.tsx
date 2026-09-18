'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge, RoleBadge, StatusBadge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  CheckCircle2,
  Clock,
  UserX,
  AlertCircle,
  Building2,
  CreditCard,
  Phone,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  EmployeeFormData,
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
  GenderType,
  MaritalStatusType,
} from '@/types/database';
import { ROLE_LABELS } from '@/lib/constants';

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

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'org' | 'emergency' | 'bank'>('personal');

  // Form State
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: '',
    email: '',
    phone_number: '',
    nik: '',
    npwp: '',
    gender: 'laki_laki',
    place_of_birth: '',
    birth_date: '',
    religion: 'Islam',
    marital_status: 'belum_kawin',
    dependents_count: 0,
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_name: 'BCA',
    bank_account_no: '',
    bank_account_name: '',
    role: 'staff',
    division_id: '',
    spv_id: '',
    work_schedule_id: '',
    fingerprint_ac_no: '',
    join_date: new Date().toISOString().split('T')[0],
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [expiringContracts, setExpiringContracts] = useState<any[]>([]);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [warningCount, setWarningCount] = useState<number>(0);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);

    const [empRes, divRes, schedRes, expRes] = await Promise.all([
      getEmployees({
        search: searchTerm,
        role: selectedRole,
        divisionId: selectedDivision,
        status: selectedStatus,
      }),
      getDivisions(),
      getScheduleGroups(),
      getExpiringContracts(30),
    ]);

    if (empRes.error) {
      setError(empRes.error);
    } else {
      setEmployees(empRes.data);
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
    loadAllData();
  }, [selectedRole, selectedDivision, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadAllData();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setActiveFormTab('personal');
    setFormData({
      full_name: '',
      email: '',
      phone_number: '',
      nik: '',
      npwp: '',
      gender: 'laki_laki',
      place_of_birth: '',
      birth_date: '',
      religion: 'Islam',
      marital_status: 'belum_kawin',
      dependents_count: 0,
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      bank_name: 'BCA',
      bank_account_no: '',
      bank_account_name: '',
      role: 'staff',
      division_id: divisions[0]?.id || '',
      spv_id: '',
      work_schedule_id: schedules.find((s) => s.is_default)?.id || schedules[0]?.id || '',
      fingerprint_ac_no: '',
      join_date: new Date().toISOString().split('T')[0],
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setActiveFormTab('personal');
    setFormData({
      full_name: emp.full_name,
      email: emp.email,
      phone_number: emp.phone_number || '',
      nik: emp.nik || '',
      npwp: emp.npwp || '',
      gender: emp.gender || 'laki_laki',
      place_of_birth: emp.place_of_birth || '',
      birth_date: emp.birth_date || '',
      religion: emp.religion || 'Islam',
      marital_status: emp.marital_status || 'belum_kawin',
      dependents_count: emp.dependents_count || 0,
      address: emp.address || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      bank_name: emp.bank_name || 'BCA',
      bank_account_no: emp.bank_account_no || '',
      bank_account_name: emp.bank_account_name || emp.full_name,
      role: emp.role,
      division_id: emp.division_id || '',
      spv_id: emp.spv_id || '',
      work_schedule_id: emp.work_schedule_id || '',
      fingerprint_ac_no: emp.fingerprint_ac_no || '',
      join_date: emp.join_date || '',
      status: emp.status,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openDetailModal = (emp: Employee) => {
    setViewingEmployee(emp);
    setIsDetailModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim()) {
      setFormError('Nama lengkap dan email Google wajib diisi');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    if (editingEmployee) {
      const res = await updateEmployee(editingEmployee.id, formData);
      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsFormModalOpen(false);
        loadAllData();
      }
    } else {
      const res = await createEmployee(formData);
      if (!res.success) {
        setFormError(res.error);
      } else {
        setIsFormModalOpen(false);
        loadAllData();
      }
    }
    setFormSubmitting(false);
  };

  const handleToggleStatus = async (emp: Employee) => {
    const newStatus: EmployeeStatus = emp.status === 'active' ? 'inactive' : 'active';
    const confirmMsg =
      newStatus === 'inactive'
        ? `Nonaktifkan karyawan ${emp.full_name}? Karyawan tidak akan dapat login.`
        : `Aktifkan kembali akun karyawan ${emp.full_name}?`;

    if (!confirm(confirmMsg)) return;

    const res = await setEmployeeStatus(emp.id, newStatus);
    if (!res.success) {
      alert(res.error);
    } else {
      loadAllData();
    }
  };

  // Metrics count
  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const pendingCount = employees.filter((e) => e.status === 'pending_claim').length;
  const inactiveCount = employees.filter((e) => e.status === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              MANAJEMEN SDM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Inventaris & Akun Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola data pokok kepegawaian, pemetaan divisi, atasan langsung, nomor rekening payroll, dan status klaim akun SSO.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 shrink-0">
          <UserPlus className="w-4 h-4" />
          <span>Tambah Karyawan</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Karyawan</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {totalEmployees}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Seluruh database</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Karyawan Aktif</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 tabular-nums">
            {activeCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Bisa absen & login SSO</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Menunggu Klaim</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 tabular-nums">
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Belum login Google</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Non-Aktif</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 tabular-nums">
            {inactiveCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Resign / suspend</p>
        </Card>
      </div>

      {/* PKWT Expiration Alert Banner (H-30 & H-7 Reminder) */}
      {expiringContracts.length > 0 && (
        <div
          className={`p-4 rounded-2xl border transition shadow-sm ${
            criticalCount > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  criticalCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Peringatan Masa Berakhir Kontrak PKWT</span>
                  {criticalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-300 font-extrabold">
                      {criticalCount} Kritis (H-7)
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/30 text-amber-300 font-extrabold">
                      {warningCount} Mendekati (H-30)
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Terdapat {expiringContracts.length} karyawan dengan kontrak PKWT yang akan berakhir dalam 30 hari ke depan. Mohon lakukan evaluasi untuk perpanjangan atau penyelesaian kontrak.
                </p>
              </div>
            </div>
          </div>

          {/* Quick chips of expiring employees */}
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-slate-400">Daftar Karyawan:</span>
            {expiringContracts.slice(0, 5).map(({ contract, employee }) => (
              <Link
                key={contract.id}
                href={`/employees/${employee.id}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition hover:opacity-90 ${
                  contract.status_urgency === 'critical'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                <span>{employee.full_name}</span>
                <span className="font-mono font-bold">
                  ({contract.days_remaining < 0 ? 'Habis' : `H-${contract.days_remaining}`})
                </span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            ))}
            {expiringContracts.length > 5 && (
              <span className="text-xs text-slate-400 font-mono">
                +{expiringContracts.length - 5} lainnya
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card>
        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, email Google, atau NIK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as EmployeeRole | 'all')}
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
              onChange={(e) => setSelectedDivision(e.target.value)}
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
              onChange={(e) => setSelectedStatus(e.target.value as EmployeeStatus | 'all')}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="pending_claim">Menunggu Klaim</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="my-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table List */}
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            Memuat data karyawan...
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl my-4">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-medium">Tidak ada data karyawan yang cocok</p>
            <p className="text-slate-500 mt-0.5">
              Coba sesuaikan kata kunci pencarian atau filter di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Karyawan</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Divisi</th>
                  <th className="py-3 px-4 font-semibold">Atasan (SPV)</th>
                  <th className="py-3 px-4 font-semibold">Status Akun</th>
                  <th className="py-3 px-4 font-semibold">Tanggal Masuk</th>
                  <th className="py-3 px-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-xs shrink-0 ring-1 ring-white/10">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100 block">
                            {emp.full_name}
                          </span>
                          <span className="text-slate-400 text-[11px] block">
                            {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <RoleBadge role={emp.role} />
                    </td>
                    <td className="py-3.5 px-4">
                      {emp.division?.name ? (
                        <span className="text-slate-300 font-medium">
                          {emp.division.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {emp.spv?.full_name || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {emp.join_date || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                          title="Buka Profil Lengkap & Riwayat Kontrak"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openDetailModal(emp)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                          title="Lihat Ringkasan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-md transition"
                          title="Edit Data"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`p-1.5 rounded-md transition ${
                            emp.status === 'active'
                              ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={emp.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        >
                          {emp.status === 'active' ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Add / Edit Employee */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
        description="Masukkan identitas lengkap, penempatan organisasi, kontak darurat, dan informasi bank"
        maxWidth="4xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {formError}
            </div>
          )}

          {/* Form Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'personal', label: '1. Identitas Pribadi' },
              { id: 'org', label: '2. Organisasi & Role' },
              { id: 'emergency', label: '3. Kontak Darurat' },
              { id: 'bank', label: '4. Rekening Bank' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id as typeof activeFormTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeFormTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Personal Info */}
          {activeFormTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Lengkap (Sesuai KTP)"
                  placeholder="Contoh: Budi Santoso"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  autoFocus
                />
                <Input
                  label="Email Google Workspace (SSO)"
                  type="email"
                  placeholder="budi@perusahaan.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  helperText="Digunakan untuk otentikasi login Google"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Nomor Telepon / WhatsApp"
                  placeholder="08123456789"
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
                <Input
                  label="NIK KTP (16 Digit)"
                  placeholder="3171xxxxxxxxxxxx"
                  value={formData.nik || ''}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                />
                <Input
                  label="NPWP"
                  placeholder="xx.xxx.xxx.x-xxx.xxx"
                  value={formData.npwp || ''}
                  onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Select
                  label="Jenis Kelamin"
                  value={formData.gender || 'laki_laki'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as GenderType })}
                >
                  <option value="laki_laki">Laki-Laki</option>
                  <option value="perempuan">Perempuan</option>
                </Select>

                <Input
                  label="Tempat Lahir"
                  placeholder="Jakarta"
                  value={formData.place_of_birth || ''}
                  onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                />

                <Input
                  label="Tanggal Lahir"
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />

                <Select
                  label="Agama"
                  value={formData.religion || 'Islam'}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen Protestan">Kristen Protestan</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Status Pernikahan (Dasar PTKP)"
                  value={formData.marital_status || 'belum_kawin'}
                  onChange={(e) =>
                    setFormData({ ...formData, marital_status: e.target.value as MaritalStatusType })
                  }
                >
                  <option value="belum_kawin">Belum Kawin</option>
                  <option value="kawin">Kawin</option>
                  <option value="cerai_hidup">Cerai Hidup</option>
                  <option value="cerai_mati">Cerai Mati</option>
                </Select>

                <Input
                  label="Jumlah Tanggungan Anak"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.dependents_count}
                  onChange={(e) =>
                    setFormData({ ...formData, dependents_count: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>

              <Input
                label="Alamat Lengkap KTP / Domisili"
                placeholder="Jl. Melati No. 12, RT 01 / RW 02..."
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          )}

          {/* Tab 2: Organization Mapping */}
          {activeFormTab === 'org' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Role Akun & Hak Akses"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                  required
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Divisi Organisasi"
                  value={formData.division_id || ''}
                  onChange={(e) => setFormData({ ...formData, division_id: e.target.value || null })}
                >
                  <option value="">-- Pilih Divisi --</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Atasan Langsung (SPV / Approver)"
                  value={formData.spv_id || ''}
                  onChange={(e) => setFormData({ ...formData, spv_id: e.target.value || null })}
                  helperText="Digunakan pada jenjang persetujuan (approval flow) cuti & izin"
                >
                  <option value="">-- Tidak ada atasan (Direksi/Pucuk) --</option>
                  {employees
                    .filter((e) => e.id !== editingEmployee?.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({ROLE_LABELS[emp.role] || emp.role})
                      </option>
                    ))}
                </Select>

                <Select
                  label="Kelompok Jadwal Kerja"
                  value={formData.work_schedule_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, work_schedule_id: e.target.value || null })
                  }
                  helperText="Menentukan jam kerja, jam istirahat, dan toleransi keterlambatan"
                >
                  <option value="">-- Pilih Jadwal Kerja --</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="ID Fingerprint / AC No Mesin"
                  placeholder="Contoh: 1024"
                  value={formData.fingerprint_ac_no || ''}
                  onChange={(e) => setFormData({ ...formData, fingerprint_ac_no: e.target.value })}
                  helperText="ID karyawan di mesin fingerprint untuk pencocokan file Excel import absensi"
                />

                <Input
                  label="Tanggal Mulai Bekerja (Join Date)"
                  type="date"
                  value={formData.join_date || ''}
                  onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {/* Tab 3: Emergency Contact */}
          {activeFormTab === 'emergency' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                Kontak darurat digunakan jika terjadi situasi darurat pada karyawan saat bertugas.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Kontak Darurat"
                  placeholder="Nama Orang Tua / Pasangan / Kerabat"
                  value={formData.emergency_contact_name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, emergency_contact_name: e.target.value })
                  }
                />
                <Input
                  label="Nomor Telepon Kontak Darurat"
                  placeholder="081298765432"
                  value={formData.emergency_contact_phone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, emergency_contact_phone: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Tab 4: Bank Information */}
          {activeFormTab === 'bank' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                Informasi rekening digunakan oleh modul Payroll untuk proses penggajian dan transfer tunjangan.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Nama Bank"
                  value={formData.bank_name || 'BCA'}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                >
                  <option value="BCA">Bank BCA</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank BRI</option>
                  <option value="BNI">Bank BNI</option>
                  <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                  <option value="CIMB">Bank CIMB Niaga</option>
                  <option value="Permata">Bank Permata</option>
                  <option value="Lainnya">Lainnya</option>
                </Select>

                <Input
                  label="Nomor Rekening Bank"
                  placeholder="Contoh: 1234567890"
                  value={formData.bank_account_no || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                />

                <Input
                  label="Nama Pemilik Rekening"
                  placeholder="Sesuai buku tabungan"
                  value={formData.bank_account_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>Status akun baru:</span>
              <span className="font-mono text-amber-400 font-medium">pending_claim</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" isLoading={formSubmitting}>
                {editingEmployee ? 'Simpan Perubahan' : 'Simpan Karyawan'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Profile */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Profil Karyawan"
        description="Informasi lengkap personal, kepegawaian, dan rekening transfer"
        maxWidth="2xl"
      >
        {viewingEmployee && (
          <div className="space-y-5 text-xs text-slate-300">
            {/* Header info */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                {viewingEmployee.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">
                    {viewingEmployee.full_name}
                  </h4>
                  <RoleBadge role={viewingEmployee.role} />
                  <StatusBadge status={viewingEmployee.status} />
                </div>
                <p className="text-slate-400 text-xs mt-0.5">{viewingEmployee.email}</p>
              </div>
            </div>

            {/* Grid sections */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  STRUKTUR ORGANISASI
                </span>
                <div>
                  <span className="text-slate-500 block">Divisi:</span>
                  <span className="font-medium text-slate-200">
                    {viewingEmployee.division?.name || 'Belum diplot'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Atasan Langsung (SPV):</span>
                  <span className="font-medium text-slate-200">
                    {viewingEmployee.spv?.full_name || 'Tidak ada (Direksi)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jadwal Kerja:</span>
                  <span className="font-medium text-slate-200">
                    {viewingEmployee.work_schedule?.name || 'Jadwal Standar'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">ID Fingerprint AC:</span>
                  <span className="font-mono text-slate-200">
                    {viewingEmployee.fingerprint_ac_no || '-'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  REKENING PAYROLL
                </span>
                <div>
                  <span className="text-slate-500 block">Bank:</span>
                  <span className="font-medium text-slate-200">
                    {viewingEmployee.bank_name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nomor Rekening:</span>
                  <span className="font-mono text-slate-200">
                    {viewingEmployee.bank_account_no || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Atas Nama:</span>
                  <span className="font-medium text-slate-200">
                    {viewingEmployee.bank_account_name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tanggal Bergabung:</span>
                  <span className="font-mono text-slate-200">
                    {viewingEmployee.join_date || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency and personal details */}
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                KONTAK DARURAT & BIODATA
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Kontak Darurat:</span>
                  <span className="text-slate-200">
                    {viewingEmployee.emergency_contact_name || '-'} (
                    {viewingEmployee.emergency_contact_phone || '-'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">NIK KTP:</span>
                  <span className="font-mono text-slate-200">
                    {viewingEmployee.nik || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tempat & Tanggal Lahir:</span>
                  <span className="text-slate-200">
                    {viewingEmployee.place_of_birth || '-'}, {viewingEmployee.birth_date || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status Pernikahan / Anak:</span>
                  <span className="text-slate-200 capitalize">
                    {viewingEmployee.marital_status?.replace('_', ' ') || '-'} (
                    {viewingEmployee.dependents_count || 0} Tanggungan)
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-800/80">
              <Link
                href={`/employees/${viewingEmployee.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Buka Profil Lengkap & Histori Kontrak</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
