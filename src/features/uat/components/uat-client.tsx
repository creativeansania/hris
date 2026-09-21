'use client';

import React, { useState, useEffect } from 'react';
import { UAT_SCENARIOS, ROLE_TABS } from '../uat-scenarios-data';
import { UatStatus, SystemHealthState } from '../types';
import { UatHeader } from './uat-header';
import { UatFilterTabs } from './uat-filter-tabs';
import { UatScenarioCard } from './uat-scenario-card';

export function UatClient() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [scenarioStatus, setScenarioStatus] = useState<Record<string, UatStatus>>({});
  const [testerNotes, setTesterNotes] = useState<Record<string, string>>({});
  const [systemHealth, setSystemHealth] = useState<SystemHealthState>({
    status: 'checking',
    dbLatency: 0,
    odooStatus: 'checking',
    loading: true,
  });

  // Load persisted UAT status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hris_uat_progress_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setScenarioStatus(parsed.status || {});
        setTesterNotes(parsed.notes || {});
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Save to localStorage on change
  const updateStatus = (id: string, status: UatStatus) => {
    const updated = { ...scenarioStatus, [id]: status };
    setScenarioStatus(updated);
    localStorage.setItem(
      'hris_uat_progress_v1',
      JSON.stringify({ status: updated, notes: testerNotes })
    );
  };

  const updateNote = (id: string, note: string) => {
    const updated = { ...testerNotes, [id]: note };
    setTesterNotes(updated);
    localStorage.setItem(
      'hris_uat_progress_v1',
      JSON.stringify({ status: scenarioStatus, notes: updated })
    );
  };

  const resetAll = () => {
    if (confirm('Reset seluruh status checklist UAT ke awal?')) {
      setScenarioStatus({});
      setTesterNotes({});
      localStorage.removeItem('hris_uat_progress_v1');
    }
  };

  // Mark all as passed shortcut
  const markAllPassed = () => {
    const allPassed: Record<string, UatStatus> = {};
    UAT_SCENARIOS.forEach((s) => {
      allPassed[s.id] = 'passed';
    });
    setScenarioStatus(allPassed);
    localStorage.setItem(
      'hris_uat_progress_v1',
      JSON.stringify({ status: allPassed, notes: testerNotes })
    );
  };

  // Fetch live system health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setSystemHealth({
            status: data.status,
            dbLatency: data.checks?.database?.latencyMs || 0,
            odooStatus: data.checks?.odoo?.status || 'disabled',
            loading: false,
          });
        } else {
          setSystemHealth({
            status: 'degraded',
            dbLatency: 0,
            odooStatus: 'error',
            loading: false,
          });
        }
      } catch {
        setSystemHealth({
          status: 'unreachable',
          dbLatency: 0,
          odooStatus: 'unreachable',
          loading: false,
        });
      }
    }
    checkHealth();
  }, []);

  const filteredScenarios =
    activeTab === 'all'
      ? UAT_SCENARIOS
      : UAT_SCENARIOS.filter((s) => s.role === activeTab);

  const totalCount = UAT_SCENARIOS.length;
  const passedCount = Object.values(scenarioStatus).filter((s) => s === 'passed').length;
  const failedCount = Object.values(scenarioStatus).filter((s) => s === 'failed').length;
  const pendingCount = totalCount - passedCount - failedCount;
  const progressPercent = Math.round((passedCount / totalCount) * 100);

  const exportReport = () => {
    const reportData = {
      title: 'UAT Sign-Off Certificate — HRIS PWA Production',
      generatedAt: new Date().toISOString(),
      summary: {
        totalScenarios: totalCount,
        passed: passedCount,
        failed: failedCount,
        pending: pendingCount,
        completionPercentage: `${progressPercent}%`,
      },
      scenarios: UAT_SCENARIOS.map((s) => ({
        id: s.id,
        role: s.role,
        title: s.title,
        status: scenarioStatus[s.id] || 'pending',
        notes: testerNotes[s.id] || '-',
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uat_sign_off_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16">
      <UatHeader
        totalCount={totalCount}
        passedCount={passedCount}
        progressPercent={progressPercent}
        systemHealth={systemHealth}
        onExport={exportReport}
        onMarkAllPassed={markAllPassed}
        onResetAll={resetAll}
      />

      <UatFilterTabs
        tabs={ROLE_TABS}
        activeTab={activeTab}
        totalCount={totalCount}
        scenarios={UAT_SCENARIOS}
        onSelectTab={setActiveTab}
      />

      <div className="grid grid-cols-1 gap-4">
        {filteredScenarios.map((scenario) => (
          <UatScenarioCard
            key={scenario.id}
            scenario={scenario}
            status={scenarioStatus[scenario.id] || 'pending'}
            note={testerNotes[scenario.id] || ''}
            onUpdateStatus={updateStatus}
            onUpdateNote={updateNote}
          />
        ))}
      </div>
    </div>
  );
}
