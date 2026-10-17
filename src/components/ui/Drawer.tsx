'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Slide-over panel used for job detail. Traps focus, closes on Escape and on a
 * click outside, and restores focus to whatever opened it.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('button, a[href], input')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-fade-in cursor-default bg-blue-900/25"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Details'}
        className={cn(
          'relative flex h-full w-full animate-slide-up flex-col bg-white shadow-pop sm:animate-fade-in',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-grey-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-grey-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-grey-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 rounded-btn px-3 py-2 text-sm font-semibold text-grey-500 hover:bg-blue-50 hover:text-blue-700"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-grey-200 bg-grey-50 px-5 py-4">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
