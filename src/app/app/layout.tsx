import type { Metadata } from 'next';
import { AdminShell } from '@/components/shell/AdminShell';
import { CleanerShell } from '@/components/shell/CleanerShell';
import { requireViewer } from '@/lib/auth';

export const metadata: Metadata = { title: { default: 'Today', template: '%s · Proper CRM' } };

/**
 * One set of routes, two shells. A cleaner signing in gets a stripped-down
 * three-tab app; the office gets the full sidebar.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();

  if (viewer.isCleaner) {
    return <CleanerShell viewer={viewer}>{children}</CleanerShell>;
  }
  return <AdminShell viewer={viewer}>{children}</AdminShell>;
}
