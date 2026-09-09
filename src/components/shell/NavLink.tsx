'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

function useIsActive(href: string) {
  const pathname = usePathname();
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const active = useIsActive(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-btn px-3 py-2.5 text-base font-medium transition-colors',
        active ? 'bg-blue-100 text-blue-700' : 'text-grey-500 hover:bg-blue-50 hover:text-blue-700',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-blue-500' : 'text-grey-500')}>{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function TabLink({ href, children }: { href: string; children: ReactNode }) {
  const active = useIsActive(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'whitespace-nowrap rounded-pill px-3.5 py-2 text-sm font-semibold transition-colors',
        active ? 'bg-blue-500 text-white' : 'bg-white text-grey-500 hover:text-blue-700',
      )}
    >
      {children}
    </Link>
  );
}

/** The cleaner's bottom bar — three items, nothing else, 64px tall. */
export function BottomNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const active = useIsActive(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold transition-colors',
        active ? 'text-blue-700' : 'text-grey-500',
      )}
    >
      <span className={active ? 'text-blue-500' : 'text-grey-500'}>{icon}</span>
      {children}
    </Link>
  );
}
