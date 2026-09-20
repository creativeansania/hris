import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode; // Right side actions
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-6 ${className}`}
    >
      <div>
        {badge && <div className="mb-2">{badge}</div>}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{description}</p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
