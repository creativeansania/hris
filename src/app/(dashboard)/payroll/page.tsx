'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
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
  EmployeeRole,
} from '@/types/database';
import {
  DollarSign,
  Calendar,
  Receipt,
  Sliders,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  PayrollMetrics,
  PayrollPeriodsList,
  PayrollRunReview,
  PayrollRulesEditor,
  EmployeePayslipHistory,
  CreatePeriodModal,
  BankExportModal,
  PayslipModal,
  PayslipData,
} from '@/features/payroll';
import {
  generateBcaPayrollCsv,
  generateMandiriPayrollCsv,
  downloadCsvFile,
} from '@/lib/bank-export';

export default function PayrollPage() {
  const [isPending, startTransition] = useTransition();

  // User State
  const [userRole, setUserRole] = useState<EmployeeRole>('admin');
  const [userEmail, setUserEmail] = useState<string>('');

  // Tab State
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

  // Modals
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);
  const [isBankExportOpen, setIsBankExportOpen] = useState(false);
  const [payslipModalData, setPayslipModalData] = useState<PayslipData | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  // Message alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize Auth & Data
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setUserEmail(user.email);
        const { data: emp } = await supabase
          .from('employees')
          .select('role')
          .eq('email', user.email)
          .single();

        if (emp?.role) {
          setUserRole(emp.role);
          if (emp.role === 'staff') {
            setActiveTab('my-payslip');
          }
        }
      }
    };
    fetchUser();
    loadData();
  }, []);

  const loadData = () => {
    startTransition(async () => {
      const [pRes, rRes] = await Promise.all([
        getPayrollPeriods(),
        getPayrollRules(),
      ]);

      if (pRes.data && pRes.data.length > 0) {
        setPeriods(pRes.data);
        const activeId = selectedPeriodId || pRes.data[0].id;
        setSelectedPeriodId(activeId);
        loadPeriodDetail(activeId);
      }
      if (rRes.data) {
        setRules(rRes.data);
      }

      const mySlips = await getEmployeePayslips();
      if (mySlips.payslips) {
        setMyPayslips(mySlips.payslips);
      }
    });
  };

  const loadPeriodDetail = async (periodId: string) => {
    const detail = await getPayrollRunDetail(periodId);
    if (detail.runs) {
      setCurrentPeriodDetail({
        period: detail.period,
        runs: detail.runs,
      });
    }
  };

  const handleSelectPeriod = (periodId: string) => {
    setSelectedPeriodId(periodId);
    loadPeriodDetail(periodId);
    setActiveTab('review');
  };

  const handleCreatePeriod = async (start: string, end: string, notes?: string) => {
    startTransition(async () => {
      const res = await createPayrollPeriod({
        periodStart: start,
        periodEnd: end,
        notes,
      });
      if (res.error) {
        setFeedback({ type: 'error', text: res.error });
      } else {
        setFeedback({ type: 'success', text: 'Periode payroll baru berhasil dibuka.' });
        setIsCreatePeriodOpen(false);
        loadData();
      }
    });
  };

  const handleGenerateRun = (periodId: string) => {
    startTransition(async () => {
      const res = await generatePayrollRun(periodId);
      if (res.error) {
        setFeedback({ type: 'error', text: res.error });
      } else {
        setFeedback({
          type: 'success',
          text: `Perhitungan payroll selesai: ${res.generatedCount || 0} karyawan diproses.`,
        });
        loadData();
        loadPeriodDetail(periodId);
      }
    });
  };

  const handleFinalizePeriod = (periodId: string) => {
    if (!confirm('Apakah Anda yakin ingin memfinalisasi dan mengunci periode payroll ini? Data yang telah difinalisasi tidak dapat diedit.')) {
      return;
    }
    startTransition(async () => {
      const res = await finalizePayrollPeriod(periodId);
      if (res.error) {
        setFeedback({ type: 'error', text: res.error });
      } else {
        setFeedback({ type: 'success', text: 'Periode payroll berhasil difinalisasi dan dikunci.' });
        loadData();
      }
    });
  };

  const handleUpdateRule = async (id: string, value: string) => {
    startTransition(async () => {
      const res = await updatePayrollRule(id, value);
      if (res.error) {
        setFeedback({ type: 'error', text: res.error });
      } else {
        setFeedback({ type: 'success', text: 'Aturan payroll berhasil diperbarui.' });
        loadData();
      }
    });
  };

  const handleExportBank = (format: 'bca' | 'mandiri') => {
    const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
    const periodLabel = selectedPeriod
      ? `${selectedPeriod.period_start} s/d ${selectedPeriod.period_end}`
      : 'Payroll';

    const transferRecords = currentPeriodDetail.runs.map((r) => ({
      employeeName: r.employee?.full_name || 'Karyawan',
      bankAccountNo: r.employee?.bank_account_no || '0000000000',
      bankName: r.employee?.bank_name || (format === 'bca' ? 'BCA' : 'Mandiri'),
      netPay: r.net_pay || 0,
      email: r.employee?.email || '',
      nik: r.employee?.nik || '',
    }));

    if (format === 'bca') {
      const csv = generateBcaPayrollCsv(transferRecords, periodLabel);
      downloadCsvFile(csv, `BCA_Payroll_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      setFeedback({
        type: 'success',
        text: `File transfer BCA berhasil diunduh (${transferRecords.length} karyawan).`,
      });
    } else {
      const csv = generateMandiriPayrollCsv(transferRecords, periodLabel);
      downloadCsvFile(csv, `Mandiri_MCM_Payroll_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      setFeedback({
        type: 'success',
        text: `File transfer Mandiri MCM berhasil diunduh (${transferRecords.length} karyawan).`,
      });
    }
  };

  const isManagementOrAdmin = ['management', 'admin', 'hr'].includes(userRole);
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || null;
  const totalNetPay = currentPeriodDetail.runs.reduce((acc, r) => acc + (r.net_pay || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        title="Penggajian (Payroll)"
        description="Kalkulasi otomatis gaji pokok, lembur terverifikasi, iuran BPJS Kesehatan & Ketenagakerjaan, serta potongan presensi."
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Kompensasi & Benefit
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-slate-400">Standar BPJS & Depnaker</span>
          </div>
        }
      >
        {isManagementOrAdmin && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isPending}
              className="border-slate-800 text-slate-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isPending ? 'animate-spin text-emerald-400' : ''}`} />
              Segarkan
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreatePeriodOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Buka Periode Baru
            </Button>
          </>
        )}
      </PageHeader>

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
        <PayrollMetrics
          periods={periods}
          selectedPeriod={selectedPeriod}
          runs={currentPeriodDetail.runs}
        />
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        {isManagementOrAdmin && (
          <>
            <button
              onClick={() => setActiveTab('periods')}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'periods'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daftar Periode</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'review'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Rincian & Hitung Payroll</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Aturan & Tarif</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('my-payslip')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'my-payslip'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Slip Gaji Saya</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'periods' && isManagementOrAdmin && (
        <PayrollPeriodsList
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          onSelectPeriod={handleSelectPeriod}
          onGenerateRun={handleGenerateRun}
          onFinalizePeriod={handleFinalizePeriod}
          onCreateNewPeriod={() => setIsCreatePeriodOpen(true)}
          isPending={isPending}
        />
      )}

      {activeTab === 'review' && isManagementOrAdmin && (
        <PayrollRunReview
          selectedPeriod={selectedPeriod}
          runs={currentPeriodDetail.runs}
          onGenerateRun={handleGenerateRun}
          onFinalizePeriod={handleFinalizePeriod}
          onOpenBankExport={() => setIsBankExportOpen(true)}
          onViewPayslip={(slip) => {
            setPayslipModalData(slip);
            setIsPayslipModalOpen(true);
          }}
          isPending={isPending}
        />
      )}

      {activeTab === 'rules' && isManagementOrAdmin && (
        <PayrollRulesEditor
          rules={rules}
          onUpdateRule={handleUpdateRule}
          isPending={isPending}
        />
      )}

      {activeTab === 'my-payslip' && (
        <EmployeePayslipHistory
          payslips={myPayslips}
          onViewPayslip={(slip) => {
            setPayslipModalData(slip);
            setIsPayslipModalOpen(true);
          }}
        />
      )}

      {/* 5. Modals */}
      <CreatePeriodModal
        isOpen={isCreatePeriodOpen}
        onClose={() => setIsCreatePeriodOpen(false)}
        onSubmit={handleCreatePeriod}
        isPending={isPending}
      />

      <BankExportModal
        isOpen={isBankExportOpen}
        onClose={() => setIsBankExportOpen(false)}
        onExport={handleExportBank}
        totalEmployees={currentPeriodDetail.runs.length}
        totalNetPay={totalNetPay}
        periodLabel={
          selectedPeriod
            ? `${selectedPeriod.period_start} s/d ${selectedPeriod.period_end}`
            : 'Payroll'
        }
      />

      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        data={payslipModalData}
      />
    </div>
  );
}
