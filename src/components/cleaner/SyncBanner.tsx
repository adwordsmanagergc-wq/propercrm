'use client';

import { useSync } from '@/components/cleaner/SyncProvider';
import { CloudOffIcon } from '@/components/ui/Icons';

/**
 * Always-on reassurance. A cleaner must never wonder whether the office got
 * their work, and must never be told everything is fine when it is not.
 */
export function SyncBanner() {
  const { waiting, online, syncing, sync } = useSync();

  if (waiting === 0 && online) return null;

  const label =
    waiting > 0
      ? `${waiting} ${waiting === 1 ? 'job' : 'jobs'} waiting to send`
      : 'No signal — your work is saved on this phone';

  return (
    <div className="sticky top-0 z-30 border-b border-warning/40 bg-white">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
        <CloudOffIcon className="h-5 w-5 shrink-0 text-warning" />
        <p className="flex-1 text-sm font-semibold text-grey-900">{label}</p>
        {waiting > 0 && online ? (
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="rounded-pill border border-blue-200 px-3 py-1 text-sm font-semibold text-blue-700 disabled:opacity-50"
          >
            {syncing ? 'Sending…' : 'Send now'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
