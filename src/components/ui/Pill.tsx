import { cn } from '@/lib/cn';
import type { InvoiceStatus, JobStatus, SkipReason } from '@/lib/types/database';

export type PillTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger';

const TONES: Record<PillTone, string> = {
  neutral: 'bg-grey-50 text-grey-500 border-grey-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  success: 'bg-white text-success border-success/30',
  warning: 'bg-white text-warning border-warning/40',
  danger: 'bg-white text-danger border-danger/30',
};

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-pill border px-2.5 py-1 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'To do',
  in_progress: 'On site',
  completed: 'Done',
  skipped: 'Missed',
  cancelled: 'Cancelled',
};

const JOB_STATUS_TONES: Record<JobStatus, PillTone> = {
  scheduled: 'neutral',
  in_progress: 'blue',
  completed: 'success',
  skipped: 'danger',
  cancelled: 'neutral',
};

export function JobStatusPill({ status }: { status: JobStatus }) {
  return <Pill tone={JOB_STATUS_TONES[status]}>{JOB_STATUS_LABELS[status]}</Pill>;
}

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};

const INVOICE_STATUS_TONES: Record<InvoiceStatus, PillTone> = {
  draft: 'neutral',
  sent: 'blue',
  paid: 'success',
  overdue: 'danger',
  void: 'neutral',
};

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  return <Pill tone={INVOICE_STATUS_TONES[status]}>{INVOICE_STATUS_LABELS[status]}</Pill>;
}

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  no_access: 'No access',
  dog_on_site: 'Dog in the garden',
  customer_cancelled: 'Customer cancelled',
  weather: 'Weather',
  other: 'Something else',
};
