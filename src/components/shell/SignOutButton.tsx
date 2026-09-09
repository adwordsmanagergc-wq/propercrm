'use client';

import { signOutAction } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="secondary" className={className} pendingLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
