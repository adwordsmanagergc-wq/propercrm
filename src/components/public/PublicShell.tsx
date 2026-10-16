/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoMark } from '@/components/Logo';

export interface PublicCompany {
  name: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

/**
 * The frame around everything a customer sees: the window cleaner's own name
 * and logo up top, a quiet "Powered by" at the bottom.
 */
export function PublicShell({
  company,
  children,
}: {
  company: PublicCompany;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-grey-50">
      <header className="border-b border-grey-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt=""
                className="h-10 w-auto max-w-[8rem] object-contain"
              />
            ) : null}
            <span className="truncate text-lg font-semibold">{company.name}</span>
          </div>
          {company.phone ? (
            <a
              href={`tel:${company.phone.replace(/\s/g, '')}`}
              className="shrink-0 rounded-btn border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700"
            >
              Call us
            </a>
          ) : null}
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
        {children}
      </main>
      <footer className="px-4 pb-8 pt-2 text-center text-xs text-grey-500">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-blue-700">
          <LogoMark className="h-4 w-4" /> Powered by Proper CRM
        </Link>
      </footer>
    </div>
  );
}

export function NotAvailable({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-grey-50 px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-grey-500">{body}</p>
      </div>
    </div>
  );
}
