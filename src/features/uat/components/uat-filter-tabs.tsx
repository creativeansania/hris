'use client';

import React from 'react';
import { RoleTab, Scenario } from '../types';

interface UatFilterTabsProps {
  tabs: RoleTab[];
  activeTab: string;
  totalCount: number;
  scenarios: Scenario[];
  onSelectTab: (tabId: string) => void;
}

export function UatFilterTabs({
  tabs,
  activeTab,
  totalCount,
  scenarios,
  onSelectTab,
}: UatFilterTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count =
          tab.id === 'all'
            ? totalCount
            : scenarios.filter((s) => s.role === tab.id).length;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
