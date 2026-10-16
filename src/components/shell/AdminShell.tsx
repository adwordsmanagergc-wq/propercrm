import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoMark, Wordmark } from '@/components/Logo';
import { SidebarLink, TabLink } from '@/components/shell/NavLink';
import { SignOutButton } from '@/components/shell/SignOutButton';
import {
  CalendarIcon,
  ChartIcon,
  InvoiceIcon,
  QuoteIcon,
  MapIcon,
  PeopleIcon,
  RepeatIcon,
  SettingsIcon,
  TodayIcon,
} from '@/components/ui/Icons';
import { type Viewer } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/roles';
import { initials } from '@/lib/format';

const NAV = [
  { href: '/app', label: 'Today', icon: <TodayIcon className="h-5 w-5" /> },
  { href: '/app/schedule', label: 'Schedule', icon: <CalendarIcon className="h-5 w-5" /> },
  { href: '/app/map', label: 'Round map', icon: <MapIcon className="h-5 w-5" /> },
  { href: '/app/customers', label: 'Customers', icon: <PeopleIcon className="h-5 w-5" /> },
  { href: '/app/rounds', label: 'Rounds', icon: <RepeatIcon className="h-5 w-5" /> },
  { href: '/app/quotes', label: 'Quotes', icon: <QuoteIcon className="h-5 w-5" /> },
  { href: '/app/invoices', label: 'Invoices', icon: <InvoiceIcon className="h-5 w-5" /> },
  { href: '/app/reports', label: 'Reports', icon: <ChartIcon className="h-5 w-5" /> },
  { href: '/app/staff', label: 'Staff', icon: <PeopleIcon className="h-5 w-5" /> },
  { href: '/app/settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" /> },
];

export function AdminShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-grey-50">
      {/* ---------------------------------------------- desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-grey-200 bg-white lg:flex">
        <div className="px-5 py-5">
          <Link href="/app" aria-label="Proper CRM">
            <Wordmark />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Main">
          {NAV.map((item) => (
            <SidebarLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </SidebarLink>
          ))}
        </nav>

        <div className="border-t border-grey-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-blue-100 text-sm font-semibold text-blue-700">
              {initials(viewer.profile.full_name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {viewer.profile.full_name}
              </span>
              <span className="block truncate text-xs text-grey-500">
                {ROLE_LABELS[viewer.profile.role]} · {viewer.company.name}
              </span>
            </span>
          </div>
          <SignOutButton className="w-full" />
        </div>
      </aside>

      {/* ------------------------------------------------- mobile chrome */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-30 border-b border-grey-200 bg-white">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/app" className="flex items-center gap-2.5" aria-label="Proper CRM">
              <LogoMark className="h-7 w-7" />
              <span className="truncate font-semibold">{viewer.company.name}</span>
            </Link>
            <SignOutButton />
          </div>
          <nav
            aria-label="Main"
            className="flex gap-2 overflow-x-auto border-t border-grey-200 px-4 py-2.5"
          >
            {NAV.map((item) => (
              <TabLink key={item.href} href={item.href}>
                {item.label}
              </TabLink>
            ))}
          </nav>
        </header>
      </div>

      <main id="main" className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">{children}</div>
      </main>
    </div>
  );
}
