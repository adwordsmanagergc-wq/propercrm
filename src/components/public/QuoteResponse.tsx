'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { respondToQuoteAction } from '@/app/actions/public';
import { Button } from '@/components/ui/Button';
import { Field, Notice, Textarea } from '@/components/ui/Field';

export function QuoteResponse({ token }: { token: string }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToQuoteAction({
        quoteToken: token,
        accept,
        reason: reason || undefined,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {declining ? (
        <div className="space-y-3">
          <Field label="Anything we could do better? (optional)" htmlFor="reason">
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button variant="danger" disabled={pending} onClick={() => respond(false)}>
              No thanks
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setDeclining(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button size="xl" variant="success" disabled={pending} onClick={() => respond(true)}>
            {pending ? 'Booking you in…' : 'Accept and book me in'}
          </Button>
          <button
            type="button"
            className="w-full py-2 text-sm font-semibold text-grey-500 hover:text-blue-700"
            onClick={() => setDeclining(true)}
          >
            Not for me
          </button>
        </>
      )}
    </div>
  );
}
