import { LucideIcon } from 'lucide-react';

export type UatRole = 'staff' | 'spv' | 'kepala_divisi' | 'hr' | 'management' | 'admin';

export type UatStatus = 'passed' | 'failed' | 'pending';

export interface Scenario {
  id: string;
  role: UatRole;
  title: string;
  steps: string;
  expected: string;
  targetUrl: string;
  actionLabel: string;
}

export interface RoleTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface SystemHealthState {
  status: string;
  dbLatency: number;
  odooStatus: string;
  loading: boolean;
}
