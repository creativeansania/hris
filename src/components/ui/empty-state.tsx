import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 sm:p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center flex flex-col items-center justify-center relative overflow-hidden ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-4 shadow-inner relative">
        <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-sm pointer-events-none" />
        <Icon className="w-8 h-8 relative z-10" />
      </div>

      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && (
        <div className="mt-5">
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              {actionLabel}
            </a>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
