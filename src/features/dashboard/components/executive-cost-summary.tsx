import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { formatIDR } from '@/lib/formatters';
import { DivisionBreakdown, TopPerformer, ManagementCostSummary } from '@/app/actions/reports';
import { DollarSign, Briefcase, AlertTriangle, PieChart } from 'lucide-react';

interface ExecutiveCostSummaryProps {
  cost: ManagementCostSummary;
  divisions: DivisionBreakdown[];
  topOvertimeEmployees: TopPerformer[];
}

export function ExecutiveCostSummary({
  cost,
  divisions,
  topOvertimeEmployees,
}: ExecutiveCostSummaryProps) {
  return (
    <div className="space-y-6">
      {/* 4 Cost Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Beban Gaji Pokok</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-white">
              {formatIDR(cost.totalBaseSalary)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total upah dasar seluruh staf</p>
          </div>
        </Card>

        <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Estimasi Biaya Lembur</span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-purple-300">
              {formatIDR(cost.totalOvertimeCost)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Kalkulasi 1/173 jam Depnaker</p>
          </div>
        </Card>

        <Card className="p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Estimasi Potongan Telat</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-amber-400">
              {formatIDR(cost.estimatedLateDeductions)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Potongan sanksi keterlambatan</p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-slate-900 to-purple-950/30 border-purple-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-300">
            <span className="text-xs font-medium">Estimasi Total Payroll</span>
            <PieChart className="w-4 h-4 text-purple-300" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatIDR(cost.estimatedTotalPayroll)}
            </div>
            <p className="text-[11px] text-purple-300/80 mt-1">
              Rata-rata {formatIDR(cost.averageCostPerEmployee)} / orang
            </p>
          </div>
        </Card>
      </div>

      {/* Division Cost Allocation & Top Overtime */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Alokasi Beban Gaji & Lembur per Divisi"
            subtitle="Proyeksi pengeluaran kompensasi bulanan per unit kerja"
          />

          {divisions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Belum ada data biaya untuk divisi dalam periode ini.
            </div>
          ) : (
            <div className="space-y-4">
              {divisions.map((div) => {
                const divProportion =
                  cost.totalBaseSalary > 0
                    ? Math.round((div.totalBaseSalary / cost.totalBaseSalary) * 100)
                    : 0;

                return (
                  <div key={div.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-200">{div.name}</span>
                      <span className="text-xs font-mono font-bold text-white">
                        {formatIDR(div.totalBaseSalary)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${divProportion}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{div.employeeCount} karyawan ({divProportion}% dari total)</span>
                      <span className="text-purple-400">Total Lembur: {div.overtimeHours.toFixed(1)} jam</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top 5 Overtime Contributors */}
        <Card>
          <CardHeader
            title="Top 5 Jam Lembur Terbanyak"
            subtitle="Staf dengan jam kerja lembur tertinggi"
          />

          {topOvertimeEmployees.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Tidak ada data lembur pada periode ini.
            </div>
          ) : (
            <div className="space-y-3">
              {topOvertimeEmployees.map((emp, idx) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {emp.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {emp.divisionName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="text-xs font-bold text-purple-300">
                      {emp.value.toFixed(1)} jam
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
