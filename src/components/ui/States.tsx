import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** No list in Proper CRM is ever allowed to render as a blank white screen. */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-blue-50 text-blue-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-grey-900">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-grey-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-grey-200" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-10 w-10 rounded-pill" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-6 w-16 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: tiles }).map((_, index) => (
        <div key={index} className="rounded-card border border-grey-200 bg-white p-4 shadow-card">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-7 w-12" />
        </div>
      ))}
    </div>
  );
}
