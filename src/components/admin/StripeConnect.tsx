'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { connectStripeAction, disconnectStripeAction } from '@/app/actions/payments';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Pill';

export function StripeConnect({
  available,
  connected,
  chargesEnabled,
  isOwner,
}: {
  available: boolean;
  connected: boolean;
  chargesEnabled: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!available) {
    return (
      <p className="text-sm text-grey-500">
        Card payments are not switched on for this deploy yet. Customers can still pay by bank
        transfer from their pay link.
      </p>
    );
  }

  function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) setError(result.error ?? 'That did not work');
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap items-center gap-3">
        {chargesEnabled ? (
          <Pill tone="success">Taking card payments</Pill>
        ) : connected ? (
          <Pill tone="warning">Stripe needs a few more details</Pill>
        ) : (
          <Pill>Not connected</Pill>
        )}
      </div>
      <p className="text-sm text-grey-500">
        Every invoice gets a pay link. Customers pay by card, Apple Pay or Google Pay, and the
        invoice marks itself paid. The money goes straight to your own Stripe account.
      </p>
      {isOwner ? (
        <div className="flex flex-wrap gap-2">
          {!chargesEnabled ? (
            <Button disabled={pending} onClick={() => run(connectStripeAction)}>
              {connected ? 'Finish setting up Stripe' : 'Connect Stripe'}
            </Button>
          ) : null}
          {connected ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (
                  window.confirm(
                    'Stop taking card payments? Pay links will offer bank transfer only.',
                  )
                ) {
                  run(disconnectStripeAction);
                }
              }}
            >
              Switch off
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-grey-500">Only the owner can connect Stripe.</p>
      )}
    </div>
  );
}
