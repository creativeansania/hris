import React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  iconColor?: string;
  subtext?: string;
  footer?: React.ReactNode;
  variant?: 'default' | 'amber' | 'emerald' | 'rose' | 'purple' | 'blue';
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  iconColor = 'text-blue-400',
  subtext,
  footer,
  variant = 'default',
  className = '',
}: StatCardProps) {
  const valueColors: Record<string, string> = {
    default: 'text-white',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    purple: 'text-purple-300',
    blue: 'text-blue-400',
  };

  return (
    <Card className={`p-4 bg-[#0d1322] border-slate-800/80 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-medium tracking-wide">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
      </div>

      <div className="my-3">
        <div className={`text-2xl font-bold font-mono tracking-tight ${valueColors[variant] || 'text-white'}`}>
          {value}
          {unit && <span className="text-xs font-normal text-slate-400 ml-1 font-sans">{unit}</span>}
        </div>
        {subtext && <p className="text-[11px] text-slate-400 mt-1">{subtext}</p>}
      </div>

      {footer && (
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
          {footer}
        </div>
      )}
    </Card>
  );
}
