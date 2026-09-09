import type { ReactNode } from 'react';
import { BottomNavLink } from '@/components/shell/NavLink';
import { SyncBanner } from '@/components/cleaner/SyncBanner';
import { SyncProvider } from '@/components/cleaner/SyncProvider';
import { CalendarIcon, PeopleIcon, TodayIcon } from '@/components/ui/Icons';
import type { Viewer } from '@/lib/auth';

/**
 * The cleaner's shell. Three tabs, nothing nested, everything thumb-sized.
 * A different app to the office one, on the same routes.
 */
export function CleanerShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return (
    <SyncProvider>
      <div className="flex min-h-dvh flex-col bg-grey-50">
        <SyncBanner />

        <header className="bg-white" style={{ paddingTop: 'var(--safe-top)' }}>
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 border-b border-grey-200 px-4 py-3">
            <span className="truncate text-base font-semibold text-grey-900">
              {viewer.company.name}
            </span>
            <span className="truncate text-sm text-grey-500">{viewer.profile.full_name}</span>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">
          {children}
        </main>

        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-grey-200 bg-white shadow-sticky"
          style={{ paddingBottom: 'var(--safe-bottom)' }}
        >
          <div className="mx-auto flex max-w-2xl">
            <BottomNavLink href="/app" icon={<TodayIcon className="h-6 w-6" />}>
              Today
            </BottomNavLink>
            <BottomNavLink href="/app/week" icon={<CalendarIcon className="h-6 w-6" />}>
              Week
            </BottomNavLink>
            <BottomNavLink href="/app/me" icon={<PeopleIcon className="h-6 w-6" />}>
              Me
            </BottomNavLink>
          </div>
        </nav>
      </div>
    </SyncProvider>
  );
}
