'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  CheckSquare,
  Fingerprint,
  Users,
  Receipt,
  Sliders,
  X,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { EmployeeRole } from '@/types/database';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  MapPin,
  Clock,
  CalendarDays,
  CheckSquare,
  Fingerprint,
  Users,
  Receipt,
  Sliders,
};

interface SidebarProps {
  userRole?: EmployeeRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  userRole = 'admin',
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  // Filter menu items by user's role
  const accessibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#090d16] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-inner">
              <Image
                src="/icons/logo.png"
                alt="HRIS Logo"
                width={36}
                height={36}
                className="object-cover"
              />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                HRIS
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  v3.0
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-normal leading-none mt-0.5">
                Enterprise SDM
              </p>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Menu Utama
          </div>

          {accessibleItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.title}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom System Status */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-500">ENGINE</span>
              <span className="text-emerald-400 font-medium">PostgreSQL 15</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-500">SECURITY</span>
              <span className="text-blue-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Row Level Security
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
