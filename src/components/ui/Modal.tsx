'use client';

import { useEffect, type ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-fade-in cursor-default bg-blue-900/25"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-slide-up rounded-t-card bg-white p-5 shadow-pop sm:rounded-card"
        style={{ paddingBottom: 'calc(1.25rem + var(--safe-bottom))' }}
      >
        <h2 className="text-lg font-semibold text-grey-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-grey-500">{description}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
