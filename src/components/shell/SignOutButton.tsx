'use client';

import { useEffect, useState } from 'react';
import { signOutAction } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { clearOfflineData } from '@/lib/offline/cache';
import { pendingJobCount } from '@/lib/offline/queue';

export function SignOutButton({ className }: { className?: string }) {
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    void pendingJobCount().then(setWaiting);
  }, []);

  return (
    <form
      action={signOutAction}
      onSubmit={(event) => {
        // Signing out while work is still queued would strand it: the queue
        // needs their session to push. Make them choose, out loud.
        if (
          waiting > 0 &&
          !window.confirm(
            `${waiting} ${waiting === 1 ? 'job is' : 'jobs are'} still waiting to send. ` +
              'They will stay on this phone until you sign back in. Sign out anyway?',
          )
        ) {
          event.preventDefault();
          return;
        }
        void clearOfflineData();
      }}
    >
      <SubmitButton variant="secondary" className={className} pendingLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
