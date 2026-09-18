'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  getPayrollPeriods,
  getPayrollRules,
  createPayrollPeriod,
  generatePayrollRun,
  finalizePayrollPeriod,
  getPayrollRunDetail,
  getEmployeePayslips,
  updatePayrollRule,
} from '@/app/actions/payroll';
import {
  PayrollPeriod,
  PayrollRun,
  PayrollRule,
  PayrollPeriodStatus,
  EmployeeRole,
} from '@/types/database';
import {
  DollarSign,
  Calendar,
  Lock,
  Unlock,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Search,
  RefreshCw,
  Plus,
  Sliders,
  Users,
  Building,
  ShieldCheck,
  TrendingUp,
  Receipt,
  CreditCard,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function PayrollPage() {
  const [isPending, startTransition] = useTransition();

  // User State
  const [userRole, setUserRole] = useState<EmployeeRole>('admin');
  const [userEmail, setUserEmail] = useState<string>('');

  // Tab State
  // management/admin: 'periods' | 'review' | 'rules' | 'my-payslip'
  // staff: 'my-payslip'
  const [activeTab, setActiveTab] = useState<'periods' | 'review' | 'rules' | 'my-payslip'>('periods');

  // Periods & Runs State
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [currentPeriodDetail, setCurrentPeriodDetail] = useState<{
    period: PayrollPeriod | null;
    runs: PayrollRun[];
  }>({ period: null, runs: [] });
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [myPayslips, setMyPayslips] = useState<PayrollRun[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRun | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState<boolean>(false);
  const [newPeriodStart, setNewPeriodStart] = useState<string>('');
  const [newPeriodEnd, setNewPeriodEnd] = useState<string>('');
  const [newPeriodNotes, setNewPeriodNotes] = useState<string>('');

  const [editingRule, setEditingRule] = useState<PayrollRule | null>(null);
  const [editRuleValue, setEditRuleValue] = useState<string>('');

  const [inspectRun, setInspectRun] = useState<PayrollRun | null>(null);

  // Message alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize Auth & Data
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setUserEmail(user.email);
        const { data: emp } = await supabase
          .from('employees')
          .select('role')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (emp?.role) {
          setUserRole(emp.role);
          if (emp.role === 'staff') {
            setActiveTab('my-payslip');
          }
        }
      }
    };
    init();
  }, []);

  // Fetch all primary data
  const loadData = () => {
    setLoading(true);
    startTransition(async () => {
      const [pRes, rRes, slipsRes] = await Promise.all([
        getPayrollPeriods(),
        getPayrollRules(),
        getEmployeePayslips(userEmail),
      ]);

      if (!pRes.error && pRes.data) {
        setPeriods(pRes.data);
        if (pRes.data.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(pRes.data[0].id);
        }
      }
      if (!rRes.error && rRes.data) {
        setRules(rRes.data);
      }
      if (!slipsRes.error && slipsRes.payslips) {
        setMyPayslips(slipsRes.payslips);
        if (slipsRes.payslips.length > 0 && !selectedPayslip) {
          setSelectedPayslip(slipsRes.payslips[0]);
        }
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // Load Period Runs when selectedPeriodId changes
  useEffect(() => {
    if (selectedPeriodId) {
      startTransition(async () => {
        const detail = await getPayrollRunDetail(selectedPeriodId);
        if (!detail.error) {
          setCurrentPeriodDetail({
            period: detail.period,
            runs: detail.runs,
          });
        }
      });
    }
  }, [selectedPeriodId]);

  // Currency formatter
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handler: Create Period
  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodStart || !newPeriodEnd) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await createPayrollPeriod({
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        notes: newPeriodNotes,
        creatorEmail: userEmail,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: res.message || 'Periode penggajian baru berhasil dibuat.' });
        setIsCreatePeriodOpen(false);
        setNewPeriodStart('');
        setNewPeriodEnd('');
        setNewPeriodNotes('');
        loadData();
        if (res.periodId) setSelectedPeriodId(res.periodId);
      } else {
        setFeedback({ type: 'error', text: res.error || 'Gagal membuat periode.' });
      }
    });
  };

  // Handler: Generate Payroll Runs
  const handleGenerateRuns = (periodId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await generatePayrollRun(periodId, userEmail);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        loadData();
        setSelectedPeriodId(periodId);
      } else {
        setFeedback({ type: 'error', text: res.error || res.message });
      }
    });
  };

  // Handler: Finalize Period
  const handleFinalizePeriod = (periodId: string) => {
    if (!confirm('Apakah Anda yakin ingin memfinalisasi dan mengunci periode payroll ini? Setelah difinalisasi, data gaji tidak dapat diubah lagi dan slip gaji karyawan akan langsung aktif.')) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await finalizePayrollPeriod(periodId, userEmail);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        loadData();
        setSelectedPeriodId(periodId);
      } else {
        setFeedback({ type: 'error', text: res.error || res.message });
      }
    });
  };

  // Handler: Update Rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await updatePayrollRule(editingRule.rule_key, editRuleValue, userEmail);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message || 'Aturan berhasil diperbarui.' });
        setEditingRule(null);
        loadData();
      } else {
        setFeedback({ type: 'error', text: res.error || 'Gagal mengubah aturan.' });
      }
    });
  };

  // Filtered runs for review table
  const filteredRuns = currentPeriodDetail.runs.filter((run) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      run.employee?.full_name?.toLowerCase().includes(q) ||
      run.employee?.nik?.toLowerCase().includes(q) ||
      run.employee?.division?.name?.toLowerCase().includes(q)
    );
  });

  const isManagementOrAdmin = ['management', 'admin', 'hr'].includes(userRole);
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SPRINT 10 — MODUL PAYROLL ENTERPRISE
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">
              Regulasi BPJS, Formula Depnaker & Slip Gaji
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Penggajian (Payroll)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kalkulasi otomatis gaji pokok, lembur terverifikasi, iuran BPJS Kesehatan & Ketenagakerjaan, serta potongan presensi.
          </p>
        </div>

        {/* Global Action (Management / HR only) */}
        {isManagementOrAdmin && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={isPending}
              className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isPending ? 'animate-spin text-emerald-400' : ''}`} />
              Segarkan
            </Button>

            <Button
              size="sm"
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                setNewPeriodStart(firstDay);
                setNewPeriodEnd(lastDay);
                setIsCreatePeriodOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Buka Periode Baru
            </Button>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards */}
      {isManagementOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Periode Payroll</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-white">
                {periods.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {periods.filter((p) => p.status === 'finalized').length} periode telah dikunci (finalized)
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Periode Terpilih</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-base font-bold font-mono text-purple-300 truncate">
                {selectedPeriod ? `${selectedPeriod.period_start} s/d ${selectedPeriod.period_end}` : 'Belum Dipilih'}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    selectedPeriod?.status === 'finalized'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : selectedPeriod?.status === 'generated'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {selectedPeriod?.status || 'draft'}
                </span>
                <span className="text-[11px] text-slate-400">
                  ({currentPeriodDetail.runs.length} karyawan)
                </span>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Pengeluaran Gaji Bersih</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono text-emerald-400">
                {selectedPeriod ? formatIDR(selectedPeriod.total_net_pay || 0) : 'Rp 0'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Take Home Pay seluruh karyawan periode ini
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Aturan Payroll Aktif</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sliders className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-amber-400">
                {rules.length} Aturan
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                BPJS, formula lembur Depnaker & potongan
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Tab Bar Navigation */}
      <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
        {isManagementOrAdmin && (
          <>
            <button
              onClick={() => setActiveTab('periods')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'periods'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Periode & Generate Payroll</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'review'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Review Breakdown Karyawan</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Aturan & Formula Payroll</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('my-payslip')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'my-payslip'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Slip Gaji Saya</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERIODE & GENERATE PAYROLL                                         */}
      {/* ========================================================================= */}
      {activeTab === 'periods' && isManagementOrAdmin && (
        <Card>
          <CardHeader
            title="Daftar Periode Penggajian"
            subtitle="Siklus siklus: Buka Draft -> Hitung Gaji Otomatis (Generated) -> Kunci & Finalisasi (Finalized)"
          />

          {periods.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Belum ada periode penggajian yang dibuka. Klik &quot;Buka Periode Baru&quot; di atas untuk memulai.
            </div>
          ) : (
            <div className="space-y-4">
              {periods.map((p) => {
                const isSelected = p.id === selectedPeriodId;
                const isFinalized = p.status === 'finalized';
                const isGenerated = p.status === 'generated';

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Period Info & Stepper */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-100 font-mono">
                            {p.period_start} s/d {p.period_end}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              isFinalized
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isGenerated
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400">
                          {p.notes || 'Penggajian bulanan reguler'} &bull;{' '}
                          <span className="font-mono text-slate-300">
                            {p.runs_count || 0} karyawan terdaftar
                          </span>{' '}
                          &bull; Total: <span className="font-mono text-emerald-400 font-semibold">{formatIDR(p.total_net_pay || 0)}</span>
                        </p>

                        {/* Stepper indicator */}
                        <div className="flex items-center gap-2 mt-3 text-[11px] font-mono">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 1. Draft
                          </span>
                          <span className="text-slate-600">&rarr;</span>
                          <span
                            className={`flex items-center gap-1 ${
                              isGenerated || isFinalized ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> 2. Generated
                          </span>
                          <span className="text-slate-600">&rarr;</span>
                          <span
                            className={`flex items-center gap-1 ${
                              isFinalized ? 'text-emerald-400 font-bold' : 'text-slate-500'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" /> 3. Finalized (Locked)
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Select to review */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPeriodId(p.id);
                            setActiveTab('review');
                          }}
                          className="text-xs border-slate-700 text-slate-300 hover:text-white"
                        >
                          Lihat Rincian ({p.runs_count || 0})
                        </Button>

                        {/* Generate / Recalculate button */}
                        {!isFinalized && (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateRuns(p.id)}
                            disabled={isPending}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
                          >
                            <Play className="w-3.5 h-3.5 mr-1" />
                            {isGenerated ? 'Hitung Ulang' : 'Hitung Gaji (Generate)'}
                          </Button>
                        )}

                        {/* Finalize button (Management / Admin) */}
                        {isGenerated && !isFinalized && (
                          <Button
                            size="sm"
                            onClick={() => handleFinalizePeriod(p.id)}
                            disabled={isPending}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                          >
                            <Lock className="w-3.5 h-3.5 mr-1" />
                            Kunci & Finalisasi
                          </Button>
                        )}

                        {isFinalized && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Terkunci Permanen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REVIEW BREAKDOWN GAJI KARYAWAN                                     */}
      {/* ========================================================================= */}
      {activeTab === 'review' && isManagementOrAdmin && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Review Breakdown Gaji Karyawan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rincian penghasilan bruto, potongan BPJS, PPh21, dan gaji bersih (Take Home Pay)
              </p>
            </div>

            {/* Select Period Dropdown & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.period_start} s/d {p.period_end} ({p.status})
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama / NIK..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {filteredRuns.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              {currentPeriodDetail.runs.length === 0
                ? 'Periode ini belum di-generate. Silakan beralih ke tab Periode & Generate Payroll untuk menghitung gaji.'
                : 'Tidak ada karyawan yang sesuai dengan kriteria pencarian.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Karyawan</th>
                    <th className="px-4 py-3 text-right">Gaji Pokok</th>
                    <th className="px-4 py-3 text-right">Tunjangan</th>
                    <th className="px-4 py-3 text-right">Lembur</th>
                    <th className="px-4 py-3 text-right">BPJS (Kes+TK)</th>
                    <th className="px-4 py-3 text-right">Potongan Telat</th>
                    <th className="px-4 py-3 text-right">Gaji Bersih (Net)</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRuns.map((r) => {
                    const totalBpjs = r.bpjs_kesehatan_deduction + r.bpjs_ketenagakerjaan_deduction;

                    return (
                      <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-100">{r.employee?.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {r.employee?.nik || '-'} &bull; {r.employee?.division?.name || 'Tanpa Divisi'}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          {formatIDR(r.base_salary)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-slate-300">
                          {formatIDR(r.total_allowance)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-purple-300">
                          {formatIDR(r.overtime_pay)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-amber-400">
                          -{formatIDR(totalBpjs)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-rose-400">
                          {r.late_deduction > 0 ? `-${formatIDR(r.late_deduction)}` : '-'}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          {formatIDR(r.net_pay)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInspectRun(r)}
                            className="h-7 px-2.5 text-[11px] border-slate-800 text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Slip Gaji
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATURAN & FORMULA PAYROLL                                           */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && isManagementOrAdmin && (
        <Card>
          <CardHeader
            title="Konfigurasi Aturan & Formula Gaji"
            subtitle="Tarif potongan BPJS, regulasi lembur Depnaker, dan tarif sanksi keterlambatan"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                      {rule.rule_key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {rule.value_type}
                    </span>
                  </div>

                  <div className="text-xl font-bold font-mono text-white mb-2">
                    {rule.value_type === 'percentage'
                      ? `${rule.rule_value}%`
                      : rule.value_type === 'number' && Number(rule.rule_value) >= 1000
                      ? formatIDR(Number(rule.rule_value))
                      : rule.rule_value}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {rule.description || 'Tidak ada keterangan.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRule(rule);
                      setEditRuleValue(rule.rule_value);
                    }}
                    className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white"
                  >
                    Ubah Aturan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SLIP GAJI SAYA (UNIVERSAL STAFF & ALL ROLES)                       */}
      {/* ========================================================================= */}
      {activeTab === 'my-payslip' && (
        <div className="space-y-6">
          {/* Payslip Period Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-200">
                Pilih Periode Slip Gaji:
              </span>
              <p className="text-[11px] text-slate-400">
                Hanya periode yang telah difinalisasi dan disetujui Management yang ditampilkan
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedPayslip?.id || ''}
                onChange={(e) => {
                  const found = myPayslips.find((s) => s.id === e.target.value);
                  if (found) setSelectedPayslip(found);
                }}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {myPayslips.map((s) => (
                  <option key={s.id} value={s.id}>
                    Periode: {s.payroll_period?.period_start} s/d {s.payroll_period?.period_end}
                  </option>
                ))}
              </select>

              {selectedPayslip && (
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Slip Gaji
                </Button>
              )}
            </div>
          </div>

          {/* Printable Payslip Card */}
          {!selectedPayslip ? (
            <Card className="py-16 text-center text-xs text-slate-500">
              <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Belum ada slip gaji yang difinalisasi untuk akun Anda.
            </Card>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
              {/* Slip Header */}
              <div className="border-b border-slate-800 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-white print:text-black">
                      SLIP GAJI KARYAWAN
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
                      CONFIDENTIAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 print:text-gray-600">
                    Sistem Manajemen SDM & Payroll Terintegrasi
                  </p>
                </div>

                <div className="text-left sm:text-right font-mono text-xs text-slate-300 print:text-gray-700">
                  <div className="font-semibold text-slate-200 print:text-black">
                    Periode: {selectedPayslip.payroll_period?.period_start} s/d {selectedPayslip.payroll_period?.period_end}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Tanggal Terbit: {new Date(selectedPayslip.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Employee Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 mb-6 print:bg-gray-100 print:border-gray-300">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Nama Karyawan</div>
                  <div className="text-sm font-bold text-white print:text-black">
                    {selectedPayslip.employee?.full_name}
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5 print:text-gray-700">
                    NIK: {selectedPayslip.employee?.nik || '-'}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Divisi & Jabatan</div>
                  <div className="text-sm font-semibold text-slate-200 print:text-black">
                    {selectedPayslip.employee?.division?.name || 'Divisi Umum'}
                  </div>
                  <div className="text-xs text-slate-400 uppercase font-mono mt-0.5 print:text-gray-700">
                    Role: {selectedPayslip.employee?.role}
                  </div>
                </div>
              </div>

              {/* Breakdown Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Penerimaan (Earnings) */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>A. Penerimaan (Earnings)</span>
                    <span>Jumlah (IDR)</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>Gaji Pokok</span>
                    <span className="font-mono">{formatIDR(selectedPayslip.base_salary)}</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>Tunjangan Tetap / Transport</span>
                    <span className="font-mono">{formatIDR(selectedPayslip.total_allowance)}</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>Upah Lembur Resmi</span>
                    <span className="font-mono text-purple-400">{formatIDR(selectedPayslip.overtime_pay)}</span>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-white pt-2 border-t border-slate-800 print:text-black">
                    <span>Total Penghasilan Bruto</span>
                    <span className="font-mono">{formatIDR(selectedPayslip.gross_pay)}</span>
                  </div>
                </div>

                {/* Pemotongan (Deductions) */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>B. Pemotongan (Deductions)</span>
                    <span>Jumlah (IDR)</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>BPJS Kesehatan (1%)</span>
                    <span className="font-mono text-rose-400">-{formatIDR(selectedPayslip.bpjs_kesehatan_deduction)}</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>BPJS Ketenagakerjaan (JHT + JP)</span>
                    <span className="font-mono text-rose-400">-{formatIDR(selectedPayslip.bpjs_ketenagakerjaan_deduction)}</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>PPh21 (Pajak Penghasilan)</span>
                    <span className="font-mono text-rose-400">-{formatIDR(selectedPayslip.pph21_deduction)}</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>Potongan Keterlambatan</span>
                    <span className="font-mono text-rose-400">-{formatIDR(selectedPayslip.late_deduction)}</span>
                  </div>

                  <div className="flex justify-between text-xs py-1 text-slate-300 print:text-gray-800">
                    <span>Potongan Alpa / Tidak Hadir</span>
                    <span className="font-mono text-rose-400">-{formatIDR(selectedPayslip.absence_deduction)}</span>
                  </div>

                  {(() => {
                    const totalDeductions =
                      selectedPayslip.bpjs_kesehatan_deduction +
                      selectedPayslip.bpjs_ketenagakerjaan_deduction +
                      selectedPayslip.pph21_deduction +
                      selectedPayslip.late_deduction +
                      selectedPayslip.absence_deduction;

                    return (
                      <div className="flex justify-between text-xs font-bold text-white pt-2 border-t border-slate-800 print:text-black">
                        <span>Total Pemotongan</span>
                        <span className="font-mono text-rose-400">-{formatIDR(totalDeductions)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Net Take Home Pay Highlight Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:bg-gray-100 print:border-gray-400">
                <div>
                  <span className="text-xs uppercase font-mono font-bold text-emerald-400 print:text-black">
                    Gaji Bersih Diterima (Take Home Pay):
                  </span>
                  <p className="text-[11px] text-slate-400 print:text-gray-600">
                    Penghasilan bruto dikurangi seluruh potongan wajib
                  </p>
                </div>
                <div className="text-2xl font-extrabold font-mono text-emerald-400 print:text-black">
                  {formatIDR(selectedPayslip.net_pay)}
                </div>
              </div>

              {/* Bank Transfer Details */}
              <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400 font-mono print:text-gray-600">
                <div>
                  <span className="text-slate-300 font-semibold print:text-black">Rekening Pembayaran:</span>{' '}
                  {selectedPayslip.employee?.bank_name || 'BCA'} &bull;{' '}
                  {selectedPayslip.employee?.bank_account_no || '7829103948'} a.n.{' '}
                  {selectedPayslip.employee?.bank_account_name || selectedPayslip.employee?.full_name}
                </div>
                <div className="text-[10px] text-slate-500 print:text-gray-500">
                  Dokumen ini sah dicetak dari Sistem HRIS Internal.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BUKA PERIODE BARU                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
        title="Buka Periode Penggajian Baru"
        description="Buat draft siklus penggajian bulanan untuk dieksekusi oleh engine"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePeriod} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Tanggal Mulai Periode
              </label>
              <input
                type="date"
                required
                value={newPeriodStart}
                onChange={(e) => setNewPeriodStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Tanggal Selesai Periode
              </label>
              <input
                type="date"
                required
                value={newPeriodEnd}
                onChange={(e) => setNewPeriodEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1">
              Catatan Periode (Opsional)
            </label>
            <input
              type="text"
              placeholder="Misal: Penggajian Reguler September 2026"
              value={newPeriodNotes}
              onChange={(e) => setNewPeriodNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreatePeriodOpen(false)}
              className="border-slate-800 text-slate-300"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs"
            >
              Buka Periode (Draft)
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT ATURAN PAYROLL                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(editingRule)}
        onClose={() => setEditingRule(null)}
        title="Ubah Aturan Payroll"
        description={`Kunci: ${editingRule?.rule_key || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1">
              Nilai Baru ({editingRule?.value_type})
            </label>
            <input
              type="text"
              required
              value={editRuleValue}
              onChange={(e) => setEditRuleValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {editingRule?.description}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingRule(null)}
              className="border-slate-800 text-slate-300"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs"
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: INSPECT INDIVIDUAL PAYSLIP (MANAGEMENT REVIEW)                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(inspectRun)}
        onClose={() => setInspectRun(null)}
        title={`Slip Gaji — ${inspectRun?.employee?.full_name || ''}`}
        description={`NIK: ${inspectRun?.employee?.nik || '-'} • Divisi: ${inspectRun?.employee?.division?.name || 'Umum'}`}
        maxWidth="2xl"
      >
        {inspectRun && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-emerald-400 font-bold uppercase font-mono block mb-2">Penerimaan</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Gaji Pokok:</span>
                    <span className="font-mono">{formatIDR(inspectRun.base_salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tunjangan:</span>
                    <span className="font-mono">{formatIDR(inspectRun.total_allowance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lembur:</span>
                    <span className="font-mono text-purple-300">{formatIDR(inspectRun.overtime_pay)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                    <span>Bruto:</span>
                    <span className="font-mono">{formatIDR(inspectRun.gross_pay)}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-rose-400 font-bold uppercase font-mono block mb-2">Pemotongan</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>BPJS Kesehatan:</span>
                    <span className="font-mono text-rose-400">-{formatIDR(inspectRun.bpjs_kesehatan_deduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BPJS TK:</span>
                    <span className="font-mono text-rose-400">-{formatIDR(inspectRun.bpjs_ketenagakerjaan_deduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PPh21:</span>
                    <span className="font-mono text-rose-400">-{formatIDR(inspectRun.pph21_deduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potongan Telat:</span>
                    <span className="font-mono text-rose-400">-{formatIDR(inspectRun.late_deduction)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                    <span>Total Potongan:</span>
                    <span className="font-mono text-rose-400">
                      -{formatIDR(inspectRun.gross_pay - inspectRun.net_pay)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400">Gaji Bersih Diterima (Take Home Pay):</span>
              <span className="text-lg font-bold font-mono text-emerald-400">{formatIDR(inspectRun.net_pay)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectRun(null)}
                className="border-slate-800 text-slate-300 text-xs"
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
