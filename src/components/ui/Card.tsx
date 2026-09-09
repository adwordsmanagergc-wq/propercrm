import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Everything sits on a white card with a hairline and a blue-tinted shadow. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-card border border-grey-200 bg-white shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-grey-200 px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold text-grey-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-grey-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

/** The headline numbers on Today and the invoice list. */
export function StatTile({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'blue' | 'success' | 'warning' | 'danger';
  hint?: string;
}) {
  const tones = {
    default: 'text-grey-900',
    blue: 'text-blue-700',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  } as const;

  return (
    <div className="rounded-card border border-grey-200 bg-white p-4 shadow-card">
      <p className="text-sm font-medium text-grey-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-grey-500">{hint}</p> : null}
    </div>
  );
}
