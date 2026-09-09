import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-grey-200 bg-white p-6 shadow-card sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-grey-500">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? (
        <div className="mt-6 border-t border-grey-200 pt-5 text-sm text-grey-500">{footer}</div>
      ) : null}
    </div>
  );
}
