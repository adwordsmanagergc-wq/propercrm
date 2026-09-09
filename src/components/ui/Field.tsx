import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const CONTROL =
  'w-full rounded-btn border border-grey-200 bg-white px-3 py-2.5 text-base text-grey-900 ' +
  'placeholder:text-grey-500/70 transition-colors ' +
  'focus:border-blue-400 focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-blue-700 ' +
  'disabled:bg-grey-50 disabled:text-grey-500 aria-[invalid=true]:border-danger';

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-grey-900">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-grey-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(CONTROL, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(CONTROL, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-btn border border-grey-200 bg-white px-3 py-3',
        'hover:bg-blue-50 has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50',
        className,
      )}
    >
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-blue-500" {...props} />
      <span className="text-base text-grey-900">{label}</span>
    </label>
  );
}

/** A non-blocking message strip. Used for form errors and success notes. */
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error';
  children: ReactNode;
}) {
  const tones = {
    info: 'bg-blue-50 text-blue-900 border-blue-200',
    success: 'bg-white text-success border-success/30',
    error: 'bg-white text-danger border-danger/30',
  } as const;

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-btn border px-3.5 py-3 text-sm font-medium', tones[tone])}
    >
      {children}
    </p>
  );
}
